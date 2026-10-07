#!/usr/bin/env python3
"""Build a standalone, credential-free reviewer package from explicit sources.

Uses only the standard library. Never runs inference or changes scientific inputs.
Run after finalizing source changes; refuses to replace an existing package.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import io
import json
import re
import shutil
import subprocess
import tarfile
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
PATTERNS = [
    re.compile(rb"sk-or-v1-[A-Za-z0-9]{20,}"),
    re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    re.compile(rb"ya29\.[A-Za-z0-9_-]{20,}"),
    re.compile(rb"AKIA[A-Z0-9]{16}"),
]
SKIP_PARTS = {"__pycache__", "node_modules", ".venv", ".git", ".next"}


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def tracked(root: Path) -> list[Path]:
    names = subprocess.check_output(["git", "ls-files", "-z"], cwd=root).decode().split("\0")
    return [root / n for n in names if n and (root / n).is_file()]


def clean_file(path: Path) -> bytes:
    if path.is_symlink():
        raise ValueError(f"Symlink not exportable: {path}")
    data = path.read_bytes()
    if any(pattern.search(data) for pattern in PATTERNS):
        raise ValueError(f"Credential pattern detected; contents withheld: {path}")
    return data


def tree(root: Path) -> list[Path]:
    return sorted(p for p in root.rglob("*") if p.is_file()
                  and not SKIP_PARTS.intersection(p.relative_to(root).parts)
                  and p.suffix not in {".pyc", ".pyo"}
                  and p.name not in {".DS_Store", ".runner.lock"})


def bundle(out: Path, label: str, files: list[tuple[Path, str]], manifest: dict) -> None:
    """20 MiB target groups; large single records remain below ordinary Git limits."""
    groups: list[list[tuple[Path, str, bytes]]] = [[]]
    size = 0
    seen = set()
    for path, name in files:
        if name in seen:
            raise ValueError(f"Duplicate scientific path: {name}")
        seen.add(name)
        data = clean_file(path)
        if len(data) > 90 * 1024 * 1024:
            raise ValueError(f"File needs explicit large-file handling: {path}")
        if size + len(data) > 20 * 1024 * 1024 and groups[-1]:
            groups.append([])
            size = 0
        groups[-1].append((path, name, data))
        size += len(data)
    for number, group in enumerate(groups, 1):
        if not group:
            continue
        rel = f"data/{label}.part-{number:03d}.tar.gz"
        target = out / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("wb") as raw, gzip.GzipFile(fileobj=raw, mode="wb", mtime=0, filename="") as zipped:
            with tarfile.open(fileobj=zipped, mode="w", format=tarfile.PAX_FORMAT) as archive:
                for source, name, data in group:
                    info = tarfile.TarInfo(name)
                    info.size = len(data)
                    info.mode = 0o755 if source.stat().st_mode & 0o111 else 0o644
                    info.mtime = 0
                    archive.addfile(info, io.BytesIO(data))
                    manifest["members"][name] = {"bundle": rel, "bytes": len(data), "sha256": sha(data)}
        manifest["files"][rel] = {"bytes": target.stat().st_size, "sha256": sha(target.read_bytes())}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--agent-root", type=Path, default=APP.parent / "LLMPatients-Agent")
    parser.add_argument("--manuscript-root", type=Path, default=APP.parent / "LLMPatient---APPLICATION")
    parser.add_argument("--output", type=Path, default=APP / "reviewer-reproducibility")
    args = parser.parse_args()
    agent = args.agent_root.resolve()
    out = args.output.resolve()
    if out.exists():
        raise ValueError("Choose a new output directory; existing material is never replaced")
    history = APP / "evaluation/reviewer-comment-1"
    old = json.loads((history / "MANIFEST.json").read_text())
    manifest = {"format": 1, "created_date": "2026-10-07", "files": {}, "members": {}, "sources": {}}
    for name, root in [("app", APP), ("agent", agent), ("manuscript", args.manuscript_root.resolve())]:
        manifest["sources"][name] = {
            "repository": subprocess.check_output(["git", "remote", "get-url", "origin"], cwd=root, text=True).strip(),
            "base_commit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip(),
            "snapshot_note": "Working source bytes, including audited fixes; exact hashes below are authoritative.",
        }
    out.mkdir(parents=True)
    # Preserve the already released package, including its original verifier and manifest.
    names = {v["storage"] for v in old["files"].values()} | set(old.get("control_files", {}))
    names |= {"MANIFEST.json", "README.md", "RECOMPUTED.json", "SOURCE_VERSIONS.json", "VALIDATION.json", "verify.py", "recompute.py"}
    for name in sorted(names):
        source = history / name
        rel = "historical-evidence/" + name
        data = clean_file(source)
        target = out / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        manifest["files"][rel] = {"bytes": len(data), "sha256": sha(data)}
    for name in ["state-update-retrieval-pilot-2026-10-05", "structure-ablation-pilot-2026-10-05"]:
        source = history / "outputs" / name
        bundle(out, name, [(p, "pilots/" + name + "/" + p.relative_to(source).as_posix()) for p in tree(source)], manifest)
    legacy = []
    for p in tracked(APP):
        rel = p.relative_to(APP).as_posix()
        if rel.startswith(("evaluation/misstep/", "evaluation/psycoquestionnaire/", "analysis/")):
            legacy.append((p, "legacy/app/" + rel))
    for p in tracked(agent):
        rel = p.relative_to(agent).as_posix()
        if rel.startswith(("data/eval/", "data/questionnaire_results/", "data/questionnaires/", "data/questionnaires pdf/", "notebooks/", "tests/")):
            legacy.append((p, "legacy/agent/" + rel))
    # Historical session evidence is ignored in the runtime repo; preserve only
    # the explicitly inventoried records, never export arbitrary live stores.
    catalog = json.loads((APP / "scripts/reviewer-package/CATALOG.json").read_text())
    exported = {name for _, name in legacy}
    for rel in catalog["release_allowlists"]["agent_source_data_paths_relative_to_agent"]:
        name = "legacy/agent/" + rel
        if rel == "tests/runs/69447790-a1e5-4fe6-b230-29bce4b00ca6.json":
            continue  # Unpublished manual API record with unconfirmed synthetic provenance.
        if rel.startswith(("tests/runs/", "data/memory/")) and name not in exported:
            legacy.append((agent / rel, name))
            exported.add(name)
    # This historical anonymous runtime differs from today's source; it is
    # scientific provenance rather than a replaceable copy of the current tree.
    archived_runtime = agent / "LLMPatients-Agent-runtime-anonymous.zip"
    if archived_runtime.is_file():
        legacy.append((archived_runtime, "legacy/agent/" + archived_runtime.name))
    bundle(out, "legacy-experiments", sorted(legacy, key=lambda x: x[1]), manifest)
    manuscript = args.manuscript_root.resolve()
    bundle(out, "manuscript-inputs", [(p, "legacy/manuscript/" + p.relative_to(manuscript).as_posix())
                                      for p in tracked(manuscript) if p.relative_to(manuscript).as_posix().startswith("data/")], manifest)
    app_source = []
    for p in tracked(APP):
        rel = p.relative_to(APP).as_posix()
        if rel.startswith(("evaluation/", "analysis/", "paper/", "reviewer-reproducibility/")) or p.suffix == ".tex":
            continue
        app_source.append((p, "runtime/app/" + rel))
    agent_source = []
    for p in tracked(agent):
        rel = p.relative_to(agent).as_posix()
        if rel.startswith(("config/", ".claude/", ".vscode/", "tests/", "notebooks/")) or rel.endswith(".zip"):
            continue
        if rel.startswith("data/") and not rel.startswith(("data/patients/", "data/icd11_templates/")) and rel != "data/topics_tree.json":
            continue
        agent_source.append((p, "runtime/agent/" + rel))
    if (agent / "LICENSE").is_file() and not any(n == "runtime/agent/LICENSE" for _, n in agent_source):
        agent_source.append((agent / "LICENSE", "runtime/agent/LICENSE"))
    bundle(out, "runtime-app", sorted(app_source, key=lambda x: x[1]), manifest)
    bundle(out, "runtime-agent", sorted(agent_source, key=lambda x: x[1]), manifest)
    # Tooling/docs are maintained outside the generated scientific archive.
    support = APP / "scripts/reviewer-package"
    for p in tree(support):
        rel = p.relative_to(support).as_posix()
        data = clean_file(p)
        target = out / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        manifest["files"][rel] = {"bytes": len(data), "sha256": sha(data)}
    manifest["exclusions"] = [
        "Credentials/config keys, .env, user/database/session runtime stores, untracked patient profiles",
        "Build/cache/editor files and slide scratch directories",
        "Losslessly exported duplicate _local-originals",
        "Manuscript TeX and generated manuscript PDFs (manuscript left unchanged)",
        "Unpublished manual API log 69447790-a1e5-4fe6-b230-29bce4b00ca6 and its untracked profile: synthetic provenance could not be established; preserved locally",
    ]
    (out / "MANIFEST.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({"output": str(out), "loose_files": len(manifest["files"]), "archived_files": len(manifest["members"]), "bytes": sum(v["bytes"] for v in manifest["files"].values())}, indent=2))


if __name__ == "__main__":
    main()
