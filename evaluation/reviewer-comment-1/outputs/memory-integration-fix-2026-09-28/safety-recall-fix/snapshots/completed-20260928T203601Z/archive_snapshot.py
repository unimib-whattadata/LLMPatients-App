"""Archive the completed or stopped local evidence without further inference."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import shutil

HERE = Path(__file__).resolve().parent


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    metrics = json.loads((HERE / "results.json").read_text())
    check = json.loads((HERE / "integrity-check.json").read_text())
    if metrics["status"] not in {"completed", "stopped"} or check["status"] != "verified":
        raise RuntimeError("Archive only a finished, locally verified attempt")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    target = HERE / "snapshots" / f"{metrics['status']}-{stamp}"
    candidates = [p for p in sorted(HERE.rglob("*")) if p.is_file()
                  and not {"snapshots", "__pycache__"}.intersection(p.relative_to(HERE).parts)]
    target.mkdir(parents=True, exist_ok=False)
    copied = {}
    for source in candidates:
        if source.is_symlink():
            raise RuntimeError("Do not archive symlinked evidence")
        relative = source.relative_to(HERE)
        destination = target / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, destination)
        copied[str(relative)] = digest(source)
        assert digest(destination) == copied[str(relative)]
    manifest = {"created_at": datetime.now(timezone.utc).isoformat(),
                "source": str(HERE), "status": metrics["status"],
                "completed_sessions": metrics["completed_sessions"],
                "archived_turns": metrics["archived_turns"], "copied_files": copied}
    (target / "snapshot-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"snapshot": str(target), "copied_files": len(copied)}))


if __name__ == "__main__":
    main()
