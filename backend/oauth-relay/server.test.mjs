import test from 'node:test';
import assert from 'node:assert/strict';
import {createRelay} from './server.mjs';
test('PKCE relay isolates readers, expires flows, and stores only codes',async()=>{
 let now=1000;const server=createRelay({now:()=>now,ttl:100});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  const flow=await(await fetch(base+'/flows',{method:'POST'})).json();
  assert.equal((await fetch(base+'/flows/'+flow.id)).status,404);
  assert.equal((await fetch(base+'/callback?id='+flow.id+'&proof=wrong&code=stolen')).status,400);
  const headers={Authorization:'Bearer '+flow.reader};
  assert.equal((await(await fetch(base+'/flows/'+flow.id,{headers})).json()).code,null);
  assert.equal((await fetch(base+'/callback?id='+flow.id+'&proof='+flow.writer+'&code=pkce-bound-code')).status,200);
  assert.equal((await(await fetch(base+'/flows/'+flow.id,{headers})).json()).code,'pkce-bound-code');
  now=1101;assert.equal((await fetch(base+'/flows/'+flow.id,{headers})).status,404);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

