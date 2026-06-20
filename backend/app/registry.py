from typing import Dict

from .adapters.spark_adapter import SparkAdapter
from .adapters.postgres_adapter import PostgresAdapter
from .adapters.opensearch_adapter import OpenSearchAdapter
from .adapters.public_dataset_adapter import PublicDatasetAdapter


class CatalogRegistry:
    """Holds catalog adapters; provides lookup by name.
    New adapters can be added here without touching client code.
    """

    def __init__(self) -> None:
        self._catalogs: Dict[str, object] = {
            "spark": SparkAdapter(),
            "postgres": PostgresAdapter(),
            "opensearch": OpenSearchAdapter(),
            "public": PublicDatasetAdapter(),
        }

    def get_catalog(self, name: str):
        catalog = self._catalogs.get(name.lower())
        if not catalog:
            raise ValueError(f"Catalog '{name}' not registered")
        return catalog

    def list_catalogs(self):
        return list(self._catalogs.keys())


# Singleton instance used throughout the project
registry = CatalogRegistry()
