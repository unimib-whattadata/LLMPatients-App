import ast
import hashlib
import json
import os
import re
import subprocess
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import yaml

paper = Path('/Users/marco/Sites/LLMPatient---APPLICATION')
app = Path('/Users/marco/Sites/LLMPatients-App')
agent = Path('/Users/marco/Sites/LLMPatients-Agent')
rev = '402edea570ae5f3f9e69af526a4ad0c4278c35a2'
legacy_path = 'evaluation/generate_real_transcripts.py'
source = subprocess.check_output(['git', '-C', str(paper), 'show', f'{rev}:{legacy_path}'], text=True)
snapshot = Path('/tmp/llmpatient_generate_real_transcripts_402edea.py')
snapshot.write_text(source)

# Execute only the reviewed pure prompt-construction code, with a local fake LLM.
names = {'get_nested','as_sentence_list','build_baseline_case_narrative','clean_patient_reply','env_positive_int','baseline_reply_token_budget','patient_reply_integrity_issues','baseline_turn','generate_baseline_transcript'}
tree = ast.parse(source)
fn = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in names]
module = ast.Module(body=[ast.ImportFrom(module='__future__',names=[ast.alias(name='annotations')],level=0),*fn],type_ignores=[])
namespace = {'Any':Any,'re':re,'os':os,'BASELINE_REPLY_MIN_CHARS':100,'BASELINE_REPLY_MIN_TOKENS':4096,'BASELINE_REPLY_MAX_ATTEMPTS':3,'COMPLETE_REPLY_END_RE':re.compile(r'[.!?…][)\x27"\]]*$')}
exec(compile(ast.fix_missing_locations(module),str(snapshot),'exec'),namespace)

patient_files = sorted((agent / 'data/patients').glob('*.yaml'))
included_details = {'familyHistory','educationAndEmployment','socialRelationshipsAndInteractions','treatmentsAndInterventions','behaviorDuringTestAdministration'}
fields={}
for path in patient_files:
    patient=yaml.safe_load(path.read_text())
    _, narrative=namespace['build_baseline_case_narrative'](patient)
    clinical=patient.get('clinical',{})
    fields[path.stem]={'narrative_chars':len(narrative),'included_detail_sections':sorted(set(clinical.get('details',{})) & included_details),'excluded_detail_sections':sorted(set(clinical.get('details',{}))-included_details),'has_emotion_traits':bool(clinical.get('emotionTraits')),'has_clinical_functioning':bool(clinical.get('details',{}).get('clinicalFunctioning'))}

fixture=yaml.safe_load((agent/'data/patients/daniel_isherwood_001.yaml').read_text())
namespace['load_patient_case']=lambda _ :fixture
class Stub:
    max_tokens=4096
    def __init__(self): self.prompts=[]
    def generate(self,prompt,**kwargs):
        self.prompts.append({'prompt':prompt,'kwargs':kwargs})
        return 'I have been thinking carefully about the difficulties I have described, and I want to understand them better. I would like to continue discussing these concerns with you.'

stub=Stub()
scripts=[SimpleNamespace(title=f'SESSION_{s}',messages=[f'UNIQUE_S{s}_TURN{t}' for t in range(1,6)]) for s in range(1,4)]
namespace['generate_baseline_transcript'](row=SimpleNamespace(patient_id='daniel_isherwood_001',transcript_id='TEST'),scripts=scripts,llm=stub)
probes=[]
for i,call in enumerate(stub.prompts):
    current_session=i//5+1
    markers=re.findall(r'UNIQUE_S(\d)_TURN(\d)',call['prompt'])
    assert all(int(s)==current_session for s,t in markers)
    probes.append({'call':i+1,'current_session':current_session,'therapist_markers_visible':len(markers),'older_session_markers_visible':sum(int(s)!=current_session for s,t in markers),'temperature':call['kwargs']['temperature'],'max_tokens':call['kwargs']['max_tokens']})

identical=[]
models={}
for i in range(1,21):
    tid=f'T{i:03}'
    old=subprocess.check_output(['git','-C',str(paper),'show',f'{rev}:evaluation/transcripts/{tid}.md'])
    current=(app/f'evaluation/misstep/transcripts/transcript_{tid}.md').read_bytes()
    identical.append({'transcript':tid,'exact_match_to_historic_commit':old==current})
    models[tid]=re.search(r'^Model name: (.+)$',current.decode(),flags=re.M).group(1)

out={'source_repo':str(paper),'source_commit':rev,'source_path':legacy_path,'snapshot':str(snapshot),'function_lines':{n.name:n.lineno for n in tree.body if isinstance(n,ast.FunctionDef)},'field_coverage_from_current_yaml':fields,'offline_prompt_history_probes':probes,'transcript_provenance':identical,'archived_patient_generation_model_headers':models}
Path('/tmp/llmpatient_baseline_audit.json').write_text(json.dumps(out,indent=2))
print(json.dumps(out,indent=2))
