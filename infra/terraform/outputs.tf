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

output "project_id" {
  description = "Configured GCP Project ID"
  value       = var.project_id
}

output "service_account_email" {
  description = "Service account running the financial agent"
  value       = google_service_account.agent_sa.email
}

output "cloud_run_service_uri" {
  description = "URI of the deployed Cloud Run agent service"
  value       = google_cloud_run_v2_service.agent_service.uri
}

output "secret_manager_financial_key_id" {
  description = "Secret Manager secret ID for financial API key"
  value       = google_secret_manager_secret.financial_api_key.secret_id
}

output "vertex_search_datastore_id" {
  description = "Vertex AI Search datastore ID for SEC filings"
  value       = google_discovery_engine_data_store.sec_datastore.data_store_id
}

output "artifact_registry_repo" {
  description = "Artifact Registry Docker repository"
  value       = google_artifact_registry_repository.agent_repo.name
}
