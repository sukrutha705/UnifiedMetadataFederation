from sqlalchemy.orm import Session
from ..models import OpenSearchMetadata
from typing import List, Dict


class OpenSearchAdapter:
    """Simulated OpenSearch catalog – operates on the opensearch_metadata table."""

    def search(self, db: Session, query: str) -> List[Dict]:
        rows = (
            db.query(OpenSearchMetadata)
            .filter(OpenSearchMetadata.index_name.ilike(f"%{query}%"))
            .all()
        )
        return [{"catalog": "opensearch", "object_name": r.index_name} for r in rows]

    def get_metadata(self, db: Session, object_name: str) -> Dict | None:
        row = (
            db.query(OpenSearchMetadata)
            .filter(OpenSearchMetadata.index_name == object_name)
            .first()
        )
        if not row:
            return None
        return {
            "catalog": "opensearch",
            "object_name": row.index_name,
            "shards": row.shards,
            "replicas": row.replicas,
        }

    def list_objects(self, db: Session) -> List[Dict]:
        rows = db.query(OpenSearchMetadata).all()
        return [{"catalog": "opensearch", "object_name": r.index_name} for r in rows]
