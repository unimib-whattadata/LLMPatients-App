"""Verify every exported original byte; optionally materialize an empty directory.

Python standard library only. Never contacts a model or reads credentials.
"""
from pathlib import Path, PurePosixPath
import argparse, hashlib, json, shutil, tarfile

def digest(stream):
 h=hashlib.sha256();n=0
 for block in iter(lambda:stream.read(1024*1024),b''):h.update(block);n+=len(block)
 return h.hexdigest(),n
def safe(name):
 p=PurePosixPath(name)
 if p.is_absolute() or '..' in p.parts:raise ValueError('Unsafe member path')
 return p
def verify(root,extract=None):
 manifest=json.loads((root/'MANIFEST.json').read_text());entries=manifest['files'];seen=set()
 if extract:
  if extract.exists() and any(extract.iterdir()):raise ValueError('Extraction destination must be empty')
  extract.mkdir(parents=True,exist_ok=True)
 for name,info in manifest.get('control_files',{}).items():
  with (root/safe(name)).open('rb') as stream:actual,size=digest(stream)
  if actual!=info['sha256'] or size!=info['bytes']:raise ValueError('Control file differs: '+name)
 for name,info in entries.items():
  safe(name)
  if info.get('member'):continue
  with (root/safe(info['storage'])).open('rb') as stream:actual,size=digest(stream)
  if actual!=info['sha256'] or size!=info['bytes']:raise ValueError('File differs: '+name)
  seen.add(name)
  if extract:
   target=extract/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(root/info['storage'],target)
 for bundle,expected in manifest['bundles'].items():
  with (root/safe(bundle)).open('rb') as stream:actual,size=digest(stream)
  if actual!=expected['sha256'] or size!=expected['bytes']:raise ValueError('Bundle differs: '+bundle)
  count=0
  with tarfile.open(root/bundle,'r|gz') as archive:
   for member in archive:
    safe(member.name)
    if not member.isfile() or member.name in seen:raise ValueError('Invalid/duplicate archive member')
    info=entries.get(member.name)
    if not info or info.get('storage')!=bundle or info.get('member')!=member.name:raise ValueError('Uninventoried member')
    with archive.extractfile(member) as stream:
     if extract:
      target=extract/member.name;target.parent.mkdir(parents=True,exist_ok=True)
      h=hashlib.sha256();n=0
      with target.open('xb') as output:
       for block in iter(lambda:stream.read(1024*1024),b''):h.update(block);n+=len(block);output.write(block)
      actual,size=h.hexdigest(),n
     else:actual,size=digest(stream)
    if actual!=info['sha256'] or size!=info['bytes']:raise ValueError('Member differs: '+member.name)
    seen.add(member.name);count+=1
  if count!=expected['members']:raise ValueError('Member count differs')
 if seen!=set(entries):raise ValueError('Missing exported files')
 return {'status':'verified','original_files':len(seen),'original_bytes':sum(v['bytes'] for v in entries.values()),
         'bundles':len(manifest['bundles']),'extracted_to':str(extract) if extract else None,
         'scope':'Exported byte integrity and coverage only; not clinical or scientific certification.'}

if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--package-root',type=Path,default=Path(__file__).resolve().parent)
 p.add_argument('--extract',type=Path);a=p.parse_args();print(json.dumps(verify(a.package_root.resolve(),a.extract.resolve() if a.extract else None),indent=2))
