import requests
from typing import List, Dict
from sqlalchemy.orm import Session

CKAN_BASE = "https://catalog.data.gov/api/3/action"
NYC_OPEN_DATA = "https://data.cityofnewyork.us/api"
CHICAGO_OPEN_DATA = "https://data.cityofchicago.org/api"


class PublicDatasetAdapter:
    """
    Real public dataset adapter.
    Queries:
    - data.gov (CKAN)
    - NYC Open Data
    - Chicago Open Data
    """

    def _ckan_search(self, query: str) -> List[Dict]:
        try:
            print(f"[CKAN] Searching for: {query}")

            resp = requests.get(
                f"{CKAN_BASE}/package_search",
                params={"q": query, "rows": 10},
                timeout=10,
            )

            print(f"[CKAN] Status: {resp.status_code}")

            resp.raise_for_status()

            data = resp.json()

            if not data.get("success"):
                print("[CKAN] API returned success=False")
                return []

            results = []

            for hit in data["result"]["results"]:
                results.append(
                    {
                        "catalog": "public",
                        "object_name": hit.get("name", ""),
                    }
                )

            print(f"[CKAN] Found {len(results)} results")

            return results

        except Exception as e:
            print(f"[CKAN ERROR] {e}")
            return []

    def _nyc_search(self, query: str) -> List[Dict]:
        try:
            print(f"[NYC] Searching for: {query}")

            resp = requests.get(
                f"{NYC_OPEN_DATA}/search/views",
                params={"q": query, "limit": 10},
                timeout=10,
            )

            print(f"[NYC] Status: {resp.status_code}")

            if resp.status_code != 200:
                print("[NYC] Response:")
                print(resp.text[:500])
                return []

            data = resp.json()

            results = []

            for item in data.get("results", []):
                results.append(
                    {
                        "catalog": "public",
                        "object_name": item.get("id", ""),
                    }
                )

            print(f"[NYC] Found {len(results)} results")

            return results

        except Exception as e:
            print(f"[NYC ERROR] {e}")
            return []

    def _chicago_search(self, query: str) -> List[Dict]:
        try:
            print(f"[CHICAGO] Searching for: {query}")

            resp = requests.get(
                f"{CHICAGO_OPEN_DATA}/search/views",
                params={"q": query, "limit": 10},
                timeout=10,
            )

            print(f"[CHICAGO] Status: {resp.status_code}")

            if resp.status_code != 200:
                print("[CHICAGO] Response:")
                print(resp.text[:500])
                return []

            data = resp.json()

            results = []

            for item in data.get("results", []):
                results.append(
                    {
                        "catalog": "public",
                        "object_name": item.get("id", ""),
                    }
                )

            print(f"[CHICAGO] Found {len(results)} results")

            return results

        except Exception as e:
            print(f"[CHICAGO ERROR] {e}")
            return []

    def search(self, db: Session, query: str) -> List[Dict]:
        results = []

        results.extend(self._ckan_search(query))
        results.extend(self._nyc_search(query))
        results.extend(self._chicago_search(query))

        print(f"[PUBLIC ADAPTER] Total results: {len(results)}")

        return results

    def get_metadata(self, db: Session, object_name: str) -> Dict | None:
        try:
            resp = requests.get(
                f"{CKAN_BASE}/package_show",
                params={"id": object_name},
                timeout=10,
            )

            if resp.status_code == 200:
                data = resp.json()

                if data.get("success"):
                    pkg = data["result"]

                    return {
                        "catalog": "public",
                        "object_name": pkg.get("name"),
                        "title": pkg.get("title"),
                        "description": pkg.get("notes"),
                    }

        except Exception as e:
            print(f"[METADATA ERROR] {e}")

        return None

    def list_objects(self, db: Session) -> List[Dict]:
        try:
            resp = requests.get(
                f"{CKAN_BASE}/package_list",
                params={"limit": 10},
                timeout=10,
            )

            if resp.status_code != 200:
                return []

            data = resp.json()

            if not data.get("success"):
                return []

            return [
                {
                    "catalog": "public",
                    "object_name": name,
                }
                for name in data["result"][:10]
            ]

        except Exception as e:
            print(f"[LIST ERROR] {e}")
            return []