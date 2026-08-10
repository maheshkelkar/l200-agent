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

"""Multi-Agent Orchestration for Financial Research & Report Generation.

Implements the Coordinator and Multi-Agent patterns with strategic model routing:
- Data Gathering Agent: Gemini 2.5 Flash (high speed, cost-effective data extraction)
- Analyst Agent: Gemini 2.5 Pro (deep financial reasoning, valuation modeling, and report synthesis)
- Coordinator Agent: Gemini 2.5 Pro (workflow decomposition, context compaction, and routing)
"""

from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models import Gemini
from google.genai import types

from app.config import get_settings
from app.constitution import (
    ANALYST_CONSTITUTION,
    COORDINATOR_CONSTITUTION,
    DATA_GATHERING_CONSTITUTION,
)
from app.observability import AgentExecutionLogger
from app.tools import (
    calculate_valuation_multiples,
    fetch_company_earnings_news,
    fetch_stock_quote_metrics,
    retrieve_sec_filings_data,
)

settings = get_settings()
logger = AgentExecutionLogger(agent_name="orchestrator")

# ============================================================================
# Sub-Agent 1: Data Gathering Agent (Gemini 2.5 Flash for Speed)
# ============================================================================
data_gathering_agent = Agent(
    name="data_gathering_agent",
    description="Fetches live stock market quotes, verified SEC 10-Q/10-K financial records, and earnings news.",
    model=Gemini(
        model=settings.flash_model,
        client_kwargs={
            "vertexai": True,
            "project": settings.project_id,
            "location": settings.location,
        },
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction=DATA_GATHERING_CONSTITUTION,
    tools=[
        fetch_stock_quote_metrics,
        retrieve_sec_filings_data,
        fetch_company_earnings_news,
    ],
)

# ============================================================================
# Sub-Agent 2: Financial Analyst Agent (Gemini 2.5 Pro for Reasoning)
# ============================================================================
analyst_agent = Agent(
    name="analyst_agent",
    description="Synthesizes raw financial data, computes valuation multiples (EV/EBITDA, P/E), and produces executive research reports.",
    model=Gemini(
        model=settings.pro_model,
        client_kwargs={
            "vertexai": True,
            "project": settings.project_id,
            "location": settings.location,
        },
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction=ANALYST_CONSTITUTION,
    tools=[
        calculate_valuation_multiples,
    ],
)

# ============================================================================
# Coordinator Agent (Root Orchestrator - Gemini 2.5 Pro)
# ============================================================================
root_agent = Agent(
    name="root_agent",
    description="Lead financial research coordinator delegating tasks across data gathering and financial analysis agents.",
    model=Gemini(
        model=settings.pro_model,
        client_kwargs={
            "vertexai": True,
            "project": settings.project_id,
            "location": settings.location,
        },
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction=COORDINATOR_CONSTITUTION,
    tools=[
        fetch_stock_quote_metrics,
        retrieve_sec_filings_data,
        calculate_valuation_multiples,
        fetch_company_earnings_news,
    ],
    sub_agents=[
        data_gathering_agent,
        analyst_agent,
    ],
)

# ADK Application Entrypoint
app = App(
    root_agent=root_agent,
    name="app",
)
