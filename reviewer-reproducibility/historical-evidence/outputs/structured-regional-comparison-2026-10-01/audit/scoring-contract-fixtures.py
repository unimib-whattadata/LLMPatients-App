import copy
import importlib.util
import json
import math
from pathlib import Path
import sys
from datetime import datetime, timezone

sys.dont_write_bytecode = True
ROOT = Path('/Users/marco/Sites/LLMPatient---APPLICATION/outputs/structured-regional-comparison-2026-10-01')
FIXTURES = Path('/tmp/structured-scoring-audit-20261001')
sys.path.insert(0, str(ROOT / 'analysis'))
import summarize as s
u = s.u
SOURCE_SHA = u.sha(ROOT / 'analysis/summarize.py')
ORIGINAL_JOBS = u.read(ROOT / 'schedule.json')['jobs']
ORIGINAL_CONTEXTS = u.read(ROOT / 'contexts.json')


def jsonlines(path, values):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(''.join(json.dumps(v) + '\n' for v in values))


def fixture(name, mode='perfect'):
    root = FIXTURES / name
    root.mkdir()
    jobs = copy.deepcopy(ORIGINAL_JOBS)
    contexts = copy.deepcopy(ORIGINAL_CONTEXTS)
    if mode == 'deduplicated':
        combined = []
        for patient in sorted({j['patient_id'] for j in jobs}):
            representative = copy.deepcopy(next(j for j in jobs if j['patient_id'] == patient))
            related = [c for c in contexts if c['patient_id'] == patient]
            representative['context_ids'] = [c['context_id'] for c in related]
            representative['paired_baseline_job_ids'] = [bid for c in related for bid in c['paired_baseline_job_ids']]
            representative['prompt_sha256'] = 'synthetic-' + patient
            for c in related:
                c['generation_job_id'] = representative['job_id']
                c['prompt_sha256'] = representative['prompt_sha256']
            combined.append(representative)
        jobs = combined
    for patient in {j['patient_id'] for j in jobs}:
        d = root / 'inputs' / patient
        d.mkdir(parents=True)
        for filename in ('question.txt', 'gold.json'):
            (d / filename).write_bytes((ROOT / 'inputs' / patient / filename).read_bytes())
    missing = {}
    if mode == 'missing':
        manual = next(j for j in jobs if j['target_tokens'] == 64000)
        autos = [j for j in jobs if j['target_tokens'] == 1200000]
        missing = {manual['job_id']: 'other_missing', autos[0]['job_id']: 'context_rejected', autos[1]['job_id']: 'unattempted'}
    if mode == 'all_missing':
        missing = {j['job_id']: 'unattempted' for j in jobs}
    answers, cards, mapping, ratings = [], [], {}, []
    success_cost = 0.0
    for n, job in enumerate(jobs, 1):
        ident = job['job_id']
        status = missing.get(ident, 'complete')
        if status == 'unattempted':
            continue
        rid = 'fixture-native-' + ident
        request = {'event': 'request', 'record_id': rid, 'request': {'fixture': ident}}
        if status in ('context_rejected', 'other_missing'):
            outcome = {**request, 'event': 'error', 'http_status': 400,
                       'response': {'error': {'code': 400, 'message': 'Maximum context length exceeded'}}}
            jsonlines(root / 'runtime' / ident / 'openrouter-api-records.jsonl', [request, outcome])
            if status == 'context_rejected':
                answers.append({**job, 'status': status, 'semantic_evaluable': False, 'native_record_id': rid})
            continue
        content = f'Synthetic structured answer {ident}; no model called.'
        usage = {'prompt_tokens': 100 + n, 'completion_tokens': 1, 'total_tokens': 101 + n, 'cost': 0.001}
        raw = {'model': 'google/gemini-2.5-pro', 'provider': 'synthetic-provider', 'usage': usage,
               'choices': [{'finish_reason': 'stop', 'message': {'content': content}}]}
        outcome = {**request, 'event': 'response', 'response': raw}
        jsonlines(root / 'runtime' / ident / 'openrouter-api-records.jsonl', [request, outcome])
        answers.append({**job, 'status': 'complete', 'semantic_evaluable': True, 'native_record_id': rid,
                        'answer': content, 'usage': usage})
        success_cost += usage['cost']
        card_id = f'F{100 - n:03d}'
        d = root / 'inputs' / job['patient_id']
        cards.append({'id': card_id, 'question': (d / 'question.txt').read_text(),
                      'gold': u.read(d / 'gold.json')['probes'], 'answer': content})
        mapping[card_id] = {k: job[k] for k in ('job_id', 'patient_id', 'arm', 'target_tokens')}
        categories = []
        for category, fs in u.FIELDS.items():
            fields = {f: mode != 'history_lost' or category not in s.HISTORY for f in fs}
            categories.append({'category': category, 'pass': all(fields.values()),
                               'field_correct': fields, 'reason': 'Synthetic arithmetic fixture.'})
        ratings.append({'id': card_id, 'categories': categories})
    if mode == 'duplicate_card':
        extra = dict(cards[0], id='F999')
        cards.append(extra)
        mapping['F999'] = dict(mapping[cards[0]['id']])
        extra_rating = copy.deepcopy(ratings[0])
        extra_rating['id'] = 'F999'
        for c in extra_rating['categories']:
            if c['category'] in s.HISTORY:
                c['field_correct'] = {k: False for k in c['field_correct']}
                c['pass'] = False
        ratings.append(extra_rating)
    u.write(root / 'schedule.json', {'jobs': jobs})
    u.write(root / 'contexts.json', contexts)
    u.write(root / 'runtime/state.json', {'status': 'stopped' if missing else 'completed',
             'planned': len(jobs), 'completed': len(answers), 'observed_cost_usd': success_cost})
    jsonlines(root / 'runtime/answers.jsonl', answers)
    u.write(root / 'review/private/mapping.json', mapping)
    for rater in ('a', 'b'):
        u.write(root / 'review' / rater / 'cards.json', cards)
        u.write(root / 'review/ratings' / f'{rater}.json', {'model_requested': 'synthetic-fixture',
                'model_observed': 'no-model-called', 'ratings': ratings})
    if mode == 'adjudication':
        target = cards[0]['id']
        reviewer_b = u.read(root / 'review/ratings/b.json')
        item = next(r for r in reviewer_b['ratings'] if r['id'] == target)
        appointment = next(c for c in item['categories'] if c['category'] == 'correction_and_proposal')
        appointment['field_correct']['current'] = False
        appointment['pass'] = False
        u.write(root / 'review/ratings/b.json', reviewer_b)
        adjud = copy.deepcopy(item)
        identity = next(c for c in adjud['categories'] if c['category'] == 'persistent_identity')
        identity['field_correct'] = {k: False for k in identity['field_correct']}
        identity['pass'] = False
        u.write(root / 'review/ratings/adjudicator.json', {'model_requested': 'synthetic-fixture',
               'model_observed': 'no-model-called', 'ratings': [adjud]})
    exports = ['a/cards.json', 'b/cards.json', 'private/mapping.json']
    u.write(root / 'review/export-manifest.json', {'source_answers_sha256': u.sha(root / 'runtime/answers.jsonl'),
                'files': {p: u.sha(root / 'review' / p) for p in exports}})
    return root


