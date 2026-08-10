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

# Artifact Registry Repository for Docker images
resource "google_artifact_registry_repository" "agent_repo" {
  location      = var.region
  repository_id = "financial-agent-repo"
  description   = "Docker repository for Financial Research Agent images"
  format        = "DOCKER"
  project       = var.project_id

  depends_on = [google_project_service.apis]
}

# Cloud Run v2 Service for Containerized Agent Execution
resource "google_cloud_run_v2_service" "agent_service" {
  name     = "financial-research-agent"
  location = var.region
  project  = var.project_id
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.agent_sa.email

    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.agent_repo.repository_id}/agent:latest"

      resources {
        limits = {
          cpu    = "2"
          memory = "2Gi"
        }
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      env {
        name  = "GOOGLE_CLOUD_LOCATION"
        value = var.region
      }
      env {
        name  = "VERTEX_SEARCH_DATASTORE_ID"
        value = var.datastore_id
      }
      env {
        name  = "ENABLE_CLOUD_TRACE"
        value = "true"
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [
    google_artifact_registry_repository.agent_repo,
    google_project_iam_member.vertex_ai_user,
    google_project_iam_member.secret_accessor,
  ]
}
