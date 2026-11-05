"use client";
import { useEffect, useState } from "react";
import type { ExamTemplate } from "@/lib/kairo/types";
import { bakuToISO, scheduleError, scheduleKeys, schedulePreset, type ScheduleKey, type TournamentSchedule } from "@/lib/kairo/tournament-schedule";
import { Notice } from "./shared";

const dateLabels: Record<ScheduleKey, string> = {registration_opens:"Qeydiyyat açılır",registration_closes:"Qeydiyyat bağlanır",starts_at:"Yarış başlayır",ends_at:"Yarış bitir"};
const emptySchedule: TournamentSchedule = {registration_opens:"",registration_closes:"",starts_at:"",ends_at:""};
export function TournamentForm({templates,save}:{templates:ExamTemplate[];save:(p:object)=>Promise<void>}) {
  const eligible=templates.filter(t=>t.status==="published"&&t.sections.length===1&&[5,10,15,20].includes(t.sections[0].count));
  const [mode,setMode]=useState("async"),[templateId,setTemplateId]=useState(""),[schedule,setSchedule]=useState(emptySchedule),[participants,setParticipants]=useState(16),[questionTime,setQuestionTime]=useState(30),[error,setError]=useState(""),[busy,setBusy]=useState(false),[success,setSuccess]=useState(false);
  useEffect(()=>{queueMicrotask(()=>setSchedule(schedulePreset(new Date(),"soon","async")));},[]);
  const template=eligible.find(t=>t.id===(templateId||eligible[0]?.id));
  const validation=scheduleError(schedule,mode);
  function choosePreset(preset:"soon"|"tomorrow"|"weekend") {setSchedule(schedulePreset(new Date(),preset,mode));setSuccess(false);}
  const pretty=(value:string)=>{const iso=bakuToISO(value);return iso?new Intl.DateTimeFormat("az-AZ",{timeZone:"Asia/Baku",dateStyle:"medium",timeStyle:"short"}).format(new Date(iso)):"Tarix seçilməyib";};
  async function submit(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();setError("");setSuccess(false);
    if(validation){setError(validation);return;}if(!template){setError("Əvvəl bir fənnli, 5, 10, 15 və ya 20 suallıq şablon yayımla.");return;}
    const form=new FormData(e.currentTarget);setBusy(true);
    try {await save({tournament:{name:String(form.get("name")??"").trim(),mode,template_id:template.id,max_participants:participants,time_per_question:questionTime,...Object.fromEntries(scheduleKeys.map(key=>[key,bakuToISO(schedule[key])]))}});setSuccess(true);}
    catch(e){setError(e instanceof Error?e.message:"Turnir yaradılmadı.");}finally{setBusy(false);}
  }
  return <details className="admin-entry arena-create"><summary>+ Yeni Arena / turnir yarat</summary><form className="module-form" onSubmit={submit}>
    <header><p className="eyebrow">ARENA QURUCUSU</p><h2>Yarışı bir neçə addımda hazırla.</h2><p className="data-note">Bütün tarix və saatlar Bakı vaxtıdır (UTC+04:00). Cihazın saat qurşağı seçimləri dəyişmir.</p></header>
    <fieldset disabled={busy} className="arena-create-fields"><legend>01 / Yarışın formatı</legend>
      <label>Turnirin adı<input name="name" required minLength={3} maxLength={180} placeholder="Məsələn, 9-cu sinif Riyaziyyat kuboku"/></label>
      <div className="arena-mode-options">{[["async","Həftəlik sınaq","İştirakçılar açıq vaxt aralığında sınağı işləyir."],["knockout","Canlı pley-off","Qeydiyyat startda bağlanır, qaliblər növbəti raunda keçir."]].map(([value,title,description])=><label key={value} data-selected={mode===value}><input type="radio" name="mode" checked={mode===value} onChange={()=>{setMode(value);setSuccess(false);}}/><span><strong>{title}</strong><small>{description}</small></span></label>)}</div>
      <label>Sual şablonu<select required value={template?.id??""} onChange={e=>setTemplateId(e.target.value)}>{!eligible.length&&<option value="">Uyğun yayımlanmış şablon yoxdur</option>}{eligible.map(t=><option key={t.id} value={t.id}>{t.name} · {t.grade}-ci sinif · {t.sections[0].count} sual</option>)}</select></label>
      {template&&<p className="arena-template-info">{template.sections[0].subject} · {template.grade}-ci sinif · {template.sections[0].count} sual · {Math.round(template.duration_seconds/60)} dəqiqəlik sınaq</p>}
    </fieldset>
    <fieldset disabled={busy} className="arena-create-fields"><legend>02 / Təqvim və saatlar</legend><div className="module-actions"><button type="button" className="module-button" onClick={()=>choosePreset("soon")}>1 saat sonra</button><button type="button" className="module-button" onClick={()=>choosePreset("tomorrow")}>Sabah 18:00</button><button type="button" className="module-button" onClick={()=>choosePreset("weekend")}>Şənbə 18:00</button></div>
      <div className="arena-date-grid">{scheduleKeys.map((key,i)=><label key={key}><span><small>{String(i+1).padStart(2,"0")}</small> {dateLabels[key]}</span><input type="datetime-local" step={60} required value={schedule[key]} min={key==="registration_closes"?schedule.registration_opens:key==="ends_at"?schedule.starts_at:undefined} onChange={e=>{setSchedule(old=>({...old,[key]:e.target.value}));setSuccess(false);}}/></label>)}</div>
      <p className="data-note">Qeydiyyat açıldıqdan sonra bağlanmalı, yarış isə başladıqdan sonra bitməlidir. {mode==="knockout"?"Pley-off qeydiyyatı startdan gec bağlana bilməz.":"Sınaq rejimində yarış başladıqdan sonra da, bitənədək qeydiyyat açıq qala bilər."}</p>
      {validation&&schedule.registration_opens&&<p role="alert" className="danger-text">{validation}</p>}
    </fieldset>
    <fieldset disabled={busy} className="arena-create-fields"><legend>03 / İştirak və qaydalar</legend><div className="module-form-row"><label>İştirakçı limiti<input type="number" min={2} max={64} required value={participants} onChange={e=>setParticipants(Number(e.target.value))}/></label>{mode==="knockout"&&<label>Hər duel sualına vaxt<select value={questionTime} onChange={e=>setQuestionTime(Number(e.target.value))}>{[15,20,30,45,60,90].map(n=><option key={n} value={n}>{n} saniyə</option>)}</select></label>}</div>
      {mode==="knockout"&&<p className="data-note">Hər raund üçün ayrıca yoxlanmış sual dəsti tələb olunur. Materialın kifayət etməsi serverdə yoxlanılır.</p>}
    </fieldset>
    <section className="arena-create-summary" aria-label="Turnir xülasəsi"><h3>Yayımlanacaq yarış</h3><dl><div><dt>Başlayır</dt><dd>{pretty(schedule.starts_at)}</dd></div><div><dt>Bitir</dt><dd>{pretty(schedule.ends_at)}</dd></div><div><dt>İştirak</dt><dd>{participants} nəfər · {mode==="knockout"?"Pley-off":"Həftəlik sınaq"}</dd></div></dl></section>
    {error&&<Notice error>{error}</Notice>}{success&&<Notice>Turnir yaradıldı. Yarış siyahısı yeniləndi.</Notice>}
    <div className="module-actions"><button className="module-button primary" disabled={busy||!!validation||!template}>{busy?"Yaradılır…":"Turniri yarat"}</button><button className="module-button" type="button" disabled={busy} onClick={()=>{setSchedule(schedulePreset(new Date(),"soon",mode));setError("");setSuccess(false);}}>Vaxtları yenilə</button></div>
  </form></details>;
}

