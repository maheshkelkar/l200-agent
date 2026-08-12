#!/usr/bin/env python3
"""Interactive Client for Financial Research Agent.

Formats responses with clean Markdown formatting without exposing raw JSON/logs.
"""

import os
import json
import sys
import time
import uuid
import argparse
import urllib.request
import urllib.error
import subprocess

def get_auth_token():
    """Fetches identity token using gcloud ADC."""
    try:
        token = subprocess.check_output(
            ["gcloud", "auth", "print-identity-token"],
            text=True
        ).strip()
        return token
    except Exception:
        return None

def run_agent_query(service_url: str, prompt: str, session_id: str = None):
    """Creates session and streams executive response from Cloud Run agent."""
    if not session_id:
        session_id = f"session_{int(time.time())}_{uuid.uuid4().hex[:6]}"

    token = get_auth_token()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    # 1. Ensure Session Exists
    session_url = f"{service_url.rstrip('/')}/apps/app/users/user/sessions"
    req_session = urllib.request.Request(
        session_url,
        data=json.dumps({"session_id": session_id}).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    try:
        with urllib.request.urlopen(req_session) as resp:
            pass
    except urllib.error.HTTPError as e:
        if e.code not in (200, 409):
            print(f"⚠️ Session initialization note: HTTP {e.code}")

    # 2. Execute Query
    run_url = f"{service_url.rstrip('/')}/run_sse"
    payload = {
        "app_name": "app",
        "user_id": "user",
        "session_id": session_id,
        "new_message": {
            "role": "user",
            "parts": [{"text": prompt}]
        }
    }
    req_run = urllib.request.Request(
        run_url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST"
    )

    print(f"\n📊 [Financial Research Agent | Session: {session_id}]")
    print(f"   Request: '{prompt}'\n" + "="*70 + "\n")

    full_response = []
    try:
        with urllib.request.urlopen(req_run) as resp:
            for line in resp:
                line_str = line.decode("utf-8").strip()
                if line_str.startswith("data: "):
                    try:
                        data = json.loads(line_str[6:])
                        content = data.get("content", {})
                        parts = content.get("parts", [])
                        for part in parts:
                            if "text" in part:
                                text_chunk = part["text"]
                                print(text_chunk, end="", flush=True)
                                full_response.append(text_chunk)
                    except json.JSONDecodeError:
                        pass
        print("\n" + "="*70 + "\n✅ Analysis Complete.")
    except urllib.error.HTTPError as e:
        print(f"❌ Error communicating with agent (HTTP {e.code}): {e.read().decode('utf-8')}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Query the Deployed Financial Agent")
    parser.add_argument("prompt", nargs="?", default="What is Alphabet (GOOGL) Q2 2024 revenue?", help="Prompt for agent")
    parser.add_argument("--url", default=os.getenv("CLOUD_RUN_URL", "http://localhost:8080"), help="Cloud Run Service or local Gateway URL (defaults to CLOUD_RUN_URL env or http://localhost:8080)")
    parser.add_argument("--session", default=None, help="Custom Session ID for multi-turn thread continuation")
    parser.add_argument("--continue-session", action="store_true", help="Continue using the default persistent session")
    args = parser.parse_args()

    session_id = args.session
    if args.continue_session and not session_id:
        session_id = "default_session"

    run_agent_query(args.url, args.prompt, session_id=session_id)
