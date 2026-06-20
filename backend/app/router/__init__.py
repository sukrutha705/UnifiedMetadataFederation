from .auth import auth_router
from .metadata import router as metadata_router
from .federation import router as federation_router
from .dashboard import router as dashboard_router
from .catalogs import router as catalogs_router
from .natural_search import router as natural_search_router
from .unified_client import unified_client_router

__all__ = [
    "auth_router",
    "metadata_router",
    "federation_router",
    "catalogs_router",
    "dashboard_router",
    "natural_search_router",
    "unified_client_router",
]