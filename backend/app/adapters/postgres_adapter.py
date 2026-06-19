from sqlalchemy.orm import Session
from ..models import PostgresMetadata
from typing import List, Dict


class PostgresAdapter:
    """Simulated Postgres catalog – operates on the postgres_metadata table."""

    def search(self, db: Session, query: str) -> List[Dict]:
        rows = (
            db.query(PostgresMetadata)
            .filter(PostgresMetadata.table_name.ilike(f"%{query}%"))
            .all()
        )
        return [{"catalog": "postgres", "object_name": r.table_name} for r in rows]

    def get_metadata(self, db: Session, object_name: str) -> Dict | None:
        row = (
            db.query(PostgresMetadata)
            .filter(PostgresMetadata.table_name == object_name)
            .first()
        )
        if not row:
            return None
        return {
            "catalog": "postgres",
            "object_name": row.table_name,
            "owner": row.owner,
            "schema": row.schema,
        }

    def list_objects(self, db: Session) -> List[Dict]:
        rows = db.query(PostgresMetadata).all()
        return [{"catalog": "postgres", "object_name": r.table_name} for r in rows]
