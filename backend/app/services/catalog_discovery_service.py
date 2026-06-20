# backend/app/services/catalog_discovery_service.py
"""Catalog Discovery Service

Provides smart suggestions for catalog metadata based on a query string.
All logic is additive and re‑uses existing models and services.
"""

from typing import List
from sqlalchemy.orm import Session
from ..models import Metadata
from ..schemas import CatalogSuggestion
from ..services.consistency_service import check_consistency

# Catalog priority bonuses
_CATALOG_BONUS = {
    "spark": 20,
    "postgres": 15,
    "opensearch": 10,
    "public": 5,
}


def _match_score(object_name: str, description: str | None, query: str) -> tuple[int, List[str]]:
    """Calculate match score and reasons for a single metadata record.
    Returns (score, reasons).
    """
    score = 0
    reasons: List[str] = []
    lower_obj = object_name.lower()
    lower_q = query.lower()

    # Exact match
    if lower_obj == lower_q:
        score += 200
        reasons.append("Exact object match")
    # Prefix match
    elif lower_obj.startswith(lower_q):
        score += 120
        reasons.append("Object starts with query")
    # Contains match
    elif lower_q in lower_obj:
        score += 80
        reasons.append("Object name contains query")

    # Description match
    if description and lower_q in description.lower():
        score += 40
        reasons.append("Description match")

    return score, reasons


def suggest_catalogs(query: str, db: Session) -> List[CatalogSuggestion]:
    """Return top 10 catalog suggestions for *query*.

    The function performs a single query that fetches candidate metadata
    rows. Scoring and ranking are done in‑memory, avoiding N+1 DB hits.
    """
    if not query:
        return []

    # Pull candidate rows – we need object_name, description, catalog_name, id
    candidates = (
        db.query(
            Metadata.id,
            Metadata.catalog_name,
            Metadata.object_name,
            Metadata.description,
        )
        .filter(
            # Basic fuzzy filter to reduce dataset size – matches anywhere in object_name or description
            (Metadata.object_name.ilike(f"%{query}%"))
            | (Metadata.description.ilike(f"%{query}%"))
        )
        .all()
    )

    suggestions: List[CatalogSuggestion] = []
    for meta_id, catalog, obj_name, description in candidates:
        # Base match scoring
        base_score, reasons = _match_score(obj_name, description, query)

        # Consistency bonus – reuse existing service (fast, single call per meta)
        try:
            consistency = check_consistency(db, obj_name)
            if consistency.consistent:
                base_score += 30
                reasons.append("High consistency score")
        except Exception:
            # If consistency check fails we simply ignore the bonus
            pass

        # Catalog priority bonus
        bonus = _CATALOG_BONUS.get(catalog, 0)
        if bonus:
            base_score += bonus
            reasons.append("Preferred catalog")

        suggestion = CatalogSuggestion(
            catalog=catalog,
            object_name=obj_name,
            score=base_score,
            reason=reasons,
        )
        suggestions.append(suggestion)

    # Sort descending by score and limit to 10
    suggestions.sort(key=lambda s: s.score, reverse=True)
    return suggestions[:10]
