"""Read local experiment progress. Does not load a provider or generate content."""
from collections import Counter
from datetime import datetime, timezone
import fcntl
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
RUNTIME = HERE / "runtime"


def rows(path):
    if not path.exists():
        return []
    with path.open() as stream:
        fcntl.flock(stream.fileno(), fcntl.LOCK_SH)
        result = [json.loads(line) for line in stream if line.strip()]
    return result


def observe():
    sessions = [json.loads(p.read_text()) for p in sorted(RUNTIME.glob("sessions/session_*/session.json"))]
    native = [row for path in sorted(RUNTIME.glob("sessions/session_*/openrouter-api-records.jsonl")) for row in rows(path)]
    launch = json.loads((HERE / "launch.json").read_text()) if (HERE / "launch.json").exists() else {}
    fresh = [row for row in native if row["timestamp"] > launch.get("started_at", "9999")]
    counts, new_counts = Counter(r["event"] for r in native), Counter(r["event"] for r in fresh)
    snapshot = {"timestamp": datetime.now(timezone.utc).isoformat(),
                "completed_sessions": sum(row["status"] == "completed" for row in sessions),
                "archived_turns": sum(len(row["turns"]) for row in sessions),
                "latest_session": sessions[-1]["session_index"] if sessions else None,
                "latest_status": sessions[-1]["status"] if sessions else None,
                "memory_status_counts": dict(Counter(row.get("memory_status") for row in sessions if row["status"] == "completed")),
                "cumulative_native_events": dict(counts), "new_native_events": dict(new_counts),
                "last_event": fresh[-1]["event"] if fresh else None,
                "last_event_at": fresh[-1]["timestamp"] if fresh else None,
                "stop_receipt": (RUNTIME / "STOP").exists()}
    if RUNTIME.exists():
        with (HERE / "observations.jsonl").open("a") as stream:
            stream.write(json.dumps(snapshot) + "\n")
    return snapshot


if __name__ == "__main__":
    print(json.dumps(observe()))
