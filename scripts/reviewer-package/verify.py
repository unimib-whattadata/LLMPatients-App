#!/usr/bin/env python3
"""Verify all release bytes and optionally unpack into a NEW empty directory."""
from pathlib import Path, PurePosixPath
import argparse
import hashlib
import json
import tarfile


def safe(name):
    path = PurePosixPath(name)
    if path.is_absolute() or '..' in path.parts or '\\' in name or not path.parts:
        raise ValueError('Unsafe archive path')
    return path


def digest(stream, output=None):
    h = hashlib.sha256(); size = 0
    for block in iter(lambda: stream.read(1024 * 1024), b''):
        h.update(block); size += len(block)
        if output:
            output.write(block)
    return {'bytes': size, 'sha256': h.hexdigest()}


def verify(root, extract=None):
    manifest = json.loads((root / 'MANIFEST.json').read_text())
    if extract:
        if extract.exists():
            raise ValueError('Extraction destination must not exist (no symlinks or overwrite)')
        extract.mkdir(parents=True)
    for name, info in manifest['files'].items():
        path = root / safe(name)
        if path.is_symlink():
            raise ValueError('Symlink in release: ' + name)
        with path.open('rb') as source:
            if digest(source) != info:
                raise ValueError('Release file differs: ' + name)
    bundles = sorted({row['bundle'] for row in manifest['members'].values()})
    seen = set()
    for name in bundles:
        with tarfile.open(root / safe(name), 'r|gz') as archive:
            for member in archive:
                safe(member.name)
                if not member.isfile() or member.name in seen:
                    raise ValueError('Nonregular or duplicate archive member')
                info = manifest['members'].get(member.name)
                if not info or info['bundle'] != name:
                    raise ValueError('Uninventoried archive member')
                expected = {k: info[k] for k in ('bytes', 'sha256')}
                with archive.extractfile(member) as source:
                    if extract:
                        target = extract / member.name
                        target.parent.mkdir(parents=True, exist_ok=True)
                        with target.open('xb') as output:
                            actual = digest(source, output)
                        target.chmod(member.mode & 0o777)
                    else:
                        actual = digest(source)
                if actual != expected:
                    raise ValueError('Scientific member differs: ' + member.name)
                seen.add(member.name)
    if seen != set(manifest['members']):
        raise ValueError('Missing scientific members')
    return {'status': 'PASS', 'release_files': len(manifest['files']),
            'archived_files': len(seen), 'extracted_to': str(extract) if extract else None,
            'scope': 'Byte integrity and complete recorded coverage; not a claim of clinical validity.'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parent)
    parser.add_argument('--extract', type=Path)
    args = parser.parse_args()
    print(json.dumps(verify(args.root.resolve(), args.extract.absolute() if args.extract else None), indent=2))
