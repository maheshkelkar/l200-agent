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

"""PII and Secret Redaction Engine for Observability and Tracing.

Scans structured payloads, log messages, and trace attributes to sanitize
sensitive data (API keys, SSNs, credit cards, emails, auth headers) before
persisting to Cloud Logging and Cloud Trace.
"""

import re
from typing import Any

# Regular expressions for sensitive PII and credential patterns
PATTERNS = {
    "api_key": re.compile(r"(?i)(api[_-]?key|secret|token|password|auth[_-]?token)[\"':=\s]+([a-zA-Z0-9_\-\.]{12,})"),
    "bearer_token": re.compile(r"(?i)bearer\s+([a-zA-Z0-9_\-\.]{16,})"),
    "ssn": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    "credit_card": re.compile(r"\b(?:\d{4}[ -]?){3}\d{4}\b"),
    "email": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b"),
    "jwt": re.compile(r"eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+"),
}


def redact_text(text: str) -> str:
    """Scrub PII and sensitive tokens from string content.

    Args:
        text: Input string potentially containing sensitive credentials or PII.

    Returns:
        Sanitized string with sensitive tokens replaced with redaction masks.
    """
    if not isinstance(text, str):
        return text

    sanitized = text
    # Mask API keys and secrets
    sanitized = PATTERNS["api_key"].sub(r"\1: [REDACTED_SECRET]", sanitized)
    sanitized = PATTERNS["bearer_token"].sub("Bearer [REDACTED_TOKEN]", sanitized)
    sanitized = PATTERNS["jwt"].sub("[REDACTED_JWT]", sanitized)
    sanitized = PATTERNS["ssn"].sub("[REDACTED_SSN]", sanitized)
    sanitized = PATTERNS["credit_card"].sub("[REDACTED_CREDIT_CARD]", sanitized)
    sanitized = PATTERNS["email"].sub("[REDACTED_EMAIL]", sanitized)

    return sanitized


def redact_data(data: Any) -> Any:
    """Recursively traverse dictionaries, lists, and primitives to sanitize PII.

    Args:
        data: Arbitrary Python object (dict, list, string, number, etc.)

    Returns:
        Sanitized copy of the data structure.
    """
    if isinstance(data, str):
        return redact_text(data)
    elif isinstance(data, dict):
        sanitized_dict = {}
        for key, value in data.items():
            # If the key itself indicates a sensitive credential, mask completely
            if any(s in key.lower() for s in ["key", "secret", "token", "password", "auth", "credential"]):
                sanitized_dict[key] = "[REDACTED_SECRET]"
            else:
                sanitized_dict[key] = redact_data(value)
        return sanitized_dict
    elif isinstance(data, list):
        return [redact_data(item) for item in data]
    elif isinstance(data, tuple):
        return tuple(redact_data(item) for item in data)
    elif isinstance(data, set):
        return {redact_data(item) for item in data}
    return data
