from sqlalchemy.orm import Session
from ..models import SparkMetadata
from typing import List, Dict


class SparkAdapter:
    """Simulated Spark catalog – operates on the spark_metadata table."""

    def search(self, db: Session, query: str) -> List[Dict]:
        rows = (
            db.query(SparkMetadata)
            .filter(SparkMetadata.table_name.ilike(f"%{query}%"))
            .all()
        )
        return [{"catalog": "spark", "object_name": r.table_name} for r in rows]

    def get_metadata(self, db: Session, object_name: str) -> Dict | None:
        row = (
            db.query(SparkMetadata)
            .filter(SparkMetadata.table_name == object_name)
            .first()
        )
        if not row:
            return None
        return {
            "catalog": "spark",
            "object_name": row.table_name,
            "schema_name": row.schema_name,
            "columns": row.columns,
        }

    def list_objects(self, db: Session) -> List[Dict]:
        rows = db.query(SparkMetadata).all()
        return [{"catalog": "spark", "object_name": r.table_name} for r in rows]