def score(mode):
    root = fixture(mode, mode)
    s.score(root)
    return root, u.read(root / 'analysis/results.json')


checks = []
findings = []
perfect_root, perfect = score('perfect')
assert perfect['planned_unique_generations'] == perfect['complete_unique_generations'] == 30
assert perfect['mapped_comparisons'] == 120 and perfect['comparison_cells'] == 24
assert perfect['unique_semantic_totals']['categories'] == {'correct': 180, 'total': 180, 'percent': 100.0}
assert perfect['unique_semantic_totals']['fields']['total'] == 360
assert perfect['unique_semantic_totals']['history_categories']['total'] == 120
assert perfect['unique_semantic_totals']['history_fields']['total'] == 270
assert perfect['http_requests'] == 30 and perfect['native_usage_unique_calls']['records'] == 30
assert math.isclose(perfect['observed_new_cost_usd'], 0.03)
assert sum(c['structured']['history_categories']['total'] for c in perfect['cells']) == 480
for c in perfect['cells']:
    assert c['paired_profiles'] == 5
    assert c['structured']['history_categories']['total'] == 20
    assert c['structured']['history_fields']['total'] == 45
    assert c['history_difference_pp'] == 100 - c['baseline']['history_categories']['percent']
    assert math.isclose(c['history_field_difference_pp'], 100 - c['baseline']['history_fields']['percent'])
    assert c['profile_wins'] + c['profile_ties'] + c['profile_losses'] == 5
checks.append({'name': 'unique_vs_mapped_accounting', 'status': 'passed',
 'unique_history_categories': '120/120', 'mapped_history_denominator': 480, 'unique_cost_usd': 0.03,
 'baseline_saved_categories_equal_original_blinded_ratings': True})

_, lost = score('history_lost')
assert lost['unique_semantic_totals']['categories'] == {'correct': 60, 'total': 180, 'percent': 100 / 3}
assert lost['unique_semantic_totals']['history_categories'] == {'correct': 0, 'total': 120, 'percent': 0.0}
assert lost['unique_semantic_totals']['history_fields'] == {'correct': 0, 'total': 270, 'percent': 0.0}
for c in lost['cells']:
    if c['baseline_arm'] == 'full':
        assert c['history_difference_pp'] == -100 and c['profile_losses'] == 5
checks.append({'name': 'all_positive_history_lost', 'status': 'passed', 'per_response_categories': '2/6',
 'per_response_history_categories': '0/4', 'difference_from_full_control_pp': -100})

