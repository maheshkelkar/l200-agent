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

"""Unit tests for HistoryCompactor and context bloat management."""

from app.memory.compactor import HistoryCompactor


def test_history_compactor_no_op_below_threshold():
    """Verify compactor does not modify history when turn count is below threshold."""
    compactor = HistoryCompactor(max_turns_before_compaction=6, keep_recent_turns=2)
    turns = [
        {"role": "user", "content": "Analyze GOOGL Q2"},
        {"role": "model", "content": "Analyzing GOOGL Q2 financial metrics..."},
    ]
    summary, recent = compactor.compact_history(turns)
    assert summary == ""
    assert len(recent) == 2


def test_history_compactor_triggers_above_threshold():
    """Verify older turns are compacted into an executive summary."""
    compactor = HistoryCompactor(max_turns_before_compaction=4, keep_recent_turns=2)
    turns = [
        {"role": "user", "content": "What was Alphabet revenue in Q2 2024?"},
        {"role": "model", "content": "Alphabet revenue was $84.74B."},
        {"role": "user", "content": "What about Google Cloud segment revenue?"},
        {"role": "model", "content": "Google Cloud revenue reached $10.35B."},
        {"role": "user", "content": "Calculate the P/E ratio."},
        {"role": "model", "content": "Current P/E ratio is 25.0x."},
    ]
    summary, recent = compactor.compact_history(turns)
    assert len(recent) == 2
    assert "User inquired: What was Alphabet revenue" in summary
    assert "Google Cloud revenue reached $10.35B" in summary
    assert recent[0]["content"] == "Calculate the P/E ratio."
    assert recent[1]["content"] == "Current P/E ratio is 25.0x."
