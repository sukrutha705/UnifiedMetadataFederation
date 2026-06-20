# backend/app/services/smart_metadata_client.py

from sqlalchemy.orm import Session
from ..registry import registry
from ..cache import get_federation_cache, set_federation_cache
from ..utils.audit import write_audit
from ..schemas import FederationSearchResponse, FederationResult, CatalogSuggestion, ConsistencyResponse
from .catalog_discovery_service import suggest_catalogs
from .natural_language_search_service import natural_search as svc_natural_search
from .consistency_service import check_consistency as svc_check_consistency


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
