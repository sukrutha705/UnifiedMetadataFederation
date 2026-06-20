from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from .dependencies import engine, get_db, get_redis
from .registry import registry
import redis

from .router import (
    auth_router,
    metadata_router,
    federation_router,
    dashboard_router,
    catalogs_router,
    natural_search_router,
    unified_client_router,
)
from .models import Base
from .models import SparkMetadata, PostgresMetadata, OpenSearchMetadata, Metadata
from sqlalchemy.orm import Session


app = FastAPI(title="Unified Metadata Federation Platform", version="0.1.0")

# CORS – open for MVP
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/health/detailed")
def health_check_detailed(
    db: Session = Depends(get_db),
    redis_cli: redis.Redis = Depends(get_redis)
):
    try:
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    try:
        redis_cli.ping()
        redis_status = "healthy"
    except Exception as e:
        redis_status = f"unhealthy: {str(e)}"

    connected_catalogs = len(registry.list_catalogs())

    return {
        "api": "healthy",
        "database": db_status,
        "redis": redis_status,
        "catalogs_connected": connected_catalogs,
        "smart_client": "enabled",
        "federation_layer": "enabled"
    }

# Include routers
# Include routers
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(metadata_router, prefix="/metadata", tags=["metadata"])
app.include_router(federation_router, prefix="/federation", tags=["federation"])
app.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"])
app.include_router(catalogs_router, prefix="/catalogs", tags=["catalogs"])
app.include_router(natural_search_router,prefix="/search",tags=["search"])
app.include_router(
    unified_client_router,
    prefix="/client",
    tags=["smart-client"]
)
# ---------- Startup ----------
@app.on_event("startup")
def startup():
    # Create DB tables if they don't exist
    Base.metadata.create_all(bind=engine)

    # Seed demo data if tables are empty
    db: Session = Session(bind=engine)
    try:
        # Spark seed
        if db.query(SparkMetadata).count() == 0:
            for rec in [
                {"table_name": "customer", "schema_name": "public", "columns": "[]"},
                {"table_name": "employee", "schema_name": "public", "columns": "[]"},
                {"table_name": "sales", "schema_name": "public", "columns": "[]"},
            ]:
                db.add(SparkMetadata(**rec))

        # Postgres seed
        if db.query(PostgresMetadata).count() == 0:
            for rec in [
                {"table_name": "orders", "owner": "finance", "schema": "public"},
                {"table_name": "payments", "owner": "finance", "schema": "public"},
                {"table_name": "transactions", "owner": "finance", "schema": "public"},
            ]:
                db.add(PostgresMetadata(**rec))

        # OpenSearch seed
        if db.query(OpenSearchMetadata).count() == 0:
            for rec in [
                {"index_name": "logs", "shards": 1, "replicas": 1},
                {"index_name": "metrics", "shards": 1, "replicas": 1},
                {"index_name": "events", "shards": 1, "replicas": 1},
            ]:
                db.add(OpenSearchMetadata(**rec))

        # Core metadata seed
        if db.query(Metadata).count() == 0:
            for rec in [
                {
                    "catalog_name": "spark",
                    "object_name": "customer",
                    "object_type": "table",
                    "description": "Customer table (spark)",
                    "owner_name": "admin",
                },
                {
                    "catalog_name": "postgres",
                    "object_name": "orders",
                    "object_type": "table",
                    "description": "Orders table (postgres)",
                    "owner_name": "engineer",
                },
                {
                    "catalog_name": "opensearch",
                    "object_name": "logs",
                    "object_type": "index",
                    "description": "Logs index (opensearch)",
                    "owner_name": "viewer",
                },
            ]:
                db.add(Metadata(**rec))

        db.commit()
    finally:
        db.close()