_, missing = score('missing')
assert missing['complete_unique_generations'] == 27 and missing['http_requests'] == 29
assert missing['unique_semantic_totals']['categories']['total'] == 162
assert missing['unique_semantic_totals']['history_fields']['total'] == 243
assert math.isclose(missing['observed_new_cost_usd'], 0.027)
assert sum(c['structured_completed'] for c in missing['cells']) == 111
for c in missing['cells']:
    assert c['baseline_completed'] == 5
    assert c['paired_profiles'] == c['structured_completed']
    assert c['structured']['history_categories']['total'] == c['paired_profiles'] * 4
    assert c['baseline_on_complete_pairs']['history_categories']['total'] == c['paired_profiles'] * 4
    assert math.isclose(c['history_difference_pp'],
       c['structured']['history_categories']['percent'] - c['baseline_on_complete_pairs']['history_categories']['percent'])
checks.append({'name': 'missing_rejected_unattempted_shared_controls', 'status': 'passed',
 'unique_complete': 27, 'mapped_complete': 111, 'complete_pairs_only': True})

_, empty = score('all_missing')
assert empty['complete_unique_generations'] == empty['http_requests'] == 0
assert empty['unique_semantic_totals']['history_categories']['percent'] is None
assert all(c['history_difference_pp'] is None and c['paired_profiles'] == 0 for c in empty['cells'])
checks.append({'name': 'zero_complete_structured_responses', 'status': 'passed', 'paired_delta': None})

_, dedup = score('deduplicated')
assert dedup['planned_unique_generations'] == dedup['complete_unique_generations'] == 5
assert dedup['source_contexts'] == 30 and dedup['mapped_comparisons'] == 120
assert dedup['unique_semantic_totals']['history_categories']['total'] == 20
assert dedup['unique_semantic_totals']['history_fields']['total'] == 45
assert dedup['http_requests'] == 5 and math.isclose(dedup['observed_new_cost_usd'], 0.005)
checks.append({'name': 'one_unique_prompt_per_profile_shared_across_six_contexts', 'status': 'passed',
 'actual_generations': 5, 'source_contexts': 30, 'mapped_comparisons': 120, 'unique_cost_usd': 0.005})

_, adjud = score('adjudication')
assert adjud['disagreement_categories'] == 1
assert adjud['unique_semantic_totals']['categories']['correct'] == 179
assert adjud['unique_semantic_totals']['fields']['correct'] == 359
assert adjud['unique_semantic_totals']['history_categories']['correct'] == 119
checks.append({'name': 'only_disputed_category_uses_adjudicator', 'status': 'passed'})

original_read = u.read
def altered_baseline_read(path):
    value = original_read(path)
    if Path(path) == s.BASE / 'analysis/results.json':
        value = copy.deepcopy(value)
        row = value['cells'][0]['per_profile'][0]['categories'][0]
        row['field_correct']['name'] = not row['field_correct']['name']
        row['pass'] = all(row['field_correct'].values())
    return value
try:
    u.read = altered_baseline_read
    try:
        s.score(perfect_root)
    except AssertionError:
        checks.append({'name': 'saved_baseline_rating_tamper_rejected', 'status': 'passed'})
    else:
        raise AssertionError('Changed saved baseline categories accepted')
finally:
    u.read = original_read

_, duplicate = score('duplicate_card')
assert duplicate['complete_unique_generations'] == 30
assert duplicate['unique_semantic_totals']['history_categories']['correct'] == 116
findings.append({'id': 'duplicate_card_mapping_overwrites_rating', 'severity': 'rating_integrity',
 'reproduced': True, 'fixture': str(FIXTURES / 'duplicate_card'),
 'observed': '31 distinct card IDs covering 30 completed jobs are accepted. A second card for one job silently overwrites its first rating; synthetic history total changes from 120/120 to 116/120 while unique generation count stays 30.',
 'cause': 'Set coverage of mapping job IDs does not enforce one card per completed job before ratings[job_id] assignment.',
 'required_guard': 'Require len(mapping)==len(complete), in addition to mapped-job set equality, before processing ratings.',
 'collection_impact': 'None; existing runner export creates one card per complete answer. Fix via append-only analysis amendment before final scoring.'})
assert u.sha(ROOT / 'analysis/summarize.py') == SOURCE_SHA
report = {'created_at': datetime.now(timezone.utc).isoformat(), 'scope': 'Offline synthetic scoring contract and sealed baseline arithmetic audit',
 'frozen_scorer_sha256': SOURCE_SHA, 'checks': checks, 'findings': findings,
 'actual_structured_answers_read': False, 'new_semantic_ratings_performed': False, 'network_calls': 0,
 'fixture_script': str(Path(__file__).resolve()), 'production_scripts_modified': False,
 'baseline_files_modified': False,
 'conclusion': 'Unique/shared accounting, denominators and complete-pair comparisons pass. Add one-to-one rating-map cardinality guard before final scoring.'}
destination = ROOT / 'audit/scoring-contract-review.json'
with destination.open('x') as f:
    json.dump(report, f, indent=2)
    f.write('\n')
print(json.dumps({'checks_passed': len(checks), 'findings': [x['id'] for x in findings], 'audit': str(destination)}))
