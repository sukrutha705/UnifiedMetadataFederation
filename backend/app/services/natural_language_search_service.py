# backend/app/services/natural_language_search_service.py

"""
Natural Language Search Service

Converts natural-language queries into keywords and reuses the
existing Smart Catalog Discovery ranking engine.
"""

from typing import List
from sqlalchemy.orm import Session

from ..services.catalog_discovery_service import suggest_catalogs
from ..schemas import CatalogSuggestion


_STOP_WORDS = {
    "show",
    "me",
    "find",
    "who",
    "owns",
    "owner",
    "owned",
    "by",
    "the",
    "in",
    "for",
    "and",
    "or",
    "of",
    "to",
    "my",
    "your",
    "a",
    "an",
    "all",
    "any",
    "on",
    "as",
    "from",
    "with",
    "metadata",
    "table",
    "tables",
    "dataset",
    "datasets",
    "index",
    "indexes",
}


def extract_keywords(query: str) -> str:
    """
    Convert natural language into searchable keywords.
    """

    tokens = [
        token.strip()
        for token in query.lower().split()
        if token.strip() and token.lower() not in _STOP_WORDS
    ]

    return " ".join(tokens)


def natural_search(
    query: str,
    db: Session,
) -> List[CatalogSuggestion]:
    """
    Natural language search entrypoint.

    Flow:
        Natural Language Query
                ↓
        Keyword Extraction
                ↓
        Existing Ranking Engine
                ↓
        Ranked Suggestions
    """

    cleaned_query = extract_keywords(query)

    if not cleaned_query:
        return []

    return suggest_catalogs(cleaned_query, db)