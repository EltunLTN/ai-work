/* eslint-disable @typescript-eslint/no-require-imports -- Isolated domain tests. */
const {test}=require('node:test');const assert=require('node:assert/strict');const {generator}=require('./helpers/load-ai.cjs');
const api=generator(),{planEvidence,taskKey,planTaskCompletion,calendarDay}=api.load('lib/kairo/plan-evidence.ts');
const attempt=(id,correct,total=5,topic='İnteqrala giriş',date='2026-11-04T10:00:00Z')=>({attempt_id:id,subject:'Riyaziyyat',grade:'11',total,correct,submitted_at:date,topic_scores:[{topic,total,correct}]});
test('adaptive evidence uses recent persisted results and never invents missing topic knowledge',()=>{
 const result=planEvidence([attempt('new',2),attempt('unknown',5,5,'untrusted'),{...attempt('bad',9),topic_scores:[{topic:'İnteqrala giriş',correct:9,total:5}]}],['İnteqrala giriş']);
 assert.equal(result.accuracy,40);assert.deepEqual(result.weakTopics,['İnteqrala giriş']);assert.equal(result.topics.length,1);
 assert.equal(planEvidence([],['İnteqrala giriş']).accuracy,null);
});
test('new independent results change recommendations; only ten newest attempts are used',()=>{
 const old=Array.from({length:10},(_,i)=>attempt(String(i),5,5,'İnteqrala giriş','2026-10-01T10:00:00Z'));
 const weak=Array.from({length:10},(_,i)=>attempt('new'+i,1));
 assert.equal(planEvidence([...old,...weak],['İnteqrala giriş']).accuracy,20);
});
test('task completion is independent for each day and does not award knowledge accuracy',()=>{
 const days=[{day:1,topic:'İnteqrala giriş',tasks:['Nümunə həll et']},{day:2,topic:'İnteqrala giriş',tasks:['Nümunə həll et']}];
 const done={[taskKey(days[0].topic,days[0].tasks[0],1)]:true,unrelated:true};
 assert.equal(planTaskCompletion(days,done),50);assert.notEqual(taskKey('x','y',1),taskKey('x','y',2));
});
test('calendar dates follow Baku midnight and cross month boundaries correctly',()=>{
 assert.equal(calendarDay('2026-11-04T22:00:00Z',1),'2026-11-05');
 assert.equal(calendarDay('2026-11-29T10:00:00Z',4),'2026-12-02');
 assert.equal(calendarDay('invalid',1),'');
});
test('duel questions enforce the explicitly requested difficulty while retaining grade and curriculum',async()=>{
 const q={topic:'İnteqrala giriş',question:'∫ 2x dx nədir?',options:['x² + C','2x + C','x + C','2 + C'],correctIndex:0,explanation:'x² funksiyasının törəməsi 2x-dir.',difficulty:'medium'};
 const g=generator([[q],[{...q,difficulty:'hard'}]]);
 const [result]=await g.generateDiagnosticQuestions({grade:'11',subject:'Riyaziyyat',topics:[q.topic],count:1,difficulty:'hard'});
 assert.equal(result.difficulty,'hard');assert.equal(result.grade,'11');assert.equal(g.requests[0].requestedDifficulty,'hard');assert.equal(g.rawRequests.length,2);
});
