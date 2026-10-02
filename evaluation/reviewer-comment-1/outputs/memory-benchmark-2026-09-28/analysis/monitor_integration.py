"""Observe integration files only; never create a runtime or send requests."""
from collections import Counter
from datetime import datetime, timezone
import fcntl
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
runtime = ROOT / "integration/runtime"


def journal(path):
    if not path.exists():
        return []
    with path.open() as stream:
        fcntl.flock(stream.fileno(), fcntl.LOCK_SH)
        rows = [json.loads(line) for line in stream if line.strip()]
        fcntl.flock(stream.fileno(), fcntl.LOCK_UN)
    return rows


sessions = [json.loads(path.read_text()) for path in sorted(runtime.glob("sessions/session_*/session.json"))]
native = [row for path in sorted(runtime.glob("sessions/session_*/openrouter-api-records.jsonl")) for row in journal(path)]
processes = journal(runtime / "processes.jsonl")
last_process = processes[-1] if processes else {}
alive = False
if last_process.get("event") == "start":
    try:
        os.kill(last_process["pid"], 0)
        alive = True
    except ProcessLookupError:
        pass
counts = Counter(row["event"] for row in native)
snapshot = {"timestamp": datetime.now(timezone.utc).isoformat(), "started": runtime.exists(),
            "worker_alive": alive, "session": sessions[-1]["session_index"] if sessions else None,
            "session_status": sessions[-1]["status"] if sessions else None,
            "completed_sessions": sum(row["status"] == "completed" for row in sessions),
            "observed_turns": sum(len(row["turns"]) for row in sessions),
            "requests": counts["request"], "responses": counts["response"],
            "native_errors": sum(value for key, value in counts.items() if key not in {"request", "response"}),
            "last_native_at": native[-1].get("timestamp") if native else None,
            "last_native_event": native[-1]["event"] if native else None}
if runtime.exists():
    with (ROOT / "analysis/integration-monitoring.jsonl").open("a") as stream:
        stream.write(json.dumps(snapshot) + "\n")
print(json.dumps(snapshot))
