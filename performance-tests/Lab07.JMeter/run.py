"""Nuestro equipo: ejecutamos JMeter únicamente contra la copia local de eShopOnWeb."""
from pathlib import Path
import subprocess as sp,os,sys,time,json,urllib.request as u,urllib.error,csv,uuid,datetime,argparse,xml.etree.ElementTree as E,re,platform,socket
p=argparse.ArgumentParser();p.add_argument('--phase',choices=['preliminar','carga100','carga300','assert1ms'],required=True);p.add_argument('--dotnet',required=True);p.add_argument('--jmeter',required=True);p.add_argument('--java',default='java');p.add_argument('--work',required=True);p.add_argument('--output');p.add_argument('--hold',action='store_true');a=p.parse_args()
root=Path(__file__).resolve().parents[2];work=Path(a.work).resolve()/a.phase;work.mkdir(parents=True,exist_ok=True)
out=(Path(a.output).resolve() if a.output else root/'docs/lab07-rendimiento/resultados')/a.phase;out.mkdir(parents=True,exist_ok=True)
if (out/'aggregate.csv').exists():raise RuntimeError('Ya existe esta ejecución: conservar resultados y elegir otra copia para repetirla.')
phase=a.phase;loops=1 if phase in ['preliminar','assert1ms'] else 10
sizes=dict(zip(['list','filter','create','edit','delete','basket'],[1]*6 if phase=='preliminar' else [1,0,0,0,0,0] if phase=='assert1ms' else [10,20,20,20,10,20] if phase=='carga100' else [30,60,60,60,30,60]))
ramp=1 if phase in ['preliminar','assert1ms'] else 10;think=50 if phase in ['preliminar','assert1ms'] else 1000
env=dict(os.environ,DOTNET_ROOT=str(Path(a.dotnet).resolve().parent),ASPNETCORE_ENVIRONMENT='Development',UseOnlyInMemoryDatabase='true',SeedDemoUsers='true',Logging__LogLevel__Default='Warning',baseUrls__webBase='http://127.0.0.1:5197/',baseUrls__apiBase='http://127.0.0.1:5198/api/')
op=u.build_opener(u.ProxyHandler({}));processes=[];logs=[]
def call(path,method='GET',payload=None,token=None):
 headers={'Content-Type':'application/json'} if payload is not None else {}
 if token:headers['Authorization']='Bearer '+token
 req=u.Request('http://127.0.0.1:5198'+path,method=method,headers=headers,data=None if payload is None else json.dumps(payload).encode())
 with op.open(req,timeout=20) as res:
  b=res.read();return json.loads(b) if b else {}
