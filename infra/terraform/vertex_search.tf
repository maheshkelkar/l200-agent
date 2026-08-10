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

# Cloud Storage Bucket for SEC 10-Q/10-K Filings & Financial Documents Ingestion
resource "google_storage_bucket" "sec_filings_bucket" {
  name                        = "${var.project_id}-sec-filings-data"
  location                    = var.region
  project                     = var.project_id
  force_destroy               = false
  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }

  depends_on = [google_project_service.apis]
}

# Vertex AI Search / Discovery Engine Data Store for Historical SEC Filings
resource "google_discovery_engine_data_store" "sec_datastore" {
  location                    = "global"
  data_store_id               = var.datastore_id
  display_name                = "SEC Historical Financial Filings Datastore"
  industry_vertical           = "GENERIC"
  content_config              = "CONTENT_REQUIRED"
  solution_types              = ["SOLUTION_TYPE_SEARCH"]
  project                     = var.project_id

  depends_on = [google_project_service.apis]
}

# Vertex AI Search Engine
resource "google_discovery_engine_search_engine" "financial_search_engine" {
  location          = "global"
  engine_id         = "financial-search-engine"
  collection_id     = "default_collection"
  display_name      = "Financial Research Search Engine"
  project           = var.project_id
  data_store_ids    = [google_discovery_engine_data_store.sec_datastore.data_store_id]

  search_tier       = "SEARCH_TIER_STANDARD"
  search_add_ons    = ["SEARCH_ADD_ON_LLM"]

  search_engine_config {
    search_add_ons = ["SEARCH_ADD_ON_LLM"]
  }

  depends_on = [google_discovery_engine_data_store.sec_datastore]
}
