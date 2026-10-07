"""Read campaign progress without changing any experimental records."""
from collections import Counter
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import subprocess

OUT = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads(path.read_text())


def main():
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(minutes=3)
    result = {"at": now.isoformat(), "phq_complete": 0,
              "phq_by_patient": {}, "longitudinal_sessions": {},
              "longitudinal_turns": 0, "active_sessions": [],
              "recent_global_api_outcomes": {}, "processes": {}}
    for folder in sorted((OUT / "phq").iterdir()):
        if folder.is_dir():
            n = len(list(folder.glob("run_*/phq9.json")))
            result["phq_by_patient"][folder.name] = n
            result["phq_complete"] += n
    states = Counter()
    for path in (OUT / "longitudinal/results").glob("*/*/session_*/session.json"):
        session = read(path)
        states[session["status"]] += 1
        result["longitudinal_turns"] += len(session["turns"])
        if session["status"] != "completed":
            result["active_sessions"].append({"patient": session["patient_id"],
                                              "condition": session["condition"],
                                              "session": session["session_index"],
                                              "turns": len(session["turns"]),
                                              "status": session["status"]})
    result["longitudinal_sessions"] = dict(states)
    for name, path, script in [
        ("phq", OUT / "phq-campaign-status.json", "complete_phq9.py"),
        ("longitudinal", OUT / "longitudinal/status.json", "run_longitudinal.py"),
        ("observer", OUT / "completion-observer.json", "await_campaigns.py"),
    ]:
        if not path.exists():
            continue
        state = read(path)
        ps = subprocess.run(["ps", "-p", str(state["pid"]), "-o", "stat=", "-o", "command="],
                            text=True, capture_output=True)
        process_state = ps.stdout.strip().split(maxsplit=1)[0] if ps.stdout.strip() else None
        result["processes"][name] = {"pid": state["pid"], "status": state["status"],
                                     "alive": ps.returncode == 0 and script in ps.stdout,
                                     "process_state": process_state,
                                     "temporarily_suspended": bool(process_state and "T" in process_state)}
    records = list((OUT / "phq").glob("*/*/api_records.jsonl"))
    records += list((OUT / "longitudinal/results").glob("*/*/session_*/api_records.jsonl"))
    counts = Counter()
    for path in records:
        if path.stat().st_mtime < cutoff.timestamp():
            continue
        for line in path.read_text().splitlines():
            row = json.loads(line)
            if row.get("region") != "global" or row.get("event") == "request":
                continue
            if datetime.fromisoformat(row["timestamp"]) < cutoff:
                continue
            counts[row.get("error_type") or ("returned" if "response" in row else "other")] += 1
    result["recent_global_api_outcomes"] = dict(counts)
    temporary = OUT / "progress.tmp"
    temporary.write_text(json.dumps(result, indent=2) + "\n")
    temporary.replace(OUT / "progress.json")
    print(json.dumps(result))


if __name__ == "__main__":
    main()