try:
 for port in [5197,5198]:
  with socket.socket() as probe:
   probe.settimeout(1)
   if probe.connect_ex(('127.0.0.1',port))==0:raise RuntimeError(f'El puerto {port} está ocupado; no usaremos un servidor ajeno.')
 for name,port,probe in [('PublicApi',5198,'/api/catalog-brands'),('Web',5197,'/')]:
  log=(work/(name+'.log')).open('w',encoding='utf-8');logs.append(log)
  proc=sp.Popen([str(Path(a.dotnet).resolve()),'bin/Debug/net10.0/'+name+'.dll','--urls',f'http://127.0.0.1:{port}'],cwd=root/'src'/name,env=env,stdout=log,stderr=sp.STDOUT,creationflags=getattr(sp,'CREATE_NO_WINDOW',0));processes.append(proc)
  for i in range(60):
   if proc.poll() is not None:raise RuntimeError(name+' no inició. Revisar registro local.')
   try:
    with op.open(f'http://127.0.0.1:{port}'+probe,timeout=2) as res:
     if res.status==200:break
   except OSError:time.sleep(1)
  else:raise RuntimeError('Servidor no disponible')
 print('Ambos servidores locales responden HTTP 200.',flush=True)
 # Credencial pública de demostración incluida en el código original, no una cuenta personal.
 seed=(root/'src/ApplicationCore/Constants/AuthorizationConstants.cs').read_text(encoding='utf-8-sig')
 password=re.search(r'DEFAULT_PASSWORD\s*=\s*"([^"]+)"',seed).group(1)
 token=call('/api/authenticate','POST',{'username':'productmgr@microsoft.com','password':password})['token']
 assert token
 pre={}
 for kind in ['edit','delete']:
  rows=[]
  for i in range(sizes[kind]*loops):
   name='Lab07-'+kind+'-'+uuid.uuid4().hex
   d=call('/api/catalog-items','POST',{'name':name,'description':'Preparacion aislada de nuestro equipo','price':25.5,'catalogBrandId':1,'catalogTypeId':2,'pictureUri':'eCatalog-item-default.png','pictureBase64':'','pictureName':''},token)['catalogItem']
   rows.append((d['id'],name))
  with (work/(kind+'.csv')).open('w',newline='',encoding='utf-8') as f:
   writer=csv.writer(f);writer.writerow(['itemId','itemName']);writer.writerows(rows)
  pre[kind]=rows
 (work/'runtime.properties').write_text('token='+token+'\ndataDir='+work.as_posix()+'\n',encoding='utf-8')
 params=['-J'+k+'Users='+str(v) for k,v in sizes.items()]+[f'-Jramp={ramp}',f'-Jloops={loops}',f'-Jthink={think}','-Jserial='+str(phase in ['preliminar','assert1ms']).lower(),'-JlistLimit='+('1' if phase=='assert1ms' else '1000')]
 jar=Path(a.jmeter).resolve()/'bin/ApacheJMeter.jar'
 args=[a.java,'-Xms256m','-Xmx1536m','-jar',str(jar),'-n','-t',str(Path(__file__).with_name('Lab07_eShopOnWeb.jmx')),'-q',str(work/'runtime.properties'),'-l',str(out/'aggregate.csv'),'-j',str(work/'jmeter.log'),'-e','-o',str(out/'dashboard'),'-Jjmeter.reportgenerator.overall_granularity=1000','-Jjmeter.save.saveservice.subresults=false']+params
 # Un listener XML guarda el registro de peticiones y respuestas, además del CSV del dashboard.
 base=E.parse(Path(__file__).with_name('Lab07_eShopOnWeb.jmx'));ht=base.getroot().find('hashTree/hashTree')
 base.getroot().find("hashTree/TestPlan/boolProp[@name='TestPlan.serialize_threadgroups']").text=str(phase in ['preliminar','assert1ms']).lower()
 rc=E.SubElement(ht,'ResultCollector',{'guiclass':'SimpleDataWriter','testclass':'ResultCollector','testname':'Registro XML','enabled':'true'})
 E.SubElement(rc,'boolProp',{'name':'ResultCollector.error_logging'}).text='false'
 obj=E.SubElement(rc,'objProp');E.SubElement(obj,'name').text='saveConfig';cfg=E.SubElement(obj,'value',{'class':'SampleSaveConfiguration'})
 for key in ['time','latency','timestamp','success','label','code','message','threadName','dataType','assertions','subresults','responseData','samplerData','xml','fieldNames','bytes','sentBytes','url','threadCounts','idleTime','connectTime']:
  E.SubElement(cfg,key).text='true'
 for key in ['encoding','responseHeaders','requestHeaders','responseDataOnError']:
  E.SubElement(cfg,key).text='false'
 E.SubElement(cfg,'assertionsResultsToSave').text='2'
 E.SubElement(rc,'stringProp',{'name':'filename'}).text=str(work/'registro.xml');E.SubElement(ht,'hashTree')
 transient=work/'ejecucion.jmx';base.write(transient,encoding='utf-8',xml_declaration=True);args[args.index('-t')+1]=str(transient)
 start=datetime.datetime.now(datetime.timezone.utc).isoformat()
 print(f'JMeter: {phase}, {sum(sizes.values())} usuarios configurados, {loops} iteraciones.',flush=True)
 if (work/'registro.xml').exists():(work/'registro.xml').rename(work/('registro-anterior-'+str(time.time_ns())+'.xml'))
 with (out/'ejecucion.log').open('w',encoding='utf-8') as log:code=sp.call(args,stdout=log,stderr=sp.STDOUT,creationflags=getattr(sp,'CREATE_NO_WINDOW',0))
 if code:raise RuntimeError('JMeter terminó con código '+str(code))
 # Guardamos respuestas reales retirando únicamente identificadores de sesión y tokens efímeros.
 text=(work/'registro.xml').read_text(encoding='utf-8')
 text=text.replace(token,'[TOKEN_OMITIDO]')
 text=re.sub(r'(__RequestVerificationToken=)[^&\s<]+',r'\1[TOKEN_OMITIDO]',text)
 text=re.sub(r'(name=&quot;__RequestVerificationToken&quot; type=&quot;hidden&quot; value=&quot;)[^&]+',r'\1[TOKEN_OMITIDO]',text)
 text=re.sub(r'(name="__RequestVerificationToken" type="hidden" value=")[^"]+',r'\1[TOKEN_OMITIDO]',text)
 text=re.sub(r'((?:Cookie|Set-Cookie):)[^\r\n<]+',r'\1 [COOKIE_OMITIDA]',text,flags=re.I)
 (out/'registro.xml').write_text(text,encoding='utf-8')
 items=call('/api/catalog-items?PageSize=0&PageIndex=0')['catalogItems'];byid={d['id']:d for d in items}
 verify={'creados':sum(d['name'].startswith('Lab07-CREATE-') for d in items),'editados':0,'eliminados':0,'errores':[]}
 for ident,name in pre['edit']:
  d=byid.get(ident,{})
  if d.get('price')==35.5:verify['editados']+=1
  else:verify['errores'].append('Precio incorrecto: '+str(ident))
 for ident,name in pre['delete']:
  if ident not in byid:verify['eliminados']+=1
  else:verify['errores'].append('No eliminado: '+str(ident))
 (out/'verificacion.json').write_text(json.dumps(verify,indent=2),encoding='utf-8')
 (out/'entorno.json').write_text(json.dumps({'phase':phase,'startUtc':start,'endUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'threads':sizes,'loops':loops,'rampSeconds':ramp,'thinkMs':think,'durationAssertionListMs':1 if phase=='assert1ms' else 1000,'exitCode':code,'os':platform.platform(),'logicalProcessors':os.cpu_count(),'jmeter':'5.6.3','sourceCommit':'193ad11','database':'InMemory: almacenes separados para Web y API','configuration':'Debug / Development','authentication':'ProductManager demo, token obtenido antes de la carga','scope':'HTTP local; sin recursos estáticos ni renderizado de navegador; seis funciones seleccionadas'},indent=2,ensure_ascii=False),encoding='utf-8')
 print('Ejecución y verificación terminadas: '+str(out),flush=True)
 if a.hold:
  print('Aplicación disponible para capturas. Crear archivo stop en '+str(work)+' para finalizar.',flush=True)
  while not (work/'stop').exists():time.sleep(2)
finally:
 for proc in processes:
  if proc.poll() is None:proc.terminate();proc.wait()
 for log in logs:log.close()
 if (work/'runtime.properties').exists():(work/'runtime.properties').unlink()
