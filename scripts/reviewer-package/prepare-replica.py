#!/usr/bin/env python3
"""Prepare a fresh pilot work directory, without credentials or network calls.

Original frozen files are hash-checked and copied; only declared machine paths
in a new state-pilot config are rebased. The historical archive is never edited.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def relative_file(root: Path, name: str) -> Path:
    relative = Path(name)
    if relative.is_absolute() or ".." in relative.parts:
        raise ValueError(f"Unsafe manifest path: {name}")
    path = root / relative
    if path.is_symlink() or not path.is_file():
        raise ValueError(f"Expected a regular frozen file: {name}")
    if not path.resolve().is_relative_to(root.resolve()):
        raise ValueError(f"Manifest path leaves source directory: {name}")
    return path


def prepare(args: argparse.Namespace) -> dict:
    source = args.source_root.resolve()
    frozen_root = source / "continuations/tls-ca-01" if args.kind == "structure" else source
    freeze_path = frozen_root / "FREEZE.json"
    original = json.loads(freeze_path.read_text())
    if not isinstance(original.get("files"), dict) or not original["files"]:
        raise ValueError("Missing frozen file inventory")
    copied = {}
    for name, expected in original["files"].items():
        path = relative_file(frozen_root, name)
        if digest(path) != expected:
            raise ValueError(f"Original frozen hash mismatch: {name}")
        copied[name] = path

    destination = args.destination.resolve()
    if destination.exists():
        raise ValueError("Destination must not exist; accepted results are never overwritten")
    if destination.is_relative_to(source):
        raise ValueError("Choose a scratch destination outside the original family")

    overrides = {}
    model_checks = {}
    interpreter_version = None
    if args.kind == "state":
        if args.embedding_snapshot is None or args.site_packages is None:
            raise ValueError("State replay requires --embedding-snapshot and --site-packages")
        embedding = args.embedding_snapshot.resolve()
        sites = args.site_packages.resolve()
        overlay = (args.scipy_overlay or args.site_packages).resolve()
        for path in [embedding, sites, overlay]:
            if not path.is_dir():
                raise ValueError(f"Dependency directory does not exist: {path}")
        manifest = json.loads((frozen_root / "source/embedding-source-manifest.json").read_text())
        for name, expected in manifest["files"].items():
            # Hugging Face snapshots use symlinks to their local blob store.
            path = embedding / name
            if not path.is_file() or digest(path) != expected:
                raise ValueError(f"Embedding source hash mismatch: {name}")
            model_checks[name] = expected
        interpreter = (args.python_executable or Path(sys.executable)).resolve()
        if not interpreter.is_file():
            raise ValueError("Python executable is unavailable")
        version = subprocess.run([str(interpreter), "--version"], check=True,
                                 capture_output=True, text=True, timeout=10)
        interpreter_version = (version.stdout or version.stderr).strip()
        if not interpreter_version.startswith("Python 3.12."):
            raise ValueError("Use the recorded Python 3.12 runtime for state collection; supply --python-executable")
        overrides = {"embedding_snapshot": str(embedding), "agent_site_packages": str(sites),
                     "scipy_overlay": str(overlay), "python": str(interpreter)}
    elif any([args.embedding_snapshot, args.site_packages, args.scipy_overlay, args.python_executable]):
        raise ValueError("Structure collection uses the standard library; state dependency arguments do not apply")

    # No runtime, generated answers, old process locks or existing run state
    # are copied. The prospective FREEZE inventories define the input boundary.
    destination.mkdir(parents=True)
    for name, path in copied.items():
        target = destination / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, target)
    save(destination / "provenance/original-FREEZE.json", original)
    (destination / "provenance/original-config.json").write_bytes((frozen_root / "config.json").read_bytes())

    extra_names = ["verify.py"] if args.kind == "structure" else ["review.py", "recompute-v2.py", "verify_artifacts.py"]
    if args.kind == "structure":
        extra_names.append("review-v2.py")
    for name in extra_names:
        path = frozen_root / name
        if not path.is_file():
            path = source / name
        if not path.is_file():
            raise ValueError(f"Supplementary offline helper is unavailable: {name}")
        (destination / name).write_bytes(path.read_bytes())

    config = json.loads((destination / "config.json").read_text())
    changed = {name: {"original": config[name], "replica": value} for name, value in overrides.items()
               if config[name] != value}
    if changed:
        config.update(overrides)
        save(destination / "config.json", config)
    amendment = {
        "schema_version": 1,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "kind": args.kind,
        "mode": "prepare only; no network, credentials or model calls",
        "original_source_root": str(frozen_root),
        "original_freeze_sha256": digest(freeze_path),
        "original_file_hashes_verified": len(copied),
        "original_config_sha256": digest(frozen_root / "config.json"),
        "config_path_changes": changed,
        "embedding_files_verified": model_checks,
        "replica_python_version": interpreter_version,
        "runtime_outputs_copied": 0,
        "scope": "Fresh repetition of the recorded procedure; stochastic output and current service availability may differ.",
        "unchanged_scientific_fields": "model, decoding, budgets, schedule, inputs, gold, prompts, source implementations",
        "extra_offline_helpers": {name: digest(destination / name) for name in extra_names},
        "live_command": [overrides.get("python", "python3"), "-B", "run.py", "--root", ".",
                         "--key-file", "/external/private/key.txt"],
    }
    save(destination / "REPLICA_AMENDMENT.json", amendment)
    freeze = dict(original)
    freeze.update(frozen_at=amendment["created_at"], original_freeze_sha256=amendment["original_freeze_sha256"],
                  scope="Fresh replica; original hashes checked; environment paths rebased before collection.")
    names = set(copied) | set(extra_names) | {"REPLICA_AMENDMENT.json"}
    freeze["files"] = {name: digest(destination / name) for name in sorted(names)}
    save(destination / "FREEZE.json", freeze)
    for name, expected in freeze["files"].items():
        if digest(destination / name) != expected:
            raise ValueError(f"Replica hash mismatch: {name}")
    return {"status": "PREPARED", "kind": args.kind, "destination": str(destination),
            "frozen_files": len(freeze["files"]), "network_calls": 0,
            "credentials_read": False, "config_path_changes": list(changed),
            "next_step": "Inspect REPLICA_AMENDMENT.json and install the documented runtime before explicitly running the collector."}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--kind", choices=["structure", "state"], required=True)
    parser.add_argument("--source-root", type=Path, required=True,
                        help="Materialized pilot family, not its parent outputs directory")
    parser.add_argument("--destination", type=Path, required=True, help="Fresh scratch directory; must not already exist")
    parser.add_argument("--embedding-snapshot", type=Path)
    parser.add_argument("--site-packages", type=Path)
    parser.add_argument("--scipy-overlay", type=Path)
    parser.add_argument("--python-executable", type=Path)
    args = parser.parse_args()
    try:
        result = prepare(args)
    except (OSError, ValueError, KeyError, subprocess.SubprocessError) as error:
        print(json.dumps({"status": "ERROR", "message": str(error)}), file=sys.stderr)
        return 1
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
