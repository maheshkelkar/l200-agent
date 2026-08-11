FROM python:3.12-slim

RUN pip install --no-cache-dir uv==0.8.13

WORKDIR /code

COPY ./pyproject.toml ./README.md ./
COPY ./app ./app
COPY ./frontend/dist ./frontend/dist

RUN UV_DEFAULT_INDEX=https://pypi.org/simple uv sync --no-dev

ARG AGENT_VERSION=0.0.0
ENV AGENT_VERSION=${AGENT_VERSION}
ENV GOOGLE_CLOUD_LOCATION=global

EXPOSE 8080

CMD ["uv", "run", "uvicorn", "app.fast_api_app:app", "--host", "0.0.0.0", "--port", "8080"]
