from .auth import auth_router
from .metadata import router as metadata_router
from .federation import router as federation_router
from .dashboard import router as dashboard_router
from .catalogs import router as catalogs_router

__all__ = ["auth_router", "metadata_router", "federation_router", "catalogs_router","dashboard_router"]