# backend/app/schemas.py
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# ---------- Auth ----------
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

# ---------- Metadata ----------
class MetadataBase(BaseModel):
    catalog_name: str = Field(..., example="spark")
    object_name: str = Field(..., example="customer")
    object_type: str = Field(..., example="public")
    description: Optional[str] = Field(None, example="Customer table")
    owner_name: Optional[str] = Field(None, example="data-eng")

class MetadataCreate(MetadataBase):
    pass

class MetadataUpdate(BaseModel):
    description: Optional[str] = Field(None, example="Updated description")
    owner_name: Optional[str] = Field(None, example="new-owner")
    object_type: Optional[str] = Field(None, example="private")

class MetadataResponse(MetadataBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# ---------- Federation ----------
class FederationResult(BaseModel):
    catalog: str
    object_name: str

class FederationSearchResponse(BaseModel):
    query: str
    results: List[FederationResult]

# ---------- Consistency ----------
class MetadataConflict(BaseModel):
    field: str
    values: Dict[str, Any]   # catalog -> value

class ConsistencyResponse(BaseModel):
    object_name: str
    consistent: bool
    conflicts: List[MetadataConflict] = []

class ReconciliationResponse(BaseModel):
    object_name: str
    source_of_truth: str
    updated_catalogs: List[str]
    status: str = "success"

class ConsistencyMetricsResponse(BaseModel):
    total_objects: int
    consistent_objects: int
    inconsistent_objects: int
    consistency_score: float

# ---------- Catalog Discovery ----------
class CatalogSuggestion(BaseModel):
    catalog: str
    object_name: str
    score: int
    reason: List[str]

# ---------- Generic ----------
class AuditLogResponse(BaseModel):
    id: int
    username: str
    role: str
    action: str
    catalog_name: Optional[str]
    metadata_id: Optional[int]
    timestamp: datetime

    class Config:
        orm_mode = True

class EventResponse(BaseModel):
    event_id: int
    metadata_id: int
    event_type: str
    timestamp: datetime

    class Config:
        orm_mode = True
