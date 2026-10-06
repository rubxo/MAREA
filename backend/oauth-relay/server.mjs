import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const token = () => randomBytes(32).toString('hex');
const equal = (a,b) => typeof a==='string' && typeof b==='string' && a.length===b.length && timingSafeEqual(Buffer.from(a),Buffer.from(b));
export function createRelay({now=Date.now,ttl=300_000,maxFlows=500,allowedOrigin=process.env.OAUTH_ALLOWED_ORIGIN}={}) {
 const flows=new Map(); const attempts=new Map();
 const prune=()=>{for(const [id,flow] of flows)if(flow.expiresAt<=now())flows.delete(id);for(const [ip,entry]of attempts)if(entry.reset<=now())attempts.delete(ip);};
 const timer=setInterval(prune,30_000);timer.unref();
 const server=createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'");
  if(req.headers.origin){if(req.headers.origin!==allowedOrigin){res.writeHead(403);return res.end();}res.setHeader('Access-Control-Allow-Origin',allowedOrigin);res.setHeader('Vary','Origin');}
  if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE');res.setHeader('Access-Control-Allow-Headers','Authorization,Content-Type');res.writeHead(204);return res.end();}
  const url=new URL(req.url,'http://relay.invalid');prune();
  const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
  if(req.method==='GET'&&url.pathname==='/health')return json(200,{ok:true});
  if(req.method==='POST'&&url.pathname==='/flows'){
   const ip=req.socket.remoteAddress;const entry=attempts.get(ip)??{count:0,reset:now()+60_000};entry.count++;attempts.set(ip,entry);
   if(entry.count>12||flows.size>=maxFlows)return json(429,{error:'Intenta de nuevo en un minuto.'});
   const id=token(),reader=token(),writer=token(),expiresAt=now()+ttl;
   flows.set(id,{reader,writer,expiresAt,code:null,error:null});
   return json(201,{id,reader,writer,expiresAt});
  }
  const match=url.pathname.match(/^\/flows\/([a-f0-9]{64})$/);
  if(match){
   const flow=flows.get(match[1]);const bearer=req.headers.authorization?.replace(/^Bearer /,'');
   if(!flow||!equal(flow.reader,bearer))return json(404,{error:'Solicitud no disponible.'});
   if(req.method==='DELETE'){flows.delete(match[1]);res.writeHead(204);return res.end();}
   if(req.method==='GET')return json(200,{code:flow.code,error:flow.error,expiresAt:flow.expiresAt});
  }
  if(req.method==='GET'&&url.pathname==='/callback'){
   const flow=flows.get(url.searchParams.get('id'));
   if(!flow||!equal(flow.writer,url.searchParams.get('proof')))return json(400,{error:'Solicitud expirada.'});
   const code=url.searchParams.get('code');
   if(!flow.code&&!flow.error) {
    if(code&&code.length<=2048)flow.code=code;
    else flow.error='No se completó el acceso con Google. Inténtalo nuevamente.';
   }
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
   return res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Volver a Marea</title><style>body{font-family:system-ui;background:#14293d;color:white;padding:12vh 8vw;max-width:520px;margin:auto}h1{font-size:44px;letter-spacing:-2px}p{font-size:19px;line-height:1.5;color:#c4d8df}.mark{color:#f195a8;font-weight:bold}</style><p class="mark">marea</p><h1>Ya puedes volver.</h1><p>Cierra esta ventana y vuelve a Marea para terminar de entrar. Tu sesión se verifica en tu teléfono.</p>');
  }
  json(404,{error:'No encontrado'});
 });
 server.on('close',()=>clearInterval(timer));
 server.requestTimeout=10_000;server.headersTimeout=10_000;
 return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 createRelay().listen(Number(process.env.PORT??8787),'0.0.0.0',()=>console.log('Marea OAuth relay iniciado. /health disponible.'));
}

