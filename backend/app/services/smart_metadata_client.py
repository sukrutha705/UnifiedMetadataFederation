from sqlalchemy.orm import Session
import redis
from typing import List, Optional

# Import schemas
from ..schemas import (
    FederationSearchResponse,
    FederationResult,
    CatalogSuggestion,
    ConsistencyResponse,
    ReconciliationResponse,
    MetadataCreate,
    MetadataUpdate,
    MetadataResponse
)

# Import existing services and utilities
from ..services.catalog_discovery_service import suggest_catalogs
from ..services.natural_language_search_service import natural_search as svc_natural_search
from ..services.consistency_service import check_consistency, reconcile_object
from ..services.metadata_service import (
    create_metadata as svc_create_metadata,
    update_metadata as svc_update_metadata,
    delete_metadata as svc_delete_metadata
)
from ..registry import registry
from ..cache import get_federation_cache, set_federation_cache
from ..utils.audit import write_audit

class SmartMetadataClient:
    """
    A pure delegation layer wrapping the 5 core metadata operations.
    No new business logic is added here.
    """
    def __init__(self, db: Session, redis_cli: redis.Redis):
        self.db = db
        self.redis_cli = redis_cli

    def search_metadata(self, q: str, user: dict) -> FederationSearchResponse:
        # Extracted from router/federation.py
        cached = get_federation_cache(self.redis_cli, q)
        if cached:
            write_audit(
                self.db, username=user["username"], role=user["role"], action="CACHE_HIT"
            )
            return FederationSearchResponse(**cached)

        results = []
        for catalog_name in registry.list_catalogs():
            adapter = registry.get_catalog(catalog_name)
            try:
                catalog_results = adapter.search(self.db, q)
                for item in catalog_results:
                    results.append(
                        FederationResult(
                            catalog=item["catalog"], object_name=item["object_name"]
                        )
                    )
            except Exception as e:
                print(f"Catalog search failed for {catalog_name}: {e}")

        response = FederationSearchResponse(query=q, results=results)
        set_federation_cache(self.redis_cli, q, response.model_dump())
        write_audit(
            self.db, username=user["username"], role=user["role"], action="CACHE_MISS"
        )
        return response

    def discover_catalogs(self, query: str) -> List[CatalogSuggestion]:
        return suggest_catalogs(query, self.db)

    def natural_search(self, query: str) -> List[CatalogSuggestion]:
        return svc_natural_search(query, self.db)

    def check_consistency(self, object_name: str) -> ConsistencyResponse:
        return check_consistency(self.db, object_name)

    def reconcile(self, object_name: str, user: dict) -> ReconciliationResponse:
        return reconcile_object(object_name, self.db, self.redis_cli, user)

    def create_metadata(self, payload: MetadataCreate, user: dict) -> MetadataResponse:
        res = svc_create_metadata(payload, self.db, self.redis_cli, user)
        write_audit(
            self.db, username=user["username"], role=user["role"], 
            action="CLIENT_CREATE", catalog_name=res.catalog_name, metadata_id=res.id
        )
        return res

    def update_metadata(self, metadata_id: int, payload: MetadataUpdate, user: dict) -> MetadataResponse:
        res = svc_update_metadata(metadata_id, payload, self.db, self.redis_cli, user)
        write_audit(
            self.db, username=user["username"], role=user["role"], 
            action="CLIENT_UPDATE", catalog_name=res.catalog_name, metadata_id=res.id
        )
        return res

    def delete_metadata(self, metadata_id: int, user: dict) -> dict:
        res = svc_delete_metadata(metadata_id, self.db, self.redis_cli, user)
        write_audit(
            self.db, username=user["username"], role=user["role"], 
            action="CLIENT_DELETE", catalog_name=None, metadata_id=metadata_id
        )
        return res
