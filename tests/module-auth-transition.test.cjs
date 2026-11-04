/* eslint-disable @typescript-eslint/no-require-imports -- Hook authorization regression without browser credentials. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
test('admin module data is cleared on sign-out and never retained after a denied new identity',async()=>{
 const states=[],effects=[];let authChange,student=false,holdNext=false,release;const listeners={};const mod={exports:{}};
 const db={auth:{getSession:async()=>({data:{session:{user:{id:student?'student':'admin'}}}}),onAuthStateChange:fn=>{authChange=fn;return {data:{subscription:{unsubscribe(){}}}};}},rpc:async()=>{const isStudent=student;if(holdNext){holdNext=false;await new Promise(resolve=>{release=resolve;});}return isStudent?{data:null,error:{code:'42501',message:'denied'}}:{data:{privateRows:['admin-only']},error:null};}};
 const mocks={react:{useState:initial=>{const i=states.length;states.push(typeof initial==='function'?initial():initial);return [states[i],value=>{states[i]=typeof value==='function'?value(states[i]):value;}];},useEffect:fn=>effects.push(fn),useCallback:fn=>fn},'@/lib/supabase/client':{getSupabase:()=>db}};
 const code=ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../lib/kairo/client.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInThisContext(`(function(require,module,exports,window,document){${code}\n})`)(name=>{if(!(name in mocks))throw Error(name);return mocks[name];},mod,mod.exports,{addEventListener(name,fn){listeners[name]=fn;},removeEventListener(){}},{hidden:false});
 mod.exports.useKairo('platform.admin.overview');const dispose=effects[0]();const flush=()=>new Promise(setImmediate);await flush();assert.deepEqual(states[0],{privateRows:['admin-only']});
 holdNext=true;listeners.online();await flush();
 authChange('SIGNED_OUT',null);await flush();assert.equal(states[0],null);assert.equal(states[2],'guest');release();await flush();assert.equal(states[0],null);assert.equal(states[2],'guest');
 student=true;authChange('SIGNED_IN',{user:{id:'student'}});await flush();assert.equal(states[0],null);assert.equal(states[2],'error');dispose();
});
