"""Seal a completed descriptive comparison, with immutable source/export chain."""
from pathlib import Path
import hashlib,json
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[1];REPO=ROOT.parents[1]
def read(p):return json.loads(Path(p).read_text())
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def main():
 frozen=read(ROOT/'manifest.json')
 for rel,h in frozen['files'].items():assert sha(ROOT/rel)==h,rel
 for p,h in frozen['source_files'].items():assert sha(p)==h,p
 r=read(ROOT/'analysis/results.json');state=read(ROOT/'runtime/state.json');runtime=read(ROOT/'analysis/runtime-verification.json')
 assert r['status']==state['status']=='completed'
 assert r['complete_unique_generations']==r['planned_unique_generations']==state['completed']==30
 assert r['mapped_comparisons']==120 and len(r['cells'])==24
 audit=read(ROOT/'audit/final-results-review.json')
 assert audit.get('status')=='passed',audit.get('status')
 visual=read(ROOT/'audit/visual-verification.json')
 assert visual['pdf_sha256']==sha(REPO/'output/pdf/response_to_reviewer_comment_1.pdf')
 assert visual['tex_sha256']==sha(REPO/'response_to_reviewer_comment_1.tex')
 assert visual['plot_sha256']==sha(ROOT/'figures/paired-regional-recall.png')
 assert not visual['layout_findings'] and visual['overfull_box_warnings']==0
 checkpoint=read(ROOT/'previous-review-response/checkpoint.json')
 for rel,meta in checkpoint['files'].items():assert sha(ROOT/meta['saved_path'])==meta['sha256']
 files={str(p.relative_to(ROOT)):sha(p) for p in sorted(ROOT.rglob('*')) if p.is_file() and '__pycache__' not in p.parts and p.name!='final-manifest.json'}
 result={'created_at':datetime.now(timezone.utc).isoformat(),'status':'completed','scope':'Persistent native EvidenceMemory component on the same incoming regional histories; not full application graph',
  'files':files,'deliverables':{rel:sha(REPO/rel) for rel in ('response_to_reviewer_comment_1.tex','output/pdf/response_to_reviewer_comment_1.pdf')},
  'source_files':frozen['source_files'],'frozen_files_verified':len(frozen['files']),'source_files_verified':len(frozen['source_files']),
  'unique_generation_calls':30,'source_contexts':30,'mapped_baseline_comparisons':120,'comparison_cells':24,
  'native_http_requests':r['http_requests'],'native_api_errors':r['http_errors'],'native_observed_cost_usd':r['observed_new_cost_usd'],
  'baseline_new_calls':0,'review_disagreement_categories':r['disagreement_categories'],
  'preceding_baseline_final_manifest_sha256':sha(ROOT.parent/'regional-memory-compression-2026-09-30/final-manifest.json'),
  'preceding_export_checkpoint':checkpoint,'prior_archive_verification':'audit/prior-archives-verification.json',
  'final_report_audit':'audit/final-results-review.json','visual_verification':'audit/visual-verification.json',
  'publication_status':'Local working copy only; no commit, push or external publication performed.'}
 with (ROOT/'final-manifest.json').open('x') as f:json.dump(result,f,ensure_ascii=False,indent=2);f.write('\n')
 for rel,h in result['files'].items():assert sha(ROOT/rel)==h
 print(json.dumps({'sealed_files':len(files),'manifest_sha256':sha(ROOT/'final-manifest.json'),'unique_generations':30,'mapped_comparisons':120}))
if __name__=='__main__':main()
