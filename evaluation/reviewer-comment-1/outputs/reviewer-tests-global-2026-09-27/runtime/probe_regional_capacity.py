"""One nonclinical capacity request, never included in experimental results."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess
import time

from dotenv import dotenv_values
from google.auth.transport.requests import AuthorizedSession
from google.oauth2.service_account import Credentials

OUT = Path(__file__).resolve().parents[1]
AGENT = Path("/Users/marco/Sites/LLMPatients-Agent")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--region", choices=["europe-west4", "global", "us-central1"],
                        default="europe-west4")
    args = parser.parse_args()
    blocker = json.loads((OUT / "runtime/capacity-blocker.json").read_text())
    assert datetime.now(timezone.utc) >= datetime.fromisoformat(blocker["next_check_no_earlier_than"])
    for pid in blocker["inference_processes_suspended"]:
        state = subprocess.run(["ps", "-p", str(pid), "-o", "stat="],
                               capture_output=True, text=True)
        assert state.returncode == 0 and "T" in state.stdout, f"Study process {pid} is not confirmed suspended"
    credentials = Credentials.from_service_account_file(
        AGENT / "config/vertex-ai-api-key.json",
        scopes=["https://www.googleapis.com/auth/cloud-platform"],
    )
    project = dotenv_values(AGENT / "config/.env").get("GCP_PROJECT") or credentials.project_id
    host = "aiplatform.googleapis.com" if args.region == "global" else f"{args.region}-aiplatform.googleapis.com"
    url = f"https://{host}/v1/projects/{project}/locations/{args.region}/publishers/google/models/gemini-2.5-pro:generateContent"
    labels = " ".join(f"label_{index:04d}" for index in range(400))
    prompt = "This is a nonclinical service-capacity diagnostic. Ignore the following labels and reply only OK.\n" + labels
    body = {"contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.7, "maxOutputTokens": 4096,
                                 "topP": 0.95, "topK": 40,
                                 "stopSequences": ["\nTherapist:", "Therapist:"]}}
    now = datetime.now(timezone.utc)
    result = {"started_at": now.isoformat(), "region": args.region,
              "model_id": "gemini-2.5-pro", "request_body": body,
              "configured_project_matches_credential_project": project == credentials.project_id,
              "excluded_from_experiments": True, "clinical_content": False,
              "diagnostic_output_not_used_in_scores": True,
              "script_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              "generation_config_basis": "Same requested initial generation parameters as the longitudinal patient call; artificial context only. Default REST safety settings, not a complete scientific-request replica.",
              "interpretation_limit": "A successful diagnostic proves one request worked; it does not establish sustained capacity or authorize pooling a new endpoint without an amendment."}
    started = time.monotonic()
    with AuthorizedSession(credentials) as session:
        try:
            response = session.post(url, json=body, timeout=40)
            result["http_status"] = response.status_code
            result["response_headers"] = {key: response.headers[key] for key in ("date", "retry-after") if key in response.headers}
            result["response"] = response.json()
        except Exception as exc:
            result.update(error_type=type(exc).__name__, error=str(exc))
    result["elapsed_seconds"] = time.monotonic() - started
    directory = OUT / "runtime/capacity-probes"
    directory.mkdir(exist_ok=True)
    path = directory / f"{args.region}-{now.strftime('%Y%m%dT%H%M%S')}.json"
    path.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({"artifact": str(path.relative_to(OUT)), "region": args.region,
                      "http_status": result.get("http_status"),
                      "error_type": result.get("error_type"),
                      "elapsed_seconds": result["elapsed_seconds"],
                      "model_version": result.get("response", {}).get("modelVersion")}))


if __name__ == "__main__":
    main()
