# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Configuration and secure secret management for Financial Research Agent.

Strictly avoids hardcoded API keys by resolving secrets dynamically from
Google Cloud Secret Manager with graceful fallback to environment variables.
"""

import os
from functools import lru_cache
from typing import Optional
from google.cloud import secretmanager
from pydantic import BaseModel, Field


def _resolve_project_id() -> str:
    proj = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCP_PROJECT")
    if proj:
        return proj
    try:
        import google.auth
        _, cred_proj = google.auth.default()
        if cred_proj:
            return cred_proj
    except Exception:
        pass
    return "your-project-id"


class Settings(BaseModel):
    """Application configuration settings."""

    # GCP Project Information
    project_id: str = Field(
        default_factory=_resolve_project_id
    )
    project_number: str = Field(
        default_factory=lambda: os.getenv("GOOGLE_CLOUD_PROJECT_NUMBER", "")
    )
    location: str = Field(
        default_factory=lambda: (
            "global"
            if (not os.getenv("GOOGLE_CLOUD_LOCATION") or "." in os.getenv("GOOGLE_CLOUD_LOCATION", "") or "@" in os.getenv("GOOGLE_CLOUD_LOCATION", ""))
            else os.getenv("GOOGLE_CLOUD_LOCATION", "global")
        )
    )

    # Vertex AI & Model Settings
    flash_model: str = Field(
        default_factory=lambda: os.getenv("FLASH_MODEL", "gemini-2.5-flash")
    )
    pro_model: str = Field(
        default_factory=lambda: os.getenv("PRO_MODEL", "gemini-2.5-pro")
    )

    # Vertex AI Search / Discovery Engine Settings
    datastore_id: str = Field(
        default_factory=lambda: os.getenv("VERTEX_SEARCH_DATASTORE_ID", "sec-filings-datastore")
    )
    search_engine_id: str = Field(
        default_factory=lambda: os.getenv("VERTEX_SEARCH_ENGINE_ID", "financial-search-engine")
    )

    # Secret IDs in Google Cloud Secret Manager
    financial_api_key_secret_name: str = "financial-api-key"
    alpha_vantage_api_key_secret_name: str = "alphavantage-api-key"
    polygon_api_key_secret_name: str = "polygon-api-key"

    # Observability
    enable_cloud_trace: bool = Field(
        default_factory=lambda: os.getenv("ENABLE_CLOUD_TRACE", "true").lower() == "true"
    )
    log_level: str = Field(
        default_factory=lambda: os.getenv("LOG_LEVEL", "INFO")
    )


def get_secret_from_secret_manager(
    secret_id: str, project_id: str, version_id: str = "latest"
) -> Optional[str]:
    """Retrieve secret payload from Google Cloud Secret Manager.

    Args:
        secret_id: The ID of the secret in Secret Manager.
        project_id: GCP project ID.
        version_id: Secret version (default 'latest').

    Returns:
        Secret payload as string, or None if not accessible.
    """
    try:
        client = secretmanager.SecretManagerServiceClient()
        name = f"projects/{project_id}/secrets/{secret_id}/versions/{version_id}"
        response = client.access_secret_version(request={"name": name})
        return response.payload.data.decode("UTF-8").strip()
    except Exception:
        # Graceful fallback to local environment variable
        env_key = secret_id.upper().replace("-", "_")
        return os.getenv(env_key)


class SecretResolver:
    """Manages secure resolution and caching of API credentials."""

    def __init__(self, project_id: str):
        self.project_id = project_id
        self._cache: dict[str, Optional[str]] = {}

    def get_secret(self, secret_id: str) -> Optional[str]:
        """Fetch a secret, caching the result in memory for efficiency."""
        if secret_id not in self._cache:
            secret_value = get_secret_from_secret_manager(
                secret_id=secret_id, project_id=self.project_id
            )
            self._cache[secret_id] = secret_value
        return self._cache[secret_id]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached singleton instance of application settings."""
    return Settings()


@lru_cache(maxsize=1)
def get_secret_resolver() -> SecretResolver:
    """Return cached singleton instance of SecretResolver."""
    settings = get_settings()
    return SecretResolver(project_id=settings.project_id)
