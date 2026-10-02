"""Two small capacity probes, excluded from all experimental datasets."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import json
from pathlib import Path
import time

from dotenv import dotenv_values
from google.auth.transport.requests import AuthorizedSession
from google.oauth2.service_account import Credentials

ROOT = Path(__file__).resolve().parent
AGENT = Path("/Users/marco/Sites/LLMPatients-Agent")
BODY = {"contents": [{"role": "user", "parts": [{"text": "Reply with only OK."}]}],
        "generationConfig": {"temperature": 0, "maxOutputTokens": 512}}


def probe(region):
    credentials = Credentials.from_service_account_file(
        AGENT / "config/vertex-ai-api-key.json", scopes=["https://www.googleapis.com/auth/cloud-platform"]
    )
    config = dotenv_values(AGENT / "config/.env")
    project = config.get("GCP_PROJECT") or credentials.project_id
    host = "aiplatform.googleapis.com" if region == "global" else f"{region}-aiplatform.googleapis.com"
    url = f"https://{host}/v1/projects/{project}/locations/{region}/publishers/google/models/gemini-2.5-pro:generateContent"
    result = {"region": region, "host": host, "model_id": "gemini-2.5-pro",
              "started_at": datetime.now(timezone.utc).isoformat(), "request_body": BODY,
              "excluded_from_experiments": True}
    started = time.monotonic()
    with AuthorizedSession(credentials) as session:
        try:
            response = session.post(url, json=BODY, timeout=40)
            result["http_status"] = response.status_code
            result["body"] = response.json()
        except Exception as exc:
            result.update(error_type=type(exc).__name__, error=str(exc))
    result["elapsed_seconds"] = time.monotonic() - started
    return result


if __name__ == "__main__":
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(probe, ["us-central1", "global"]))
    (ROOT / "vertex-capacity-diagnostic.json").write_text(json.dumps(results, indent=2) + "\n")
    for result in results:
        print(json.dumps({k: result.get(k) for k in ["region", "http_status", "elapsed_seconds", "error_type"]}))
