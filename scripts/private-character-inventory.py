"""Bounded private ZIP extraction; public output contains metadata, never assets."""
import sys,os,json,hashlib,zipfile,stat,re,struct,pathlib,urllib.parse
root=pathlib.Path(os.environ['PRIVATE_CHARACTER_DIR']);target=root/'input';target.mkdir(exist_ok=True)
MAX_TOTAL=8*1024**3;MAX_FILES=50000
ASSETS={'.fbx','.obj','.gltf','.glb','.mtl','.bin','.tga','.png','.jpg','.jpeg','.dds','.tif','.tiff','.bmp','.webp'}
models={'.fbx','.obj','.gltf','.glb'};entries=[];seen=set();total=0
with zipfile.ZipFile(root/'source.zip') as z:
 if len(z.infolist())>MAX_FILES:raise ValueError('Archive entry count exceeds limit')
 for f in z.infolist():
  if f.is_dir():continue
  n=f.filename.replace('\\','/');parts=n.split('/')
  if any(p in ('','..','.') or ':' in p or p.rstrip('. ')!=p or re.match(r'^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)',p,re.I) for p in parts) or n.startswith('/') or '\x00' in n:raise ValueError('Unsafe archive path')
  if stat.S_ISLNK(f.external_attr>>16):raise ValueError('Archive symlink refused')
  if n.casefold() in seen:raise ValueError('Duplicate case-insensitive archive entry')
  seen.add(n.casefold());total+=f.file_size
  if total>MAX_TOTAL or f.file_size>4*1024**3:raise ValueError('Archive expansion exceeds limit')
  dest=target.joinpath(*parts);dest.parent.mkdir(parents=True,exist_ok=True);h=hashlib.sha256();written=0
  with z.open(f) as src,open(dest,'xb') as out:
   while True:
    b=src.read(1024**2)
    if not b:break
    written+=len(b)
    if written>f.file_size:raise ValueError('Archive length exceeds declaration')
    h.update(b);out.write(b)
  if written!=f.file_size:raise ValueError('Truncated archive entry')
  entries.append({'path':n,'name':pathlib.PurePosixPath(n).name,'format':dest.suffix.lower(),'bytes':written,'sha256':h.hexdigest()})

def gltf_features(f):
 p=target/f['path']
 if f['format']=='.glb':
  with p.open('rb') as h:
   head=h.read(20)
   if len(head)!=20 or head[:4]!=b'glTF' or struct.unpack_from('<I',head,4)[0]!=2 or struct.unpack_from('<I',head,8)[0]!=f['bytes'] or head[16:20]!=b'JSON':raise ValueError('Invalid GLB header')
   size=struct.unpack_from('<I',head,12)[0]
   if size>64*1024**2 or size+20>f['bytes']:raise ValueError('Invalid GLB JSON chunk')
   j=json.loads(h.read(size))
 else:j=json.loads(p.read_text(encoding='utf-8-sig'))
 access=j.get('accessors',[]);primitives=[v for m in j.get('meshes',[]) for v in m.get('primitives',[])];triangles=0;uv=set();issues=[]
 for v in primitives:
  uv.update(k for k in v.get('attributes',{}) if k.startswith('TEXCOORD_'));a=v.get('indices',v.get('attributes',{}).get('POSITION'));count=access[a]['count'] if isinstance(a,int) and 0<=a<len(access) else 0;mode=v.get('mode',4)
  if mode==4:triangles+=count//3
  elif mode in (5,6):triangles+=max(0,count-2)
  if 'material' in v and not 0<=v['material']<len(j.get('materials',[])):issues.append('invalid-material-index')
 missing=0;external=0;embedded=0
 for item in j.get('images',[])+j.get('buffers',[]):
  uri=item.get('uri')
  if not uri or uri.startswith('data:'):embedded+=1;continue
  parsed=urllib.parse.urlparse(uri)
  if parsed.scheme:external+=1;continue
  q=(p.parent/urllib.parse.unquote(parsed.path)).resolve()
  if not q.is_relative_to(target.resolve()) or not q.is_file():missing+=1
 materials=[]
 for m in j.get('materials',[]):
  pbr=m.get('pbrMetallicRoughness',{});maps=[]
  for slot,t in [('baseColor',pbr.get('baseColorTexture')),('metallicRoughness',pbr.get('metallicRoughnessTexture')),('normal',m.get('normalTexture')),('occlusion',m.get('occlusionTexture')),('emissive',m.get('emissiveTexture'))]:
   if t:
    tr=t.get('extensions',{}).get('KHR_texture_transform',{});maps.append({'slot':slot,'textureIndex':t.get('index'),'uvSet':tr.get('texCoord',t.get('texCoord',0)),'transformed':bool(tr)})
  materials.append({'name':m.get('name'),'baseColorFactor':pbr.get('baseColorFactor',[1,1,1,1]),'extensionNames':list(m.get('extensions',{})),'specularGlossiness':m.get('extensions',{}).get('KHR_materials_pbrSpecularGlossiness'),'alphaMode':m.get('alphaMode','OPAQUE'),'alphaCutoff':m.get('alphaCutoff',.5),'doubleSided':m.get('doubleSided',False),'metallicFactor':pbr.get('metallicFactor',1),'roughnessFactor':pbr.get('roughnessFactor',1),'maps':maps})
 return {'extensionsUsed':j.get('extensionsUsed',[]),'extensionsRequired':j.get('extensionsRequired',[]),'primitiveMaterials':[{'mesh':m.get('name'),'materials':[p.get('material') for p in m.get('primitives',[])]} for m in j.get('meshes',[])],'meshes':len(j.get('meshes',[])),'primitives':len(primitives),'triangles':triangles,'uvSets':sorted(uv),'vertexColoredPrimitives':sum('COLOR_0' in v.get('attributes',{}) for v in primitives),'skins':len(j.get('skins',[])),'jointsPerSkin':[len(s.get('joints',[])) for s in j.get('skins',[])],'animations':len(j.get('animations',[])),'materials':materials,'images':len(j.get('images',[])),'textures':len(j.get('textures',[])),'samplers':j.get('samplers',[]),'missingExternalResources':missing,'remoteResources':external,'embeddedResources':embedded,'issues':issues}
characters={n:[] for n in ['Nikki','John Cena','John Marston','Rhea Ripley']};aliases={'Nikki':r'nikki','John Cena':r'cena','John Marston':r'marston','Rhea Ripley':r'rhea|ripley'}
public=[]
for f in entries:
 if f['format'] not in ASSETS:continue
 d={k:f[k] for k in ['name','format','bytes','sha256']};d['id']=f['sha256'][:16]
 if f['format'] in models:
  for n,pat in aliases.items():
   if re.search(pat,f['path'],re.I):characters[n].append(d['id'])
  if f['format'] in ('.glb','.gltf'):
   try:d['gltf']=gltf_features(f)
   except Exception as e:d['metadataError']=type(e).__name__
 public.append(d)
(root/'private-inventory.json').write_text(json.dumps({'files':entries,'inputDirectory':str(target)},indent=2))
summary={'status':'EXTRACTED','scope':'Archive metadata only; filename matches are not proof of visual identity','download':json.loads((root/'download.json').read_text()),'filesInArchive':len(entries),'expandedBytes':total,'assets':public,'characterModelCandidates':characters,'characterPresenceByFilename':{n:bool(ids) for n,ids in characters.items()},'originalAssetsPublished':False,'commercialScreenshotsPublished':False}
(root/'safe-inventory.json').write_text(json.dumps(summary,indent=2));print('Private archive extracted; asset count:',len(public),'model count:',sum(f['format'] in models for f in entries))
