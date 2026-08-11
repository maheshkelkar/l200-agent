# 📈 Financial Research & Report Generator
### Multi-Agent Production Architecture for Institutional Financial Intelligence

[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.12%20%7C%203.13-blue)](https://www.python.org/)
[![ADK](https://img.shields.io/badge/Google%20ADK-2.6.3-green)](https://adk.dev/)
[![Vertex AI](https://img.shields.io/badge/Vertex%20AI-Gemini%202.5%20Pro%20%26%20Flash-orange)](https://cloud.google.com/vertex-ai)
[![OpenTelemetry](https://img.shields.io/badge/Tracing-OpenTelemetry%20%2B%20Cloud%20Trace-purple)](https://opentelemetry.io/)
[![Terraform](https://img.shields.io/badge/IaC-Terraform%20GCP-blueviolet)](https://www.terraform.io/)
[![Benchmark](https://img.shields.io/badge/Golden%20Dataset%20Eval-100%25%20PASS-brightgreen)](evals/eval_harness.py)

---

## 🏛️ Executive Summary & Architecture Overview

The **Financial Research & Report Generator** is an institutional-grade multi-agent equity research platform designed to automate the discovery, extraction, valuation modeling, and synthesis of corporate financial filings (SEC Form 10-Q and 10-K) and market intelligence.

Built using the **Google Agent Development Kit (ADK)**, this system demonstrates production design patterns across five core architectural capabilities.

> 📖 **Architecture & Infrastructure Decisions**: For the complete system block diagram, GCP component rationale, and infrastructure decisions, see [System Architecture & Infrastructure Rationale](doc/architecture.md).

```mermaid
flowchart TD
    subgraph Client & Ingestion Layer
        U["User Financial Query<br/>e.g., 'Analyze Alphabet Q2 2024'"] --> COORD["Coordinator Agent<br/><b>Gemini 2.5 Pro</b>"]
    end

    subgraph Security & Observability Layer
        GUARD["Financial Safety Guardrail<br/>Prompt Injection & Compliance"] --> COORD
        OTEL["OpenTelemetry + Cloud Trace"] -.-> COORD
        LOG["Structured JSON Logger"] -.-> COORD
        REDACT["Active PII & Secret Scrubber"] -.-> LOG
    end

    subgraph Memory & Context Layer
        VAIS[("Vertex AI Search / Datastore<br/>Historical Filings & Session State")]
        COMPACT["Sliding-Window History Compactor"]
        VAIS <--> COMPACT
        COMPACT <--> COORD
    end

    subgraph Multi-Agent Execution Pipeline
        COORD -->|"Delegates Extraction"| DGA["Data Gathering Agent<br/><b>Gemini 2.5 Flash</b>"]
        
        subgraph Tool & Interface Layer
            DGA --> T1["fetch_stock_quote_metrics"]
            DGA --> T2["retrieve_sec_filings_data"]
            DGA --> T3["fetch_company_earnings_news"]
            SM["GCP Secret Manager<br/>Dynamic API Key Injection"] -.-> T1 & T2 & T3
        end
        
        T1 & T2 & T3 -->|"Structured Schemas + Guided Recovery"| DGA
        DGA -->|"Validated Filings & Quotes"| COORD
        COORD -->|"Delegates Valuation & Synthesis"| ANA["Financial Analyst Agent<br/><b>Gemini 2.5 Pro</b>"]
        ANA --> T4["calculate_valuation_multiples"]
        T4 --> ANA
        ANA -->|"Synthesized Research Report"| HITL{"Human-in-the-Loop<br/>Approval Gate"}
        HITL -->|"Approved"| PUB["Final Institutional Research Report"]
        HITL -->|"Feedback / Revision"| ANA
    end

    subgraph Automated Evaluation Harness
        GOLDEN[("Golden Dataset: Verified SEC 10-Q Reports")] --> EVAL["LLM-as-a-Judge Eval Harness"]
        PUB -.-> EVAL
    end
```

---

## 🎯 Architectural Capabilities Matrix

| Architectural Capability | Implementation Details | Key Files |
| :--- | :--- | :--- |
| **1. Tool & Interface Design** | • Comprehensive docstrings with clear parameter definitions<br/>• Highly specific tool naming<br/>• Explicit **Pydantic v2** JSON schemas for inputs & outputs<br/>• Guided error handling returning actionable recovery hints to the LLM | [`app/tools.py`](app/tools.py)<br/>[`tests/test_tools.py`](tests/test_tools.py) |
| **2. Context & Memory** | • Multi-part Constitutional System Prompt (persona, GAAP rules, anti-hallucination)<br/>• Sliding-window history compaction managing context bloat<br/>• Persistent session state & historical filings via **Vertex AI Search**<br/>• Asynchronous non-blocking memory persistence | [`app/constitution.py`](app/constitution.py)<br/>[`app/memory/compactor.py`](app/memory/compactor.py)<br/>[`app/memory/vertex_store.py`](app/memory/vertex_store.py) |
| **3. Orchestration & Logic** | • **Coordinator Multi-Agent Pattern** decomposing research workflows<br/>• **Strategic Model Routing**: Gemini 2.5 Flash for high-speed tool calling + Gemini 2.5 Pro for deep financial synthesis<br/>• Security guardrails protecting against prompt injection<br/>• **Human-in-the-Loop (HITL)** approval checkpoints for report publishing | [`app/agent.py`](app/agent.py)<br/>[`app/guardrails/safety_plugin.py`](app/guardrails/safety_plugin.py)<br/>[`app/guardrails/hitl.py`](app/guardrails/hitl.py) |
| **4. Observability & Tracing** | • Structured JSON logging emitting standard event schemas, tool latency, and outcomes<br/>• Distributed tracing via **OpenTelemetry** with **Google Cloud Trace** exporter<br/>• Active regex-based PII & API credential scrubber | [`app/observability/logger.py`](app/observability/logger.py)<br/>[`app/observability/tracing.py`](app/observability/tracing.py)<br/>[`app/observability/redaction.py`](app/observability/redaction.py) |
| **5. Infrastructure & CI/CD** | • Automated test harness with **Golden Dataset** regression suite<br/>• Complete **Terraform** IaC provisioning GCP resources (`l200-agent-project`)<br/>• **Google Cloud Secret Manager** dynamic secret injection (zero hardcoding) | [`evals/eval_harness.py`](evals/eval_harness.py)<br/>[`infra/terraform/`](infra/terraform/)<br/>[`app/config.py`](app/config.py) |

---

## 📁 Repository Structure

```
l200-agent/
├── app/
│   ├── __init__.py                 # ADK Application export
│   ├── agent.py                    # Coordinator & Multi-Agent orchestration
│   ├── constitution.py             # System prompts & GAAP compliance rules
│   ├── config.py                   # GCP Secret Manager secure credentials resolver
│   ├── tools.py                    # Financial retrieval & valuation tools (Pydantic v2)
│   ├── memory/
│   │   ├── __init__.py
│   │   ├── compactor.py            # Sliding-window history compactor
│   │   └── vertex_store.py         # Vertex AI Search & async session state
│   ├── guardrails/
│   │   ├── __init__.py
│   │   ├── safety_plugin.py        # Input validation & compliance disclaimer
│   │   └── hitl.py                 # Human-In-The-Loop approval checkpoints
│   ├── observability/
│   │   ├── __init__.py
│   │   ├── logger.py               # Structured JSON logger
│   │   ├── tracing.py              # OpenTelemetry & Google Cloud Trace
│   │   └── redaction.py            # PII & Secret redaction filter
│   └── fast_api_app.py             # Production FastAPI & A2A serving entrypoint
├── evals/
│   ├── golden_dataset.json         # Ground-truth verified SEC 10-Q/10-K records
│   ├── eval_harness.py             # Automated regression evaluation harness
│   └── eval_config.yaml            # Quality metrics & threshold settings
├── infra/
│   └── terraform/
│       ├── main.tf                 # GCP Provider & API enablement
│       ├── variables.tf            # Configurable project parameters
│       ├── secret_manager.tf       # Secret Manager secret resources
│       ├── vertex_search.tf        # Discovery Engine datastore & Search Engine
│       ├── cloud_run.tf            # Cloud Run v2 containerized hosting
│       ├── iam.tf                  # Least-privilege service account bindings
│       └── outputs.tf              # Resource outputs (URIs, SA emails)
├── tests/
│   ├── test_tools.py               # Tool schema & error recovery unit tests
│   ├── test_compaction.py          # History compaction unit tests
│   └── integration/                # ADK runner & streaming integration tests
├── Financial_Research_Agent_Demo.ipynb # Interactive Jupyter Walkthrough
├── agents-cli-manifest.yaml        # ADK Agents CLI manifest
├── Dockerfile                      # Production container build
├── pyproject.toml                  # uv dependency & build specification
└── README.md                       # Comprehensive documentation
```

---

## 🚀 Quickstart & Local Execution

### 1. Prerequisites
- Python `>=3.11, <3.14`
- Astral [`uv`](https://docs.astral.sh/uv/) package manager
- Google Cloud SDK (`gcloud`) authenticated with target GCP project

```bash
# Install dependencies with uv
uv sync
```

### 2. Configure Environment
Copy the example environment configuration:
```bash
cp .env.example .env
```

### 3. Run Agent Analysis via Formatted CLI Client
Execute a financial research prompt with clean Markdown formatting using `uv`:
```bash
uv run python client.py "Analyze Alphabet (GOOGL) Q2 2024 financial performance and segment metrics."
```

### 4. Interactive Developer Playground
For interactive developer testing with visual trace cards and step inspection:
```bash
agents-cli playground
```

---

## 🧪 Testing & Automated Evaluation

### 1. Run Complete Pytest Suite (15/15 Passed)
```bash
uv run pytest tests/ -v
```

### 2. Run Automated Golden Dataset Evaluation Harness
The evaluation harness compares agent outputs against verified ground-truth 10-Q filings across Alphabet (**GOOGL**), Apple (**AAPL**), Microsoft (**MSFT**), and NVIDIA (**NVDA**):

```bash
uv run python evals/eval_harness.py
```

**Benchmark Evaluation Output:**
```
================================================================================
  FINANCIAL RESEARCH AGENT BENCHMARK EVALUATION HARNESS
================================================================================

-> Evaluating [eval_googl_q2_2024] for Alphabet Inc. (GOOGL)...
-> Evaluating [eval_aapl_q3_2024] for Apple Inc. (AAPL)...
-> Evaluating [eval_msft_q4_2024] for Microsoft Corporation (MSFT)...
-> Evaluating [eval_nvda_q2_2025] for NVIDIA Corporation (NVDA)...

| Case ID            | Symbol   | Score   | Revenue Match   | Op Income   | EPS Match   | Segments   | Status   |
|--------------------|----------|---------|-----------------|-------------|-------------|------------|----------|
| eval_googl_q2_2024 | GOOGL    | 100.0%  | 100%            | 100%        | 100%        | 100%       | PASSED   |
| eval_aapl_q3_2024  | AAPL     | 100.0%  | 100%            | 100%        | 100%        | 100%       | PASSED   |
| eval_msft_q4_2024  | MSFT     | 100.0%  | 100%            | 100%        | 100%        | 100%       | PASSED   |
| eval_nvda_q2_2025  | NVDA     | 100.0%  | 100%            | 100%        | 100%        | 100%       | PASSED   |

--------------------------------------------------------------------------------
BENCHMARK SUMMARY: Overall Quality Score: 100.0% | Total Test Cases: 4 | Status: ALL PASSED
--------------------------------------------------------------------------------
```

---

## 🏗️ Infrastructure as Code (Terraform)

Infrastructure is provisioned via code targeting Google Cloud Project `l200-agent-project` (Project Number: `120662768527`):

```bash
cd infra/terraform

# Initialize Terraform
terraform init

# Validate configuration
terraform validate

# Plan infrastructure changes
terraform plan -var="project_id=l200-agent-project"

# Apply infrastructure
terraform apply -var="project_id=l200-agent-project"
```

### Provisioned Resources:
1. **Google Cloud Secret Manager**: Secure storage for `financial-api-key`, `alphavantage-api-key`, and `polygon-api-key` (zero hardcoded secrets).
2. **Vertex AI Search (Discovery Engine)**: `sec-filings-datastore` and `financial-search-engine` for indexing SEC filings.
3. **Cloud Run v2**: Serverless container runtime hosting the FastAPI & A2A agent endpoints.
4. **Cloud Trace & Logging**: Distributed tracing and structured JSON log pipelines.
5. **IAM Service Account**: `financial-agent-sa` with least-privilege role bindings.

---

## 🔒 Security, Guardrails & Human-in-the-Loop

- **Prompt Injection Defense**: `FinancialSafetyGuardrail.validate_input()` actively blocks override attempts, system instructions exfiltration, and jailbreaks.
- **Compliance Enforcement**: Enforces mandatory SEC disclaimers on all synthesized reports.
- **Human-in-the-Loop Gate**: `HITLApprovalGate` pauses execution when high-stakes actions (such as publishing investment ratings) are generated, awaiting explicit human reviewer sign-off.
- **PII / Secret Redactor**: `RedactingJSONProcessor` sanitizes API keys, auth tokens, SSNs, credit cards, and emails from all stdout logs and trace spans.

---

## 🔮 Known Limitations & Future Improvements

### 1. On-Demand SEC Filing Footnote & Segment Breakdown Retrieval
- **Current Behavior**:
  - **Consolidated Statements (On-Demand)**: Primary financial statement totals (`Total Revenue`, `Operating Income`, `Net Income`) are retrieved on demand at runtime for any publicly traded ticker via live statement feeds (`yfinance`).
  - **Footnote Disclosures & Segment Reporting (Pre-Indexed)**: Audited product/divisional segment breakdowns (e.g., *Google Cloud vs. Search*, *iPhone vs. Services*, *Data Center vs. Gaming*) and qualitative MD&A highlights are currently pre-indexed for core benchmark filings (`GOOGL`, `AAPL`, `MSFT`, `NVDA`).
  - **Anti-Hallucination Fallback**: When an unindexed filing or quarter is queried (e.g., `TSLA Q1 2026` or `NVDA Q1 2026`), the agent provides verified top-line financial totals but strictly adheres to its anti-hallucination constitution by disclosing that specific segment breakdowns were not available in the retrieved primary statement.

- **Planned Improvements**:
  - **Dynamic SEC EDGAR XBRL Ingestion**: Connect directly to the free [SEC EDGAR Company Facts API](https://data.sec.gov/api/xbrl/companyfacts/) to extract dimensional segment axes (`us-gaap/StatementBusinessSegmentsAxis`) and product breakdowns on demand for any SEC-registered entity.
  - **Automated Vertex AI Search RAG Pipeline**: Ingest full SEC 10-Q/10-K filing documents into the provisioned Discovery Engine Datastore ([`infra/terraform/vertex_search.tf`](infra/terraform/vertex_search.tf)), enabling Gemini to parse Footnote tables and qualitative MD&A disclosures dynamically.
  - **Commercial Segment API Integration**: Utilize provisioned Secret Manager credentials ([`infra/terraform/secret_manager.tf`](infra/terraform/secret_manager.tf)) for pre-normalized multi-segment endpoints (e.g., Financial Modeling Prep or Polygon).

---

## 📜 License & Compliance

Licensed under the [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).
