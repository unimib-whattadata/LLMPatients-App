"""Seal full saved-memory results, preserving prior runs and original stop."""
from pathlib import Path
import hashlib,json
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[1];REPO=ROOT.parents[1]
def read(p):return json.loads(Path(p).read_text())
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def main():
 frozen=read(ROOT/'manifest.json');amendment=read(ROOT/'manifest-amendment-01.json')
 for m in (frozen,amendment):
  for rel,h in m['files'].items():assert sha(ROOT/rel)==h,rel
 for p,h in frozen['source_files'].items():assert sha(p)==h,p
 r=read(ROOT/'analysis/results.json');state=read(ROOT/'runtime-02/state.json');v=read(ROOT/'audit/visual-verification.json')
 assert r['status']==state['status']=='completed' and state['completed']==r['planned_unique_generations']==30
 assert r['mapped_comparisons']==120 and len(r['cells'])==24
 audit=read(ROOT/'audit/final-results-review.json');assert audit.get('status') in ('pass','passed')
 for rel,h in audit['checked_file_sha256'].items():assert sha(REPO/rel)==h,rel
 assert v['pdf_sha256']==sha(REPO/'output/pdf/response_to_reviewer_comment_1.pdf') and v['tex_sha256']==sha(REPO/'response_to_reviewer_comment_1.tex')
 assert v['plot_sha256']==sha(ROOT/'figures/full-saved-memory-recall.png') and not v['layout_findings'] and v['overfull_box_warnings']==0
 checkpoint=read(ROOT/'previous-review-response/checkpoint.json')
 for rel,x in checkpoint['files'].items():assert sha(ROOT/x['saved_path'])==x['sha256']
 files={str(p.relative_to(ROOT)):sha(p) for p in sorted(ROOT.rglob('*')) if p.is_file() and '__pycache__' not in p.parts and p.name!='final-manifest.json'}
 result={'created_at':datetime.now(timezone.utc).isoformat(),'status':'completed','scope':'All saved durable-memory records and regional raw filler, no selection or truncation; OpenRouter compression explicitly disabled; not full-graph replay',
 'files':files,'deliverables':{p:sha(REPO/p) for p in ('response_to_reviewer_comment_1.tex','output/pdf/response_to_reviewer_comment_1.pdf')},'source_files':frozen['source_files'],
 'frozen_files_verified':len(frozen['files']),'amendment_files_verified':len(amendment['files']),'source_files_verified':len(frozen['source_files']),
 'planned_unique_requests':30,'complete_structured_responses':r['complete_unique_generations'],'capacity_rejected':sum(j['status']=='context_rejected' for j in r['unique_generations']),
 'mapped_baseline_comparisons':120,'comparison_cells':24,'complete_pairs':sum(c['paired_profiles'] for c in r['cells']),
 'native_http_requests':r['http_requests'],'native_api_errors':r['http_errors'],'native_observed_cost_usd':r['observed_new_cost_usd'],'baseline_new_calls':0,
 'review_disagreement_categories':r['disagreement_categories'],'first_capacity_rejection_inherited_without_retry':'001',
 'preceding_structured_final_manifest_sha256':sha(ROOT.parent/'structured-regional-comparison-2026-10-01/final-manifest.json'),
 'baseline_final_manifest_sha256':sha(ROOT.parent/'regional-memory-compression-2026-09-30/final-manifest.json'),
 'preceding_export_checkpoint':checkpoint,'prior_archive_verification':'audit/prior-archives-verification.json','final_report_audit':'audit/final-results-review.json','visual_verification':'audit/visual-verification.json',
 'publication_status':'Local working copy only; no commit, push or external publication.'}
 with (ROOT/'final-manifest.json').open('x') as f:json.dump(result,f,ensure_ascii=False,indent=2);f.write('\n')
 for rel,h in files.items():assert sha(ROOT/rel)==h,rel
 print(json.dumps({'sealed_files':len(files),'manifest_sha256':sha(ROOT/'final-manifest.json'),'complete_responses':r['complete_unique_generations']}))
if __name__=='__main__':main()
