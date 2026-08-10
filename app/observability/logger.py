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

"""Structured JSON Logging System for AI Agents.

Emits structured JSON logs capturing rich metadata (agent intent, action taken,
actual outcome, tool parameters, latency, error traces) with automatic PII redaction.
"""

import json
import logging
import sys
import time
from typing import Any, Optional
import structlog

from app.observability.redaction import redact_data


class RedactingJSONProcessor:
    """Structlog processor that redacts PII and secrets before serialization."""

    def __call__(
        self, logger: logging.Logger, name: str, event_dict: dict[str, Any]
    ) -> dict[str, Any]:
        return redact_data(event_dict)


def setup_structured_logging(log_level: str = "INFO") -> structlog.stdlib.BoundLogger:
    """Configure structlog for structured JSON output to stdout.

    Args:
        log_level: Minimum logging level (e.g., 'INFO', 'DEBUG', 'WARNING').

    Returns:
        Configured structlog logger instance.
    """
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, log_level.upper(), logging.INFO),
    )

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            RedactingJSONProcessor(),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    return structlog.get_logger("financial_agent")


logger = setup_structured_logging()


class AgentExecutionLogger:
    """Helper for logging agent lifecycles, tool invocations, and outcomes."""

    def __init__(self, agent_name: str):
        self.agent_name = agent_name
        self.logger = logger.bind(agent_name=agent_name)

    def log_intent(self, session_id: str, intent: str, prompt: str, **kwargs: Any) -> None:
        """Log the agent's interpreted user intent."""
        self.logger.info(
            "agent_intent_started",
            session_id=session_id,
            intent=intent,
            prompt_preview=prompt[:200] if prompt else "",
            **kwargs,
        )

    def log_tool_start(
        self, session_id: str, tool_name: str, tool_args: dict[str, Any]
    ) -> float:
        """Log the initiation of an external tool call."""
        start_time = time.time()
        self.logger.info(
            "agent_tool_invoked",
            session_id=session_id,
            tool_name=tool_name,
            tool_args=tool_args,
            timestamp=start_time,
        )
        return start_time

    def log_tool_completion(
        self,
        session_id: str,
        tool_name: str,
        start_time: float,
        result: Any,
        status: str = "SUCCESS",
        error: Optional[str] = None,
    ) -> None:
        """Log the outcome and latency of an external tool call."""
        duration_ms = round((time.time() - start_time) * 1000, 2)
        log_payload = {
            "session_id": session_id,
            "tool_name": tool_name,
            "duration_ms": duration_ms,
            "status": status,
            "result_summary": str(result)[:300] if result is not None else None,
        }
        if error:
            log_payload["error"] = error
            self.logger.error("agent_tool_failed", **log_payload)
        else:
            self.logger.info("agent_tool_completed", **log_payload)

    def log_outcome(
        self,
        session_id: str,
        status: str,
        total_duration_ms: float,
        metrics: Optional[dict[str, Any]] = None,
        error: Optional[str] = None,
    ) -> None:
        """Log the final outcome of an agent reasoning loop."""
        payload = {
            "session_id": session_id,
            "status": status,
            "total_duration_ms": total_duration_ms,
            "metrics": metrics or {},
        }
        if error:
            payload["error"] = error
            self.logger.error("agent_execution_failed", **payload)
        else:
            self.logger.info("agent_execution_finished", **payload)
