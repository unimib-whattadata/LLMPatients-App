import csv
import importlib.util
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from statistics import mean

ROOT = Path('/Users/marco/Sites/LLMPatients-App/evaluation/misstep')
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('archived_metrics', ROOT / 'automatic_detector/compute_panel_b_metrics.py')
archived = importlib.util.module_from_spec(spec)
spec.loader.exec_module(archived)
key = {x['transcript_id']: x for x in csv.DictReader((ROOT / 'transcripts/internal_transcript_condition_key.csv').open())}
results = json.loads((ROOT / 'automatic_detector/misstep_corpus_app_results.json').read_text())
pred, seed, labels, categories, ratings = {}, {}, {}, {}, {}
transcripts, confidences, leakage = {}, {}, {}
conditions = Counter()
for tid, meta in key.items():
    txt = (ROOT / f'transcripts/transcript_{tid}.md').read_text()
    t = re.findall(r'^\*\*Therapist \d+:\*\*\s*(.*)$', txt, flags=re.M)
    p = re.findall(r'^\*\*Patient \d+:\*\*\s*(.*)$', txt, flags=re.M)
    sessions = re.findall(r'^## Session (\d+):', txt, flags=re.M)
    assert len(t) == len(p) == 15 and sessions == ['1','2','3'], (tid, len(t), len(p), sessions)
    transcripts[tid] = t
    conditions[(meta['true_condition'], meta['script_variant'])] += 1
    for i in range(1,16):
        seed[(tid,i)] = meta['script_variant'] == 'seeded_misstep'

for r in results:
    tid = r['transcriptId']
    turns = {int(t) for c in r['detectedCategories'] for t in c['therapistTurns']}
    assert all(1 <= t <= 15 for t in turns)
    assert r['summary']['therapistTurnCount'] == 15
    assert r['scriptVariant'] == key[tid]['script_variant']
    for i in range(1,16):
        pred[(tid,i)] = i in turns

leak_terms = ['full_llmpatients','prompt_only_baseline','BLINDED_A','BLINDED_B','BLINDED_C','BLINDED_D','seeded_misstep','gpt-','gemini','vertex_ai','_System metadata:']
for rater, path in [('Rater 1', archived.RATER_1_PATH), ('Rater 2', archived.RATER_2_PATH)]:
    wb = archived.load_workbook_repaired(path)
    labels[rater], categories[rater], ratings[rater], confidences[rater] = {}, {}, {}, {}
    transcript_sheet_order = [s for s in wb.sheetnames if s in key]
    assert transcript_sheet_order == list(key), transcript_sheet_order
    hits = []
    for sheet in wb:
        for row in sheet.iter_rows():
            for cell in row:
                if isinstance(cell.value, str):
                    for term in leak_terms:
                        if term.lower() in cell.value.lower():
                            hits.append({'sheet': sheet.title, 'cell': cell.coordinate, 'term': term})
    leakage[rater] = hits
    for tid in key:
        ws=wb[tid]
        for i in range(1,16):
            unit = (tid,i)
            row=i+15
            assert ws.cell(row,3).value == transcripts[tid][i-1], (rater,tid,i)
            val=str(ws.cell(row,5).value).strip().lower()
            assert val in ['yes','no'], (rater,unit,val)
            labels[rater][unit] = val == 'yes'
            categories[rater][unit] = ws.cell(row,6).value
            confidences[rater][unit] = ws.cell(row,7).value
        ratings[rater][tid] = {ws.cell(row,1).value: ws.cell(row,2).value for row in range(6,12)}

units = list(seed)
assert len(units) == len(pred) == len(set(units)) == 300
r1, r2 = labels.values()
def metric(p,r,subset=units):
    counts=Counter((p[u],r[u]) for u in subset)
    tp,fp,tn,fn=[counts[k] for k in [(True,True),(True,False),(False,False),(False,True)]]
    return {'n':len(subset),'tp':tp,'fp':fp,'tn':tn,'fn':fn,'precision':tp/(tp+fp) if tp+fp else None,'recall':tp/(tp+fn) if tp+fn else None,'specificity':tn/(tn+fp) if tn+fp else None,'f1':2*tp/(2*tp+fp+fn) if tp+fp+fn else None,'accuracy':(tp+tn)/len(subset)}
