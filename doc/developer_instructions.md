# 🛠️ Developer Setup & Execution Guide

This document provides step-by-step instructions for setting up, developing, testing, and running the **Financial Research & Report Generator** locally and deploying it to Google Cloud.

---

## 1. 📋 Prerequisites

Before running the agent, ensure you have the following tools installed and configured:

1. **Python `>=3.11, <3.14`**
2. **Astral [`uv`](https://docs.astral.sh/uv/)** (Fast Python package and environment manager)
3. **Google Cloud SDK (`gcloud`)**
4. **Node.js `>=18` & npm** (Only required if modifying or rebuilding the React frontend in `frontend/`)

### Authenticate Google Cloud SDK
Ensure your local `gcloud` session is authenticated to your target GCP project:
```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
```

---

## 2. ⚙️ Environment Configuration

1. **Clone the repository and install Python dependencies:**
   ```bash
   # Install dependencies using uv
   uv sync
   ```

2. **Configure Environment Variables:**
   Copy the provided `.env.example` template:
   ```bash
   cp .env.example .env
   ```

   Configure the key variables in `.env`:
   ```bash
   GOOGLE_GENAI_USE_VERTEXAI=true
   GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID
   GOOGLE_CLOUD_PROJECT_NUMBER=YOUR_PROJECT_NUMBER
   GOOGLE_CLOUD_LOCATION=global
   FLASH_MODEL=gemini-2.5-flash
   PRO_MODEL=gemini-2.5-pro
   ```

---

## 3. 💻 Local Execution & Interactive Testing

### Option A: Interactive Web UI & API Server (Recommended)
Run the unified FastAPI server that co-hosts the precompiled React frontend and ADK agent backend on port `8080`:
```bash
GOOGLE_CLOUD_LOCATION=global uv run uvicorn app.fast_api_app:app --host 0.0.0.0 --port 8080
```
Open your browser to: 👉 **`http://localhost:8080/`**

### Option B: Formatted CLI Client
Execute financial research queries directly in your terminal with clean markdown streaming:
```bash
# Query Alphabet Q2 2024
uv run python client.py "Analyze Alphabet (GOOGL) Q2 2024 financial performance and segment metrics."

# Comparative Peer Analysis
uv run python client.py "Compare operating margins and cloud revenue scale between Alphabet (GOOGL) and Microsoft (MSFT) in 2024."
```

### Option C: ADK Interactive Developer Playground
For visual step-by-step agent trace inspection and interactive tool debugging:
```bash
agents-cli playground
```

### Option D: Building / Modifying the Frontend
If you make changes to React components in `frontend/src/`:
```bash
cd frontend
npm install
npm run build
cd ..
```
The compiled assets will be placed in `frontend/dist/` and automatically served by FastAPI.

---

## 4. 🧪 Testing & Continuous Evaluation

### 1. Run Complete Pytest Suite (17/17 Passed)
Execute all unit and integration tests (validating Pydantic schemas, history compaction, FastAPI routes, and multi-agent execution):
```bash
uv run pytest tests/ -v
```

### 2. Run Automated Golden Dataset Evaluation Harness
The evaluation harness executes verified benchmark test cases across **Alphabet (GOOGL)**, **Apple (AAPL)**, **Microsoft (MSFT)**, and **NVIDIA (NVDA)**, grading output accuracy against verified ground-truth SEC 10-Q statements:
```bash
uv run python evals/eval_harness.py
```

---

## 5. 🏗️ Infrastructure Provisioning (Terraform)

Provision the supporting GCP infrastructure (Secret Manager, Vertex AI Search, Cloud Run, IAM roles):

```bash
cd infra/terraform

# 1. Initialize Terraform provider
terraform init

# 2. Validate syntax
terraform validate

# 3. Preview infrastructure changes
terraform plan -var="project_id=YOUR_PROJECT_ID"

# 4. Provision resources
terraform apply -var="project_id=YOUR_PROJECT_ID"

cd ../..
```

---

## 6. ☁️ Cloud Run Deployment & Remote Access

### 1. Deploy Container to Cloud Run
Deploy the multi-agent container to Google Cloud Run:
```bash
gcloud run deploy financial-agent \
  --source . \
  --region us-east1 \
  --project YOUR_PROJECT_ID \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_LOCATION=global,ALLOW_ORIGINS=*
```

### 2. Connect Browser to Cloud Run via Auth Bridge
When Cloud Run is governed by Domain-Restricted Sharing (DRS), run the local gateway proxy to attach Google Cloud credentials:
```bash
uv run python cloud_run_proxy.py
```
Then visit **`http://localhost:8000/`** (or your host IP) in your browser.
