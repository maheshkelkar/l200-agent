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

"""Human-In-The-Loop (HITL) Approval Mechanism.

Provides durable approval gates and confirmation checkpoints before executing
high-stakes actions (such as publishing reports, issuing investment ratings,
or automated notifications).
"""

from typing import Any, Optional
from pydantic import BaseModel

from app.observability.logger import AgentExecutionLogger
from app.observability.tracing import trace_span

logger = AgentExecutionLogger(agent_name="hitl_manager")


class ActionApprovalRequest(BaseModel):
    """Payload submitted for human confirmation."""

    action_id: str
    action_type: str  # e.g., 'PUBLISH_REPORT', 'CHANGE_RATING'
    symbol: str
    proposed_content: str
    confidence_score: float
    requires_explicit_approval: bool = True


class ActionApprovalResponse(BaseModel):
    """Response returned from human reviewer."""

    action_id: str
    is_approved: bool
    reviewer_comments: Optional[str] = None
    override_instructions: Optional[str] = None


class HITLApprovalGate:
    """Manages pause-and-resume human approval checkpoints."""

    def __init__(self):
        self._pending_approvals: dict[str, ActionApprovalRequest] = {}
        self._approved_actions: dict[str, ActionApprovalResponse] = {}

    def request_approval(self, request: ActionApprovalRequest) -> dict[str, Any]:
        """Register a pending approval gate for human inspection.

        Args:
            request: Action details requiring approval.

        Returns:
            Status dictionary indicating the action is paused awaiting sign-off.
        """
        with trace_span("hitl.request_approval", {"action_type": request.action_type, "symbol": request.symbol}):
            self._pending_approvals[request.action_id] = request
            logger.logger.info(
                "hitl_approval_requested",
                action_id=request.action_id,
                action_type=request.action_type,
                symbol=request.symbol,
            )
            return {
                "status": "AWAITING_HUMAN_APPROVAL",
                "action_id": request.action_id,
                "message": (
                    f"Action '{request.action_type}' for {request.symbol} is paused pending Human-In-The-Loop approval. "
                    "Review summary and confirm to proceed."
                ),
                "preview": request.proposed_content[:300],
            }

    def grant_approval(self, response: ActionApprovalResponse) -> bool:
        """Record human sign-off decision.

        Args:
            response: Reviewer decision.

        Returns:
            Boolean indicating whether action was approved.
        """
        with trace_span("hitl.grant_approval", {"action_id": response.action_id, "approved": response.is_approved}):
            self._approved_actions[response.action_id] = response
            if response.action_id in self._pending_approvals:
                del self._pending_approvals[response.action_id]

            logger.logger.info(
                "hitl_approval_resolved",
                action_id=response.action_id,
                is_approved=response.is_approved,
                comments=response.reviewer_comments,
            )
            return response.is_approved