def agreement(subset):
    n=len(subset)
    matrix=Counter((r1[u],r2[u]) for u in subset)
    po=sum(r1[u]==r2[u] for u in subset)/n
    a=sum(r1[u] for u in subset)/n
    b=sum(r2[u] for u in subset)/n
    pe=a*b+(1-a)*(1-b)
    joint=[u for u in subset if r1[u] and r2[u]]
    same=sum(categories['Rater 1'][u]==categories['Rater 2'][u] for u in joint)
    return {'n':n,'both_positive':matrix[True,True],'rater1_only':matrix[True,False],'rater2_only':matrix[False,True],'both_negative':matrix[False,False],'observed':po,'expected':pe,'kappa':(po-pe)/(1-pe) if pe!=1 else None,'joint_positive_category_agreement':same/len(joint) if joint else None,'same_category_count':same}
subsets={'All':units,'Seeded':[u for u in units if seed[u]],'Appropriate':[u for u in units if not seed[u]]}
refs={'Rater 1':r1,'Rater 2':r2,'Either':{u:r1[u] or r2[u] for u in units},'Both':{u:r1[u] and r2[u] for u in units},'Seeded':seed}
out={
 'corpus': {'transcripts':len(key),'therapist_turns':len(units),'patient_turns':300,'condition_counts':{str(k):v for k,v in conditions.items()},'unique_therapist_sequences':len({tuple(t) for t in transcripts.values()}),'unique_therapist_texts':len({t for ts in transcripts.values() for t in ts}),'even_transcripts_all_seeded':all(seed[(t,1)]==(int(t[1:])%2==0) for t in key),'sequential_sheet_order_verified':True},
 'panel_a':{name:metric(ref,seed) for name,ref in refs.items() if name!='Seeded'},
 'panel_b':{name:metric(pred,ref) for name,ref in refs.items()},
 'agreement':{name:agreement(sub) for name,sub in subsets.items()},
 'archived_detector_models':dict(Counter(r['modelName'] for r in results)),
 'detector_versions':dict(Counter(r['detectorVersion'] for r in results)),
 'computed_at_range':[min(r['computedAt'] for r in results),max(r['computedAt'] for r in results)],
 'metadata_leakage_terms_in_completed_workbooks':leakage,
 'confidence_by_script':{r:{name:dict(Counter(str(confidences[r][u]) for u in sub if labels[r][u])) for name,sub in subsets.items()} for r in labels},
 'categories_pooled':dict(Counter(categories[r][u] for r in labels for u in units if labels[r][u])),
 'per_condition_detector':{},
 'ratings_by_generation_condition':{},
 'ratings_raw':ratings,
}
for cond in sorted({v['true_condition'] for v in key.values()}):
    sub=[u for u in units if key[u[0]]['true_condition']==cond]
    out['per_condition_detector'][cond]={name:metric(pred,ref,sub) for name,ref in refs.items()}
    out['ratings_by_generation_condition'][cond]={}
    for r in labels:
        table=defaultdict(list)
        for tid,rats in ratings[r].items():
            if key[tid]['true_condition']==cond:
                for dim,val in rats.items():
                    table[dim].append(val)
        out['ratings_by_generation_condition'][cond][r]={dim:{'n':sum(isinstance(x,(float,int)) for x in vals),'mean':mean([x for x in vals if isinstance(x,(float,int))]) if any(isinstance(x,(float,int)) for x in vals) else None,'missing':sum(x is None for x in vals)} for dim,vals in table.items()}

seed_m=out['panel_b']['Seeded']
sens, fpr = seed_m['recall'], 1-seed_m['specificity']
out['hypothetical_ppv_at_lower_prevalence_assuming_fixed_sensitivity_specificity']={str(p):sens*p/(sens*p+fpr*(1-p)) for p in [0.5,0.2,0.1,0.05,0.01]}
out['appropriate_flags_clinician_support']={name:sum(pred[u] and ref[u] for u in subsets['Appropriate']) for name,ref in refs.items()}
out['seeded_rater_positive_by_turn_index']={r:[sum(labels[r][(tid,i)] for tid in key if seed[(tid,i)]) for i in range(1,16)] for r in labels}
Path('/tmp/llmpatient_misstep_audit.json').write_text(json.dumps(out,indent=2))
print(json.dumps({k:v for k,v in out.items() if k not in ['ratings_raw','seeded_rater_positive_by_turn_index']},indent=2))
