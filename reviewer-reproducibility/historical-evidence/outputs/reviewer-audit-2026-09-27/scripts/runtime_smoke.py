"""Minimal real HTTP check; all artifacts under /tmp, synthetic patient only."""
import json
import time
import urllib.error
import urllib.request
from pathlib import Path

OUT = Path("/tmp/llmpatient-reviewer-audit")
BASE = "http://127.0.0.1:8000"

def request(label, path, payload=None):
    start = time.monotonic()
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(BASE + path, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=100) as response:
            status = response.status
            raw = response.read().decode()
    except urllib.error.HTTPError as error:
        status, raw = error.code, error.read().decode()
    except Exception as error:
        status, raw = None, str(error)
    try:
        body = json.loads(raw)
    except (ValueError, TypeError):
        body = raw
    record = {"label": label, "path": path, "request": payload, "status": status,
              "elapsed_seconds": round(time.monotonic() - start, 3), "body": body}
    (OUT / (label + ".json")).write_text(json.dumps(record, indent=2))
    print(label, status, record["elapsed_seconds"], flush=True)
    return record

request("runtime_wrong_patient_plural", "/patients", {})
request("runtime_wrong_initialise_patient", "/initialise-patient", {})
request("runtime_existing_patient", "/patient", {
    "id": "daniel_isherwood_001", "name": "Daniel Isherwood", "age": 32,
    "gender": "male", "diagnosis": "audit", "difficulty_level": 1,
    "psychological_profile": "audit", "background": "audit",
    "session_id": "audit-runtime-20260927"
})
turn = request("runtime_chat", "/chat-response", {
    "external_patient_id": "daniel_isherwood_001",
    "user_message": "Hi, how are you?",
    "session_id": "audit-runtime-20260927",
    "step_id": 1,
    "therapist_id": "audit_runtime_20260927"
})
if turn["status"] == 200:
    request("runtime_session_end", "/session-end", {
        "external_patient_id": "daniel_isherwood_001",
        "session_id": "audit-runtime-20260927",
        "therapist_id": "audit_runtime_20260927"
    })
