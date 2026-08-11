import subprocess
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="Cloud Run Auth Gateway Proxy")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CLOUD_RUN_URL = "https://financial-agent-120662768527.us-east1.run.app"
CLOUD_RUN_HOST = "financial-agent-120662768527.us-east1.run.app"

def get_auth_token() -> str:
    try:
        return subprocess.check_output(
            ["gcloud", "auth", "print-identity-token"],
            stderr=subprocess.DEVNULL
        ).decode().strip()
    except Exception as e:
        print(f"Error fetching token: {e}")
        return ""

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"])
async def proxy_all(request: Request, path: str):
    token = get_auth_token()
    target_url = f"{CLOUD_RUN_URL}/{path}"
    
    # Prepare forward headers
    req_headers = {}
    for k, v in request.headers.items():
        if k.lower() not in ["host", "content-length", "authorization"]:
            req_headers[k] = v
    req_headers["host"] = CLOUD_RUN_HOST
    if token:
        req_headers["Authorization"] = f"Bearer {token}"

    body = await request.body()
    client = httpx.AsyncClient(timeout=180.0, follow_redirects=True)
    
    try:
        req = client.build_request(
            method=request.method,
            url=target_url,
            headers=req_headers,
            content=body,
            params=dict(request.query_params),
        )
        res = await client.send(req, stream=True)

        resp_headers = {}
        for k, v in res.headers.items():
            if k.lower() not in ["content-length", "content-encoding", "transfer-encoding"]:
                resp_headers[k] = v

        return StreamingResponse(
            res.aiter_raw(),
            status_code=res.status_code,
            headers=resp_headers,
            background=client.aclose,
        )
    except Exception as e:
        await client.aclose()
        return StreamingResponse(
            iter([f"Proxy error: {str(e)}".encode()]),
            status_code=502,
        )

if __name__ == "__main__":
    print("🚀 Cloud Run Auth Gateway starting on http://0.0.0.0:8000 ...")
    print(f"Forwarding to {CLOUD_RUN_URL}")
    uvicorn.run(app, host="0.0.0.0", port=8000)
