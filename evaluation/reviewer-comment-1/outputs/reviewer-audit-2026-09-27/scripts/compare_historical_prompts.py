from pathlib import Path
import ast,hashlib,json,subprocess,sys,types
ROOT=Path('/Users/marco/Sites/LLMPatients-Agent')
OUT=Path('/tmp/llmpatient-reviewer-audit/historical_prompt_comparison.json')
sys.path.insert(0,str(ROOT))
from agent.core import questionnaire_runner as current
from agent.core.patient_profile import PatientProfile,PatientDetails
import yaml
ref='7a37818'
old_source=subprocess.check_output(['git','-C',str(ROOT),'show',ref+':agent/core/questionnaire_runner.py'],text=True)
old_namespace={'__file__':str(ROOT/'agent/core/questionnaire_runner.py'),'__name__':'audit_historical_questionnaire'}
exec(compile(old_source,'historical_questionnaire_runner.py','exec'),old_namespace)
records=[]
for patient in ['alex_carter_001','crystal_smith_001','daniel_isherwood_001','jason_smith_001','juanita_delgado_001']:
 old_bytes=subprocess.check_output(['git','-C',str(ROOT),'show',f'{ref}:data/patients/{patient}.yaml'])
 old_profile_file=Path('/tmp/llmpatient-reviewer-audit')/f'historical_{patient}.yaml';old_profile_file.write_bytes(old_bytes)
 old=old_namespace['QuestionnaireRunner'].__new__(old_namespace['QuestionnaireRunner'])
 old.profile=PatientProfile.from_file(str(old_profile_file));old.q_def=yaml.safe_load(subprocess.check_output(['git','-C',str(ROOT),'show',f'{ref}:data/questionnaires/phq9.yaml'],text=True))
 now=current.QuestionnaireRunner.__new__(current.QuestionnaireRunner)
 now.profile=PatientProfile.from_file(str(ROOT/f'data/patients/{patient}.yaml'));now.q_def=yaml.safe_load((ROOT/'data/questionnaires/phq9.yaml').read_text())
 checks=[]
 for o,n in zip(old.q_def['items'],now.q_def['items']):
  op=old._build_single_prompt(o,old._build_patient_context(),old.profile.name,o.get('scale_override') or old.q_def['scale'])
  np=now._build_single_prompt(n,now._build_patient_context(),now.profile.name,n.get('scale_override') or now.q_def['scale'])
  checks.append({'item':o['id'],'byte_identical':op==np,'old_sha256':hashlib.sha256(op.encode()).hexdigest(),'current_sha256':hashlib.sha256(np.encode()).hexdigest()})
 records.append({'patient':patient,'all_prompts_identical':all(c['byte_identical'] for c in checks),'items':checks})
OUT.write_text(json.dumps({'historical_commit':ref,'method':'historical runner source and historical patient/questionnaire files, with current PatientProfile methods; AST identity of context methods independently confirmed','results':records},indent=2))
print(json.dumps({x['patient']:x['all_prompts_identical'] for x in records},indent=2))
