const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),{webcrypto}=require('crypto');
(async()=>{
 let handler,authOK=true,secret='test-activation-code';const calls=[];
 const sandbox={Response,Request,TextEncoder,crypto:webcrypto,AbortSignal,Deno:{env:{get:key=>({SUPABASE_URL:'https://auth.example',SUPABASE_ANON_KEY:'test-key',PERSONAL_FEATURES_PASSWORD:secret})[key]},serve:fn=>handler=fn},fetch:async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(authOK?{id:'account-a'}:{}),{status:authOK?200:401});}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/../supabase/functions/personal-features-activate/index.ts','utf8'),sandbox);
 const request=(password,token='Bearer signed-in')=>new Request('https://example.test/activate',{method:'POST',headers:{Authorization:token,'Content-Type':'application/json'},body:JSON.stringify({password})});
 assert.equal((await handler(new Request('https://example.test',{method:'OPTIONS'}))).status,204);
 assert.equal((await handler(request(secret,''))).status,401);assert.equal(calls.length,0);
 assert.equal((await handler(request('incorrect'))).status,403);
 const result=await handler(request(secret));assert.equal(result.status,200);assert.deepEqual(await result.json(),{accountId:'account-a',enabled:true});assert.equal(result.headers.get('Cache-Control'),'no-store');assert.equal(calls.at(-1).options.headers.Authorization,'Bearer signed-in');
 authOK=false;assert.equal((await handler(request(secret))).status,401);authOK=true;
 assert.equal((await handler(request(null))).status,400);secret='';assert.equal((await handler(request('anything'))).status,503);
 console.log('PASS: activation requires valid authentication and server secret; handles wrong passwords, missing config and malformed input without returning credentials.');
})().catch(error=>{console.error(error);process.exit(1);});
