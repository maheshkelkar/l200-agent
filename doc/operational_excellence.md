# 🛡️ Operational Excellence & Governance Guide

This document details the operational excellence, security guardrails, observability, testing harnesses, and production runbooks for the **Financial Research & Report Generator**.

---

## 1. 🔍 Observability, Distributed Tracing & Logging

### OpenTelemetry Distributed Tracing
- **Framework**: OpenTelemetry Python SDK integrated with Google Cloud Trace (`CloudTraceSpanExporter`).
- **Trace Spans**: Automatically instruments multi-agent workflow handoffs, tool invocations (`retrieve_sec_filings_data`, `calculate_valuation_multiples`, `fetch_stock_quote_metrics`), and LLM generation calls.
- **Trace Context Propagation**: Propagates W3C TraceContext headers across agent boundaries and async tasks to correlate full end-to-end request lifecycles in the Google Cloud Trace console.
- **Key File**: [`app/observability/tracing.py`](../app/observability/tracing.py)

### Structured JSON Logging
- **Standardized Schema**: Emits machine-parseable JSON logs to `stdout` compatible with Google Cloud Logging.
- **Event Lifecycle Tracking**:
  - `agent_run_start` / `agent_run_completed`
  - `agent_tool_invoked` / `agent_tool_completed`
  - `tool_execution_error`
- **Fields Logged**: `timestamp`, `severity`, `event`, `logger`, `session_id`, `tool_name`, `tool_args`, `duration_ms`, `status`, and `result_summary`.
- **Key File**: [`app/observability/logger.py`](../app/observability/logger.py)

### Active PII & Secret Redaction
- **Regex Scrubbing Engine**: `RedactingJSONProcessor` inspects all outgoing log messages and trace span attributes before writing to streams.
- **Protected Patterns**:
  - API Keys (Google AI, Polygon, AlphaVantage, Finnhub)
  - Bearer & OAuth Authorization Tokens
  - Social Security Numbers (SSNs)
  - Credit Card Numbers
  - Email Addresses
- **Key File**: [`app/observability/redaction.py`](../app/observability/redaction.py)

---

## 2. 🔒 Security, Guardrails & Governance

### Prompt Injection & Jailbreak Defense
- **Input Validation**: `FinancialSafetyGuardrail.validate_input()` scans user prompts for prompt injection, system instruction overrides, exfiltration patterns, and out-of-scope adversarial prompts.
- **Rejection Mechanism**: Rejects malicious prompts before invoking downstream LLMs or executing data tools.
- **Key File**: [`app/guardrails/safety_plugin.py`](../app/guardrails/safety_plugin.py)

### Mandatory Compliance & SEC Disclaimers
- **Constitutional Guardrails**: The Coordinator constitution enforces mandatory standard financial disclosures on every synthesized research report.
- **Disclaimer Text**: Mandates non-advisory institutional disclaimers and GAAP compliance statements.
- **Key File**: [`app/constitution.py`](../app/constitution.py)

### Human-in-the-Loop (HITL) Research Publishing Gate
- **Purpose**: Under institutional compliance (FINRA Rule 2210 / SEC supervisory oversight), high-stakes actions like formal investment ratings (`BUY`, `HOLD`, `SELL`) or price target releases require human analyst review.
- **Workflow**:
  1. **Pending Review (Embargoed)**: Report content and valuation models are locked and blurred with a draft embargo banner.
  2. **Approved & Released**: The supervisory analyst verifies the thesis, attaches optional compliance notes, and signs the release. The full report unlocks with a verified digital signature.
  3. **Rejected**: The report is blocked from publication with reviewer comments recorded.
- **Key Files**: [`app/guardrails/hitl.py`](../app/guardrails/hitl.py), [`frontend/src/components/HITLCard.tsx`](../frontend/src/components/HITLCard.tsx)

### GCP Secret Manager Dynamic Secret Injection
- **Zero Hardcoded Secrets**: All API credentials (`financial-api-key`, `alphavantage-api-key`, `polygon-api-key`) are stored in Google Cloud Secret Manager.
- **Dynamic Resolution**: `GCPSecretsResolver` retrieves secrets at runtime with fallback to environment variables for local development.
- **Key File**: [`app/config.py`](../app/config.py)

### Least-Privilege IAM Architecture
- **Service Account**: `financial-agent-sa` bound strictly to required roles (`roles/aiplatform.user`, `roles/secretmanager.secretAccessor`, `roles/cloudtrace.agent`, `roles/discoveryengine.editor`).
- **Domain-Restricted Sharing (DRS)**: Cloud Run service access is restricted to verified organizational identities.
- **Key File**: [`infra/terraform/iam.tf`](../infra/terraform/iam.tf)

---

## 3. 🧪 Testing & Continuous Evaluation Harness

### Automated Unit & Integration Test Suite
- **Framework**: `pytest` + `pytest-asyncio`.
- **Test Matrix**:
  - `tests/test_tools.py`: Pydantic input/output schemas, valid inputs, mathematical edge cases, and guided error recovery hints.
  - `tests/test_compaction.py`: Context window sliding-window compaction and summarization triggers.
  - `tests/integration/test_server_e2e.py`: FastAPI server routes, session lifecycle, and Server-Sent Events (SSE) streaming.
  - `tests/integration/test_agent.py`: Multi-agent handoffs and dual-model execution.
- **Execution**:
  ```bash
  uv run pytest tests/ -v
  ```

### Golden Dataset Automated Evaluation Harness
- **Benchmark Dataset**: [`evals/golden_dataset.json`](../evals/golden_dataset.json) contains ground-truth verified SEC 10-Q statements across Alphabet (**GOOGL**), Apple (**AAPL**), Microsoft (**MSFT**), and NVIDIA (**NVDA**).
- **Evaluation Dimensions**:
  - Revenue match accuracy
  - Operating Income accuracy
  - Diluted EPS match accuracy
  - Segment breakdown accuracy
  - Overall quality score
- **Execution**:
  ```bash
  uv run python evals/eval_harness.py
  ```

---

## 4. 🚀 Production Runbook & Operations

### Deployment to Google Cloud Run
Deploy containerized revisions using `gcloud` or `agents-cli`:
```bash
gcloud run deploy financial-agent \
  --source . \
  --region us-east1 \
  --project $PROJECT_ID \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_LOCATION=global,ALLOW_ORIGINS=*
```

### Instant Rollback Procedure
Cloud Run maintains immutable revision histories. To rollback immediately to a previous healthy revision:
```bash
# 1. List active revisions
gcloud run revisions list --service=financial-agent --region=us-east1 --project=$PROJECT_ID

# 2. Shift 100% of traffic to previous revision
gcloud run services update-traffic financial-agent \
  --to-revisions=PREVIOUS_REVISION_NAME=100 \
  --region=us-east1 \
  --project=$PROJECT_ID
```

### Local Authenticated Access Bridge
When accessing Cloud Run services protected by Domain-Restricted Sharing:
```bash
# Option A: Custom Gateway Proxy (0.0.0.0:8000 for laptop browser access)
uv run python cloud_run_proxy.py

# Option B: Official gcloud proxy (127.0.0.1:8080 on local machine)
gcloud run services proxy financial-agent --region=us-east1 --project=$PROJECT_ID --port=8080
```

### Monitoring & Log Queries
Search for application events and tool failures in Google Cloud Logging:
```bash
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="financial-agent"' \
  --project=$PROJECT_ID \
  --limit=50 \
  --format="table(timestamp,severity,jsonPayload.event,jsonPayload.tool_name,textPayload)"
```
