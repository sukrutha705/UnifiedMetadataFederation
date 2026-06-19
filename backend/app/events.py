from sqlalchemy.orm import Session
from .models import MetadataEvent
from datetime import datetime

def log_event(db: Session, metadata_id: int, event_type: str):
    """Record a timeline event.
    event_type examples: CREATED, UPDATED, DELETED, SEARCHED, REFRESHED, LOGIN
    """
    ev = MetadataEvent(
        metadata_id=metadata_id,
        event_type=event_type,
        timestamp=datetime.utcnow(),
    )
    db.add(ev)
    db.commit()
