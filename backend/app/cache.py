import json
from typing import Dict, List
import redis
from sqlalchemy.orm import Session
from .models import Metadata
from pydantic import BaseModel
from fastapi.encoders import jsonable_encoder



def _key(catalog_name: str, metadata_id: int) -> str:
    return f"catalog:{catalog_name}:metadata:{metadata_id}"


def cache_lookup(redis_client: redis.Redis, catalog_name: str, metadata_id: int):
    key = _key(catalog_name, metadata_id)
    raw = redis_client.get(key)
    if raw:
        redis_client.incr("cache:hit")
        return json.loads(raw)
    else:
        redis_client.incr("cache:miss")
        return None


def cache_store(redis_client: redis.Redis, catalog_name: str, metadata_id: int, payload: Dict):
    key = _key(catalog_name, metadata_id)
    redis_client.set(key, json.dumps(payload))


def invalidate_cache(redis_client: redis.Redis, catalog_name: str, metadata_id: int):
    key = _key(catalog_name, metadata_id)
    redis_client.delete(key)


def rebuild_cache(redis_client: redis.Redis, db: Session, catalog_name: str):
    rows: List[Metadata] = (
        db.query(Metadata).filter(Metadata.catalog_name == catalog_name).all()
    )
    for row in rows:
        payload = {
            "id": row.id,
            "catalog_name": row.catalog_name,
            "object_name": row.object_name,
            "object_type": row.object_type,
            "description": row.description,
            "owner_name": row.owner_name,
            "created_at": str(row.created_at),
            "updated_at": str(row.updated_at),
        }
        cache_store(redis_client, catalog_name, row.id, payload)

# ---------- Federation search cache ----------

def federation_cache_key(query: str) -> str:
    return f"search:{query.lower()}"


def get_federation_cache(redis_client: redis.Redis, query: str):
    raw = redis_client.get(federation_cache_key(query))
    if raw:
        return json.loads(raw)
    return None


def set_federation_cache(redis_client, query, data):
    redis_client.set(
        federation_cache_key(query),
        json.dumps(jsonable_encoder(data)),
        ex=300
    )
