"""Observe the live run without sending requests or changing its checkpoints."""
from collections import Counter
from datetime import datetime, timezone
import fcntl
import json
import os
from pathlib import Path

root = Path(__file__).resolve().parents[1] / "run"
status = json.loads((root / "status.json").read_text())
alive = None
if status.get("controller_pid"):
    try:
        os.kill(status["controller_pid"], 0)
        alive = True
    except ProcessLookupError:
        alive = False
with (root / "native.jsonl").open() as stream:
    fcntl.flock(stream.fileno(), fcntl.LOCK_SH)
    records = [json.loads(line) for line in stream if line.strip()]
    fcntl.flock(stream.fileno(), fcntl.LOCK_UN)
counts = Counter(row["event"] for row in records)
snapshot = {"timestamp": datetime.now(timezone.utc).isoformat(), "controller_alive": alive,
            "status": status["status"], "patient": status.get("patient_id"),
            "stage": status.get("stage"), "session_index": status.get("session_index"),
            "requests": counts["request"], "responses": counts["response"],
            "native_errors": sum(n for kind, n in counts.items() if kind not in {"request", "response"}),
            "completed_sessions": len(list(root.glob("*/sessions/*.json"))),
            "answers": len(list(root.glob("*/answers/*.json"))),
            "last_native_event": records[-1]["event"], "last_native_at": records[-1]["timestamp"]}
with (root / "monitoring.jsonl").open("a") as stream:
    stream.write(json.dumps(snapshot) + "\n")
print(json.dumps(snapshot))
