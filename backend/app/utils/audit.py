from sqlalchemy.orm import Session
from ..models_audit import AuditLog


def write_audit(
    db: Session,
    username: str,
    role: str,
    action: str,
    catalog_name: str | None = None,
    metadata_id: int | None = None,
) -> None:
    """
    Persist an audit record.
    """
    audit = AuditLog(
        username=username,
        role=role,
        action=action,
        catalog_name=catalog_name,
        metadata_id=metadata_id,
    )
    db.add(audit)
    db.commit()
