"""Verify the retained trajectory locally after completion or a stop."""
from collections import Counter
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import resume_integration as h

ROOT = Path(__file__).resolve().parent


def read(path):
    return json.loads(path.read_text())


def main():
    manifest = h.verify()
    runtime = ROOT / "runtime"
    h.verify_preserved_prefix(runtime)
    sessions = [read(p) for p in sorted(runtime.glob("sessions/session_*/session.json"))]
    ledger = read(runtime / h.LEDGER)["sessions"]
    assert len(sessions) == len(ledger)
    assert sessions[-1]["status"] in {"completed", "stopped"}
    total = 0
    for index, (saved, native) in enumerate(zip(sessions, ledger), 1):
        assert saved["session_id"] == native["session_id"] == f"memory_integration_s{index:02d}"
        assert len(saved["turns"]) == len(native["turns"])
        assert bool(native.get("ended_at")) == (saved["status"] == "completed")
        if saved["status"] == "completed":
            assert len(saved["turns"]) == 5
        for turn, row in zip(saved["turns"], native["turns"]):
            total += 1
            assert turn["total_turns"] == row["total_turns"] == total
            assert turn["patient_text"] == row["patient_response"]
            assert turn["therapist_text"] == row["therapist_input_raw"]
        if native["turns"]:
            assert native["final_state"]["total_turns"] == total
        else:
            assert native["final_state"] == {}
        if index > 1:
            restored, previous = saved["restored_before_first_request"], sessions[index - 2]
            assert restored["total_turns"] == (index - 1) * 5
            assert restored["summary"] == previous["persisted_summary"]
            assert restored["reflection"] == previous["persisted_reflection"]
            assert restored["memory_consolidation"] == previous["memory_consolidation"]
    recovered = sessions[10]["restored_before_resume"]
    assert recovered["total_turns"] == 51 and recovered["session_id"] == "memory_integration_s11"
    records = [json.loads(line) for line in (runtime / h.MEMORY).read_text().splitlines()]
    sources = [row for row in records if row["type"] == "conversation_turn"]
    assert len(sources) == total == len({row["id"] for row in sources})
    assert [row["turn_index"] for row in sources] == list(range(1, total + 1))
    turns = [t for s in sessions for t in s["turns"]]
    for source, turn in zip(sources, turns):
        assert source["patient_text"] == turn["patient_text"]
        assert source["therapist_text"] == turn["therapist_text"]
    excluded = [r for r in sources if not r["usable"]]
    assert {r["id"] for r in excluded} == {h.EXCLUDED_SOURCE_ID}
    processed = {sid for r in records if r["type"] == "fact_batch" for sid in r["source_ids"]}
    assert not processed.intersection(r["id"] for r in excluded)
    patched = sessions[-1].get("safety_module_loaded")
    assert patched and patched["sha256"] == h.original.digest(h.PATCHED_SAFETY)
    assert patched["loaded_before_graph"]
    if sessions[-1]["status"] == "completed":
        evidence = sessions[-1]["consolidation_evidence"]
        assert evidence["raw_source_turns"] == 5 and evidence["eligible_source_turns"] == 4
        assert sessions[-1]["memory_consolidation"]["source_turns"] == 4
    processes = [json.loads(line) for line in (runtime / "processes-safety-recall-fix.jsonl").read_text().splitlines()]
    assert processes[-1]["event"] == "exit"
    try:
        os.kill(processes[-1]["pid"], 0)
    except ProcessLookupError:
        worker_alive = False
    else:
        worker_alive = True
    assert not worker_alive
    benchmark = ROOT.parent.parent / "memory-benchmark-2026-09-28"
    snapshot = benchmark / "analysis/snapshots/final-20260928T152959Z"
    saved_manifest = read(snapshot / "snapshot-manifest.json")
    for name, sha in saved_manifest["completed_artifacts"].items():
        assert h.original.digest(benchmark / name) == sha, name
    snapshot_counts = {}
    snapshots = [snapshot, ROOT.parent / "analysis/snapshots/stop-20260928T155256Z",
                 ROOT.parent / "resume-01/snapshots/stop-20260928T165615Z",
                 ROOT.parent / "resume-02/snapshots/stop-20260928T181841Z",
                 ROOT.parent / "resume-03/snapshots/stop-20260928T201515Z"]
    for directory in snapshots:
        snapshot_manifest = read(directory / "snapshot-manifest.json")
        for name, sha in snapshot_manifest["copied_files"].items():
            assert h.original.digest(directory / name) == sha, name
        snapshot_counts[str(directory)] = len(snapshot_manifest["copied_files"])
    metrics = read(ROOT / "results.json")
    assert metrics["requests_after_first_new_fatal"] == 0
    result = {"timestamp": datetime.now(timezone.utc).isoformat(), "status": "verified",
              "original_frozen_files": 35, "preceding_amendment_files": 12, "current_amendment_files": 5,
              "previous_runtime_files": len(manifest["original_runtime_files"]),
              "prior_archived_turns_preserved": 51, "prior_closed_sessions_preserved": 10,
              "completed_sessions": sum(s["status"] == "completed" for s in sessions),
              "fresh_process_restorations_verified": len(sessions) - 1,
              "archived_turns": total, "unique_raw_sources": len(sources),
              "memory_record_counts": dict(Counter(r["type"] for r in records)),
              "previous_completed_artifacts_unchanged": len(saved_manifest["completed_artifacts"]),
              "snapshot_files_unchanged": snapshot_counts, "requests_after_new_fatal": 0,
              "last_worker_alive": worker_alive}
    (ROOT / "integrity-check.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result))


if __name__ == "__main__":
    main()
