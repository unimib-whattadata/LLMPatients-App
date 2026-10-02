"""Copy verified, generation-only materials; freeze only after offline verification.

No provider imports or calls. Existing inputs and completed evidence are read-only.
"""
from __future__ import annotations

import argparse
import difflib
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
PLAN = HERE.parent / "memory-comparison-plan-2026-09-28"
PRIOR = HERE.parent / "memory-integration-fix-2026-09-28"


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def put(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(data, dict):
        data = (json.dumps(data, ensure_ascii=False, indent=2) + "\n").encode()
    if path.exists():
        if path.read_bytes() != data:
            raise RuntimeError(f"Refusing to overwrite different prepared input: {path.name}")
        return
    with path.open("xb") as stream:
        stream.write(data)


def verify_originals():
    plan = read_json(PLAN / "package-manifest.json")
    for name, expected in plan["files"].items():
        if digest(PLAN / name) != expected:
            raise RuntimeError(f"Frozen plan changed: {name}")
    for name, expected in plan["original_inputs"].items():
        if digest(REPO / name) != expected:
            raise RuntimeError(f"Frozen original input changed: {name}")
    prior = read_json(PRIOR / "integration/manifest.json")
    for name, expected in prior["files"].items():
        if digest(PRIOR / name) != expected:
            raise RuntimeError(f"Frozen native source changed: {name}")
    patched = PRIOR / "safety-recall-fix/source/agent/core/safety.py"
    if digest(patched) != "da78bc9205129b4b40f833e8988a0610b302cbefdd6cd90c4cb7ea9909fe3006":
        raise RuntimeError("Previously verified recall safety correction changed")
    return plan, prior


def prepare():
    _, prior = verify_originals()
    copied = {}
    for name, expected in prior["files"].items():
        if name.startswith("integration/source/"):
            dest = HERE / name.removeprefix("integration/")
            source = PRIOR / name
            if name.endswith("/core/safety.py"):
                source = PRIOR / "safety-recall-fix/source/agent/core/safety.py"
            put(dest, source.read_bytes())
            copied[str(dest.relative_to(HERE))] = {"source": str(source.relative_to(REPO)),
                                                   "sha256": digest(source)}
    profiles = read_json(PLAN / "design/profile-manifest.json")["profiles"]
    routing = {}
    for row in profiles:
        profile_id = row["profile_id"]
        # The native resolver uses the incoming API ID as filename. Copy the
        # identical YAML under its archived external ID; never edit its bytes.
        native_id = row["archived_external_patient_id"]
        filename = f"source/data/patients/{native_id}.yaml"
        put(HERE / filename, (REPO / row["source"]).read_bytes())
        copied[filename] = {"source": row["source"], "sha256": row["source_sha256"]}
        put(HERE / "generation" / row["case_path"],
            (PLAN / "design" / row["case_path"]).read_bytes())
        scenario_path = f"scenarios/{profile_id}.json"
        # Strip evaluative annotations from the generation-only scenario.
        scenario = read_json(PLAN / "design" / scenario_path)
        clean = {"profile_id": profile_id, "sessions": [
            {"session_index": item["session_index"], "turns": [
                {"turn_id": t["turn_id"], "text": t["text"]} for t in item["turns"]]}
            for item in scenario["sessions"]]}
        put(HERE / "generation" / scenario_path, clean)
        routing[profile_id] = {"profile_id": profile_id, "native_api_id": native_id,
                               "archived_patient_id": row["archived_patient_id"],
                               "profile_path": filename, "source_yaml_sha256": row["source_sha256"]}
    put(HERE / "generation/routing.json", routing)
    matrix = read_json(PLAN / "design/run-matrix.json")
    allowed = ("run_id", "pair_id", "profile_id", "repetition", "arm", "case_path", "case_sha256",
               "scenario_path", "sessions", "therapist_turns")
    for row in matrix["runs"]:
        clean = {key: row[key] for key in allowed}
        clean.update(routing[row["profile_id"]])
        put(HERE / "generation/runs" / f"{row['run_id']}.json", clean)
    put(HERE / "generation/schedule.json", (PLAN / "design/schedule.json").read_bytes())
    put(HERE / "prompt_contract.py", (PLAN / "design/prompt_contract.py").read_bytes())
    for name in ("openrouter_transport.py", "openrouter_inband_errors.py"):
        data = (PRIOR / "scripts" / name).read_bytes()
        if name == "openrouter_transport.py":
            if data.count(b'"allow_fallbacks": True') != 1:
                raise RuntimeError("Unexpected transport fallback configuration")
            data = data.replace(b'"allow_fallbacks": True', b'"allow_fallbacks": False')
        put(HERE / name, data)
    old = (PRIOR / "scripts/openrouter_transport.py").read_text().splitlines(True)
    new = (HERE / "openrouter_transport.py").read_text().splitlines(True)
    put(HERE / "transport.diff", "".join(difflib.unified_diff(old, new,
        fromfile="frozen-prior/openrouter_transport.py", tofile="current/openrouter_transport.py")).encode())
    put(HERE / "input-provenance.json", {
        "plan_manifest_sha256": digest(PLAN / "package-manifest.json"),
        "native_manifest_sha256": digest(PRIOR / "integration/manifest.json"),
        "native_files": copied,
        "changes": ["Previously verified recall safety correction from first turn",
                    "Native common-profile renderer installed before graph compilation",
                    "Explicit native filename aliases using original external IDs; YAML bytes unchanged",
                    "OpenRouter allow_fallbacks=false; complete request bodies archived"],
        "worker_materials": "generation/ has no gold, evaluation fields or answers"})
    return {"status": "materials_copied", "profiles": len(routing), "trajectories": len(matrix["runs"])}


def execution_files():
    roots = (HERE / "source", HERE / "generation")
    paths = [p for root in roots for p in root.rglob("*") if p.is_file()]
    paths += list(HERE.glob("*.py"))
    paths += [HERE / "input-provenance.json", HERE / "transport.diff", HERE / "IMPLEMENTATION.md",
              HERE / "EXPORT_INTERFACE.md", HERE / "dependency-versions.json"]
    return sorted(p for p in paths if "__pycache__" not in p.parts)


def freeze():
    verify_originals()
    if (HERE / "manifest.json").exists():
        return verify()
    if (HERE / "runtime/launch.json").exists():
        raise RuntimeError("Cannot freeze code after live launch")
    checks = read_json(HERE / "offline-checks/results.json")
    if checks.get("status") != "passed" or checks.get("live_requests") != 0:
        raise RuntimeError("Offline gate has not passed")
    files = {str(p.relative_to(HERE)): digest(p) for p in execution_files()}
    if checks.get("execution_files") != files:
        raise RuntimeError("Code or material changed since offline verification")
    data = {"schema_version": 1, "status": "OFFLINE_VERIFIED_READY_FOR_EXECUTION",
            "frozen_at": datetime.now(timezone.utc).isoformat(), "live_requests_at_freeze": 0,
            "plan_path": str(PLAN.relative_to(REPO)),
            "plan_manifest_sha256": digest(PLAN / "package-manifest.json"),
            "offline_results_sha256": digest(HERE / "offline-checks/results.json"),
            "files": files,
            "worker_gold_access": "No gold content or path passed to workers; manifest hashes are not answers",
            "credentials": "Read by transport at invocation only; never embedded in source or manifest"}
    put(HERE / "manifest.json", data)
    return {"status": data["status"], "files": len(files)}


def verify(*, worker=False):
    manifest = read_json(HERE / "manifest.json")
    if not worker:
        verify_originals()
        if digest(PLAN / "package-manifest.json") != manifest["plan_manifest_sha256"]:
            raise RuntimeError("Execution points to a changed plan manifest")
        if digest(HERE / "offline-checks/results.json") != manifest["offline_results_sha256"]:
            raise RuntimeError("Offline verification evidence changed")
    actual = {str(p.relative_to(HERE)): digest(p) for p in execution_files()}
    if actual != manifest["files"]:
        raise RuntimeError("Execution inputs changed or unexpected source was added after freeze")
    return {"status": "verified", "files": len(actual)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("prepare", "freeze", "verify"))
    args = parser.parse_args()
    print(json.dumps({"prepare": prepare, "freeze": freeze, "verify": verify}[args.command](), indent=2))
