#!/usr/bin/env python3
"""Run deterministic offline reanalysis in a NEW scratch folder, never inference."""
from pathlib import Path
import argparse
import hashlib
import importlib.util
import json
import subprocess
import sys
import tarfile


def filehash(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(command, cwd=None, json_output=False):
    result = subprocess.run([sys.executable, '-B', *map(str, command)], cwd=cwd,
                            text=True, capture_output=True, timeout=600)
    if result.returncode:
        raise RuntimeError(f'Offline command failed ({result.returncode}): {command}\n{result.stderr}')
    return json.loads(result.stdout) if json_output else result.stdout.strip()


def unpack_nested(source, target, safe):
    target.mkdir()
    with tarfile.open(source, 'r|gz') as archive:
        for member in archive:
            safe(member.name)
            if member.isdir():
                (target / member.name).mkdir(parents=True, exist_ok=True)
            elif member.isfile():
                path = target / member.name
                path.parent.mkdir(parents=True, exist_ok=True)
                with archive.extractfile(member) as stream, path.open('xb') as output:
                    import shutil
                    shutil.copyfileobj(stream, output)
            else:
                raise ValueError('Nonregular member in retained baseline')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parent)
    parser.add_argument('--work-dir', type=Path, required=True)
    parser.add_argument('--skip-clinician', action='store_true', help='Skip openpyxl-dependent Panel B only')
    args = parser.parse_args()
    root = args.root.resolve(); work = args.work_dir.absolute()
    if work.exists():
        raise ValueError('Use a NEW scratch directory; scientific inputs are never overwritten')
    work.mkdir(parents=True)
    spec = importlib.util.spec_from_file_location('release_verifier', root / 'verify.py')
    verifier = importlib.util.module_from_spec(spec); spec.loader.exec_module(verifier)
    dataset = work / 'dataset'
    report = {'scope': 'Deterministic byte/endpoint reconstruction; no models, credentials or new grading.',
              'release': verifier.verify(root, dataset)}
    history = root / 'historical-evidence'
    report['historical_integrity'] = run([history / 'verify.py'], json_output=True)
    historical = run([history / 'recompute.py'], json_output=True)
    if historical != json.loads((history / 'RECOMPUTED.json').read_text()):
        raise ValueError('Historical endpoint recomputation differs')
    report['historical_endpoints'] = {'status': 'EXACT_MATCH', 'results': historical}
    structure = dataset / 'pilots/structure-ablation-pilot-2026-10-05'
    continuation = structure / 'continuations/tls-ca-01'
    report['structure_input_verification'] = [run([structure / 'verify.py', '--root', p]) for p in (structure, continuation)]
    expected = filehash(continuation / 'analysis/results.json')
    run([continuation / 'review-v2.py', 'analyze', '--root', continuation])
    if filehash(continuation / 'analysis/results.json') != expected:
        raise ValueError('Structure pilot endpoint bytes differ')
    report['structure_endpoints'] = {'status': 'EXACT_MATCH', 'results_sha256': expected}
    state = dataset / 'pilots/state-update-retrieval-pilot-2026-10-05'
    report['state_artifacts'] = run([state / 'verify_artifacts.py', '--root', state], json_output=True)
    report['state_saved_vector_retrieval'] = run([state / 'recompute-v2.py', '--root', state], json_output=True)
    baseline = state / 'continuations/automatic-control-2026-10-06/baseline-147.tar.gz'
    grading = work / 'state-grading-147'
    unpack_nested(baseline, grading, verifier.safe)
    rating = grading / 'review/rating-v4'
    originals = {name: filehash(rating / name) for name in ('analysis.json', 'ANALYSIS.md')}
    run([grading / 'review.py', 'aggregate', '--root', '.', '--review-dir', 'review/rating-v4',
         '--a', 'review/rating-v4/continuation/merged/grader-A.json',
         '--b', 'review/rating-v4/continuation/merged/grader-B.json'], cwd=grading)
    if any(filehash(rating / name) != digest for name, digest in originals.items()):
        raise ValueError('State pilot grading recomputation differs')
    report['state_grading'] = {'status': 'EXACT_MATCH', 'rated_answers': 147, 'sha256': originals,
                              'collection_status': 'PARTIAL — preserved missing outputs are not regenerated.'}
    if args.skip_clinician:
        report['clinician_panel_b'] = {'status': 'SKIPPED', 'reason': 'Explicit --skip-clinician'}
    else:
        panel = dataset / 'legacy/app/evaluation/misstep/automatic_detector'
        expected = filehash(panel / 'panel_b_metrics.csv')
        text = run([panel / 'compute_panel_b_metrics.py'])
        if filehash(panel / 'panel_b_metrics.csv') != expected:
            raise ValueError('Panel B metric bytes differ')
        report['clinician_panel_b'] = {'status': 'EXACT_MATCH', 'sha256': expected, 'output': text}
    (work / 'REPRODUCED.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'status': 'PASS', 'report': str(work / 'REPRODUCED.json'),
                      'state_pilot': 'PARTIAL_COLLECTION, exact available-data reanalysis',
                      'clinician_panel_b': report['clinician_panel_b']['status']}, indent=2))


if __name__ == '__main__':
    main()
