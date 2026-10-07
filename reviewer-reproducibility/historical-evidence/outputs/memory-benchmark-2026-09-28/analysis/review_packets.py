"""Create complete condition-blinded batches and merge archived assessments."""
import argparse
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
PATIENTS = {"jason": "jason_smith_001", "alex": "alex_carter_001",
            "crystal": "crystal_smith_001", "daniel": "daniel_isherwood_001",
            "juanita": "juanita_delgado_001"}


def read(path):
    return json.loads(path.read_text())


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(".tmp")
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    temp.replace(path)


def packet(name):
    rows = [r for r in read(HERE / "blinded-review.json")
            if r["source_dialogue_path"] == f"corpus/{PATIENTS[name]}.json"]
    if len(rows) != 56 or len({r["review_id"] for r in rows}) != 56:
        raise ValueError("A review packet requires all 56 distinct completed responses")
    path = HERE / "review-packets" / f"{name}.json"
    if path.exists() and read(path) != rows:
        # The global export can shuffle order as other patients complete;
        # order differences do not justify replacing an existing packet.
        existing = {r["review_id"]: r for r in read(path)}
        if existing != {r["review_id"]: r for r in rows}:
            raise ValueError("A previously exported response changed")
        return
    write(path, rows)


def merge():
    judgments, sources = {}, []
    def add(path, packet_path, partial=False):
        assessment = read(path)
        expected = {r["review_id"] for r in read(packet_path)}
        rows = assessment["judgments"]
        if (not partial and len(rows) != 56) or (partial and not 0 < len(rows) < 56):
            raise ValueError("Unexpected complete/partial assessment size")
        if len(rows) != len(expected) or {r["review_id"] for r in rows} != expected:
            raise ValueError(f"Assessment IDs do not match packet: {path.name}")
        for row in rows:
            if not isinstance(row.get("correct"), bool) or not row.get("reason"):
                raise ValueError("Every decision requires boolean correctness and a rationale")
            if row["review_id"] in judgments:
                if judgments[row["review_id"]]["correct"] != row["correct"]:
                    raise ValueError("A later assessment conflicts with a preserved partial assessment")
                continue
            judgments[row["review_id"]] = row
        sources.append({"path": path.name, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                        "partial_snapshot": partial, "judgments": len(rows)})
    for name in PATIENTS:
        path = HERE / f"semantic-{name}.json"
        if not path.exists():
            continue
        add(path, HERE / "review-packets" / f"{name}.json")
    for path in sorted(HERE.glob("semantic-*-partial-*.json")):
        add(path, HERE / "review-packets" / path.name.removeprefix("semantic-"), partial=True)
    write(HERE / "semantic-adjudication.json", {
        "scope": "Semantic assessment with condition labels hidden; reviewer also involved in corpus authorship, not independent clinical validation.",
        "sources": sources, "judgments": list(judgments.values())})
    print(json.dumps({"assessment_files": len(sources), "judgments": len(judgments)}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["packet", "merge"])
    parser.add_argument("--patient", choices=list(PATIENTS))
    args = parser.parse_args()
    packet(args.patient) if args.action == "packet" else merge()
