/* eslint-disable @typescript-eslint/no-require-imports -- Isolated pure scheduling tests. */
const {test}=require('node:test'),assert=require('node:assert/strict'),{generator}=require('./helpers/load-ai.cjs');
const load=()=>generator().load('lib/kairo/tournament-schedule.ts');
test('Baku calendar values preserve the selected instant regardless of host timezone',()=>{
 const m=load();assert.equal(m.bakuToISO('2026-11-06T18:00'),'2026-11-06T14:00:00.000Z');assert.equal(m.bakuDateTime(new Date('2026-11-05T23:30:00Z')),'2026-11-06T03:30');
 for(const bad of ['','2026-02-30T12:00','2026-11-06T25:00','2026-11-06','invalid'])assert.equal(m.bakuToISO(bad),null);
});
test('tournament schedules reject every invalid chronology and distinguish async late registration from playoff',()=>{
 const m=load(),s={registration_opens:'2026-11-05T10:00',registration_closes:'2026-11-06T18:00',starts_at:'2026-11-06T18:00',ends_at:'2026-11-07T18:00'};
 assert.equal(m.scheduleError(s,'async'),'');assert.equal(m.scheduleError(s,'knockout'),'');
 for(const invalid of [{registration_opens:s.registration_closes},{ends_at:s.starts_at},{registration_closes:'2026-11-08T18:00'},{starts_at:''}])assert.ok(m.scheduleError({...s,...invalid},'async'));
 const late={...s,registration_closes:'2026-11-07T10:00'};assert.equal(m.scheduleError(late,'async'),'');assert.ok(m.scheduleError(late,'knockout'));
});
test('all quick presets create valid Baku schedules across month and year boundaries',()=>{
 const m=load();for(const now of ['2026-12-31T23:45:00Z','2026-11-07T19:00:00Z'])for(const mode of ['async','knockout'])for(const preset of ['soon','tomorrow','weekend']){const s=m.schedulePreset(new Date(now),preset,mode);assert.equal(m.scheduleError(s,mode),'');assert.ok(Date.parse(m.bakuToISO(s.starts_at))>Date.parse(now));if(preset==='weekend')assert.equal(new Date(Date.parse(m.bakuToISO(s.starts_at))+4*3600000).getUTCDay(),6);}
});

