"""Lossless gzip storage only; decoded content is the exact model input."""
import gzip,json
from pathlib import Path
def raw_bytes(path):
 p=Path(path)
 if not p.exists():return b""
 data=p.read_bytes()
 return gzip.decompress(data) if p.suffix==".gz" else data
def text(path):return raw_bytes(path).decode("utf-8")
def rows(path):return [json.loads(s) for s in text(path).splitlines() if s.strip()]
