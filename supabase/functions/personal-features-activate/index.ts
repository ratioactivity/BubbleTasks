// The activation code lives only in a Supabase secret, never in public source.
const cors={'Access-Control-Allow-Origin':'https://ratioactivity.github.io','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
Deno.serve(async request=>{
  const reply=(status,value)=>new Response(JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(request.method!=='POST')return reply(405,{error:'Method not allowed.'});
  const authorization=request.headers.get('Authorization');if(!authorization?.startsWith('Bearer '))return reply(401,{error:'Sign in first.'});
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_ANON_KEY'),expected=Deno.env.get('PERSONAL_FEATURES_PASSWORD');
  if(!url||!key||!expected)return reply(503,{error:'The activation service needs its password configured.'});
  try{
    const userResponse=await fetch(url+'/auth/v1/user',{headers:{Authorization:authorization,apikey:key},signal:AbortSignal.timeout(10000)});
    if(!userResponse.ok)return reply(401,{error:'Please sign in again.'});
    const user=await userResponse.json();if(typeof user.id!=='string')return reply(401,{error:'Please sign in again.'});
    const body=await request.json().catch(()=>null);if(typeof body?.password!=='string'||body.password.length>256)return reply(400,{error:'Enter the activation password.'});
    // Compare fixed-size digests on the server; no password-derived value is returned.
    const digest=async value=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
    const [actual,wanted]=await Promise.all([digest(body.password),digest(expected)]);let difference=0;for(let i=0;i<wanted.length;i++)difference|=actual[i]^wanted[i];
    if(difference)return reply(403,{error:'Incorrect activation password.'});
    return reply(200,{accountId:user.id,enabled:true});
  }catch{return reply(503,{error:'Activation is temporarily unavailable. Please try again.'});}
});
