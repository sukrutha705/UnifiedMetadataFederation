# backend/app/services/smart_metadata_client.py

from sqlalchemy.orm import Session
import redis
from ..models import Metadata
from ..registry import registry
from ..cache import get_federation_cache, set_federation_cache
from ..utils.audit import write_audit
from ..schemas import (
    FederationSearchResponse,
    FederationResult,
    CatalogSuggestion,
    ConsistencyResponse,
    ReconciliationResponse,
    MetadataCreate,
    MetadataUpdate,
    MetadataResponse,
)
from .catalog_discovery_service import suggest_catalogs
from .natural_language_search_service import natural_search as svc_natural_search
from .consistency_service import (
    check_consistency as svc_check_consistency,
    reconcile_object as svc_reconcile_object,
)
from .metadata_service import (
    create_metadata as svc_create_metadata,
    update_metadata as svc_update_metadata,
    delete_metadata as svc_delete_metadata,
)


class SmartMetadataClient:
    """Smart Metadata Client (Abstraction Layer)
    
    Provides a unified entry point that orchestrates existing federation services,
    catalog discovery, natural search, and consistency checking.
    """

    @staticmethod
    def search_metadata(query: str, db: Session, redis_cli=None, user=None) -> FederationSearchResponse:
        """Search metadata across all federated catalogs, reusing existing search, cache, and audit logic."""
        if redis_cli and user:
            cached = get_federation_cache(redis_cli, query)
            if cached:
                write_audit(
                    db, username=user["username"], role=user["role"], action="CACHE_HIT"
                )
                return FederationSearchResponse(**cached)

        results = []
        for catalog_name in registry.list_catalogs():
            adapter = registry.get_catalog(catalog_name)
            try:
                catalog_results = adapter.search(db, query)
                for item in catalog_results:
                    results.append(
                        FederationResult(
                            catalog=item["catalog"], object_name=item["object_name"]
                        )
                    )
            except Exception as e:
                print(f"Catalog search failed for {catalog_name}: {e}")

        response = FederationSearchResponse(query=query, results=results)
        
        if redis_cli and user:
            set_federation_cache(redis_cli, query, response.model_dump())
            write_audit(
                db, username=user["username"], role=user["role"], action="CACHE_MISS"
            )
        return response

    @staticmethod
    def discover_catalogs(query: str, db: Session) -> list[CatalogSuggestion]:
        """Discovery matching catalogs for the given query using the catalog discovery service."""
        return suggest_catalogs(query, db)

    @staticmethod
    def natural_search(query: str, db: Session) -> list[CatalogSuggestion]:
        """Convert natural language query into keywords and search using the natural language search service."""
        return svc_natural_search(query, db)

    @staticmethod
    def check_consistency(object_name: str, db: Session) -> ConsistencyResponse:
        """Check metadata consistency for the given object across catalogs using the consistency service."""
        return svc_check_consistency(db, object_name)

    @staticmethod
    def reconcile_object(object_name: str, db: Session, redis_cli=None, user=None) -> ReconciliationResponse:
        """Reconcile metadata for the given object using the consistency service."""
        return svc_reconcile_object(object_name, db, redis_cli, user)

    @staticmethod
    def create_metadata(
        payload: MetadataCreate,
        db: Session,
        redis_cli: redis.Redis,
        user: dict,
    ) -> MetadataResponse:
        """Create a new federated metadata entry and synchronize catalog tables."""
        return svc_create_metadata(payload, db, redis_cli, user)

    @staticmethod
    def list_metadata(db: Session) -> list[Metadata]:
        """Retrieve all unified metadata records."""
        return db.query(Metadata).all()

    @staticmethod
    def get_metadata(metadata_id: int, db: Session) -> Metadata:
        """Retrieve a specific metadata record by ID."""
        meta = db.query(Metadata).filter(Metadata.id == metadata_id).first()
        if not meta:
            raise ValueError("Metadata not found")
        return meta

    @staticmethod
    def update_metadata(
        metadata_id: int,
        payload: MetadataUpdate,
        db: Session,
        redis_cli: redis.Redis,
        user: dict,
    ) -> MetadataResponse:
        """Modify an existing metadata record and sync changes."""
        return svc_update_metadata(metadata_id, payload, db, redis_cli, user)

    @staticmethod
    def delete_metadata(
        metadata_id: int,
        db: Session,
        redis_cli: redis.Redis,
        user: dict,
    ) -> dict:
        """Delete a metadata record and cleanup catalog tables and cache."""
        return svc_delete_metadata(metadata_id, db, redis_cli, user)
