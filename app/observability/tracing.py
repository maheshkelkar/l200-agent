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

"""Distributed Tracing setup using OpenTelemetry and Google Cloud Trace.

Provides trace spans for agent workflows, coordinator routing, sub-agent
delegations, tool calls, and LLM inferences.
"""

import contextlib
from typing import Any, Iterator, Optional

from opentelemetry import trace
from opentelemetry.exporter.cloud_trace import CloudTraceSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.trace import Status, StatusCode, Tracer

from app.config import get_settings
from app.observability.redaction import redact_data


_TRACER: Optional[Tracer] = None


def setup_tracing(
    service_name: str = "financial-research-agent",
    project_id: Optional[str] = None,
    export_to_cloud: bool = True,
) -> Tracer:
    """Initialize OpenTelemetry TracerProvider with Cloud Trace exporter.

    Args:
        service_name: Name identifying the service in Cloud Trace.
        project_id: GCP project ID.
        export_to_cloud: If True, exports to Cloud Trace; otherwise console.

    Returns:
        OpenTelemetry Tracer instance.
    """
    global _TRACER
    if _TRACER is not None:
        return _TRACER

    settings = get_settings()
    proj_id = project_id or settings.project_id

    resource = Resource.create(
        {
            "service.name": service_name,
            "service.namespace": "ai.agent.financial",
            "gcp.project_id": proj_id,
        }
    )

    provider = TracerProvider(resource=resource)

    if export_to_cloud and settings.enable_cloud_trace:
        try:
            cloud_exporter = CloudTraceSpanExporter(project_id=proj_id)
            provider.add_span_processor(BatchSpanProcessor(cloud_exporter))
        except Exception:
            # Fallback to local console span exporter if Cloud Trace is not permitted
            provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
    else:
        provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))

    trace.set_tracer_provider(provider)
    _TRACER = trace.get_tracer(service_name)
    return _TRACER


def get_tracer() -> Tracer:
    """Get the current tracer instance, initializing if needed."""
    global _TRACER
    if _TRACER is None:
        _TRACER = setup_tracing()
    return _TRACER


@contextlib.contextmanager
def trace_span(
    name: str,
    attributes: Optional[dict[str, Any]] = None,
) -> Iterator[trace.Span]:
    """Context manager for tracing operations with automatic PII sanitization.

    Args:
        name: Name of the trace span.
        attributes: Key-value attributes to attach to the span.

    Yields:
        Active OpenTelemetry Span.
    """
    tracer = get_tracer()
    with tracer.start_as_current_span(name) as span:
        if attributes:
            clean_attrs = redact_data(attributes)
            for k, v in clean_attrs.items():
                if isinstance(v, (bool, str, bytes, int, float)):
                    span.set_attribute(k, v)
                else:
                    span.set_attribute(k, str(v))
        try:
            yield span
            span.set_status(Status(StatusCode.OK))
        except Exception as e:
            span.record_exception(e)
            span.set_status(Status(StatusCode.ERROR, str(e)))
            raise
