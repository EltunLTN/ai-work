/* eslint-disable @typescript-eslint/no-require-imports -- Isolated server lease regression tests. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path');
function loadRoute(duplicate){const calls=[],mod={exports:{}};const code=ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../app/api/ai/duel-questions/route.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const mocks={
 'next/server':{NextResponse:Response},'@/lib/ai-access':{requireAIAccess:async()=>null},'@/lib/ai/budget':{isAIBudgetError:()=>false,AI_BUDGET_MESSAGE:'budget'},
 '@/lib/kairo/server':{platformServer:()=>async op=>{calls.push(op);if(op==='duel.ai.claim'){if(duplicate)throw Error('already generating');return {generate:true,excluded:[]};}return {ok:true};}},
 '@/lib/textbook-reference':{isSupportedSelection:()=>true,getTextbooksBySelection:()=>[{topics:['İnteqrala giriş']}]},
 '@/lib/ai/client':{generateDiagnosticQuestions:async()=>{calls.push('inference');throw Error('provider unavailable');}},
 };vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(name=>{if(!(name in mocks))throw Error(name);return mocks[name];},mod,mod.exports);return {post:mod.exports.POST,calls};}
const request=()=>new Request('https://kairo.test/api/ai/duel-questions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({request_id:'00000000-0000-4000-a000-000000000001',settings:{subject:'Riyaziyyat',grade:11,count:5,seconds:30,difficulty:'mixed',topic:'İnteqrala giriş'}})});
test('a duplicate AI duel request cannot release the first request generation lease',async()=>{const g=loadRoute(true);assert.equal((await g.post(request())).status,503);assert.deepEqual(g.calls,['duel.ai.claim']);});
test('the lease owner releases its own failed generation without saving a duel',async()=>{const g=loadRoute(false);assert.equal((await g.post(request())).status,503);assert.deepEqual(g.calls,['duel.ai.claim','inference','duel.ai.fail']);});
