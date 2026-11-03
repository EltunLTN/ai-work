"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { WorkspaceHeading } from "@/components/layout/workspace-heading";
import { TextbookSelector } from "@/components/onboarding/selectors";
import { Button } from "@/components/ui/button";
import { getDefaultProfile, getGrades, getSubjects, getProfileForSelection, getTextbooksBySelection, isSupportedSelection, isSubject } from "@/lib/textbook-reference";
import { getStudentProfile, saveStudentProfile } from "@/lib/storage";
import { getExamSetup, saveExamSetup } from "@/lib/exam-session";
import { trackActivity } from "@/lib/activity-client";
import type { Grade, StudentProfile, Subject } from "@/lib/types";

export default function OnboardingPage() {
  const router = useRouter();
  const [grade, setGrade] = useState<Grade>(getDefaultProfile().grade);
  const [profiles, setProfiles] = useState<StudentProfile[]>([getDefaultProfile()]);
  const [active, setActive] = useState<Subject>("Riyaziyyat");
  const [count, setCount] = useState(8);
  const [error, setError] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subject = params.get("subject");
    const previous = getExamSetup();
    const saved = getStudentProfile();
    const requestedGrade = params.get("grade");
    if (isSubject(subject)) {
      const p = getProfileForSelection((getGrades().includes(requestedGrade as Grade) ? requestedGrade : saved?.grade ?? getDefaultProfile().grade) as Grade, subject);
      queueMicrotask(() => { setGrade(p.grade); setProfiles([p]); setActive(subject); });
    } else if (previous) {
      queueMicrotask(() => { setGrade(previous.grade); setProfiles(previous.profiles); setActive(previous.profiles[0].subject); setCount(previous.count); });
    } else if (saved && isSupportedSelection(saved.grade, saved.subject)) {
      queueMicrotask(() => { setGrade(saved.grade); setProfiles([saved]); setActive(saved.subject); });
    }
  }, []);
  const profile = profiles.find(p => p.subject === active) ?? profiles[0];
  function changeGrade(next: Grade) {
    const subjects = profiles.filter(p => isSupportedSelection(next, p.subject)).map(p => p.subject);
    if (!subjects.length) subjects.push("Riyaziyyat");
    setGrade(next); setProfiles(subjects.map(s => getProfileForSelection(next, s))); setActive(subjects[0]);
  }
  function toggleSubject(subject: Subject) {
    if (!isSupportedSelection(grade, subject)) return;
    if (profiles.some(p => p.subject === subject)) {
      if (profiles.length === 1) return;
      const next = profiles.filter(p => p.subject !== subject); setProfiles(next);
      if (active === subject) setActive(next[0].subject);
    } else { setProfiles([...profiles, getProfileForSelection(grade, subject)]); setActive(subject); }
  }
  function updateProfile(next: StudentProfile) { setProfiles(profiles.map(p => p.subject === next.subject ? next : p)); }
  function start() {
    try {
      saveStudentProfile(profiles[0]);
      saveExamSetup({ id: crypto.randomUUID(), grade, count, profiles });
      trackActivity("exam.configured", { grade, subjects: profiles.map(p => p.subject).join(","), count: count * profiles.length });
      router.push("/quiz");
    } catch { setError("Seçim saxlanmadı. Brauzerin yaddaşa girişini yoxlayın."); }
  }
  return <div className="kairo-page"><Navbar /><main id="main-content" tabIndex={-1} className="exam-builder mx-auto w-full max-w-6xl px-4 py-10 md:px-6">
    <WorkspaceHeading index="01 / SINAĞINI QUR" title="Bir sinif. Öz sınağın." description="Bir və ya bir neçə fənn seç. Hər fənnin mövzularını və sual sayını özün müəyyən et." />
    <div className="exam-builder-grid"><section className="kairo-card exam-selection">
      <div className="exam-basics"><label>Sinif<select className="account-field" value={grade} onChange={e => changeGrade(e.target.value as Grade)}>{getGrades().map(g => <option key={g} value={g}>{g}-ci sinif</option>)}</select></label><label>Hər fənn üçün sual sayı<input className="account-field" type="number" min={1} max={20} value={count} onChange={e => setCount(Math.max(1, Math.min(20, Math.trunc(Number(e.target.value) || 1))))} /></label></div>
      <fieldset><legend>Fənnlər · {profiles.length} seçilib</legend><div className="exam-subject-options">{getSubjects().map(s => { const supported = isSupportedSelection(grade, s), chosen = profiles.some(p => p.subject === s); return <label key={s} className={chosen ? "selected" : ""}><input type="checkbox" checked={chosen} disabled={!supported || (chosen && profiles.length === 1)} onChange={() => toggleSubject(s)} /><span>{s}<small>{supported ? (chosen ? "Sınağa daxildir" : "Əlavə et") : `${getGrades(s)[0]}-ci sinifdən başlayır`}</small></span></label>; })}</div></fieldset>
      <div className="exam-profile-tabs" role="group" aria-label="Mövzularını redaktə etdiyin fənn">{profiles.map(p => <button key={p.subject} aria-pressed={profile.subject === p.subject} onClick={() => setActive(p.subject)}>{p.subject}<small>{p.selectedTopics.length} mövzu</small></button>)}</div>
      <h2 className="text-xl font-semibold">{profile.subject} · mövzular və dərslik</h2>
      <TextbookSelector profile={profile} onSelect={id => { const book = getTextbooksBySelection(grade, profile.subject).find(b => b.id === id); if (book) updateProfile({ ...profile, textbookId: id, selectedTopics: book.topics.slice(0, 4) }); }} onToggleTopic={topic => { const next = profile.selectedTopics.includes(topic) ? profile.selectedTopics.filter(t => t !== topic) : [...profile.selectedTopics, topic]; if (next.length && next.length <= 20) updateProfile({ ...profile, selectedTopics: next }); }} />
    </section><aside className="kairo-card exam-receipt"><p className="eyebrow">SINAQ XÜLASƏSİ</p><h2>{count * profiles.length}<span>sual</span></h2><p>{grade}-ci sinif · {profiles.length} fənn</p><ul>{profiles.map(p => <li key={p.subject}><strong>{p.subject}</strong><span>{count} sual · {p.selectedTopics.length} mövzu</span></li>)}</ul><p className="kairo-muted text-sm">Hər fənn ayrıca qiymətləndirilir və tarixçədə saxlanır. Sual sayı hər fənnə tətbiq olunur. Səhifəni yeniləsən, hazır suallar və cavabların bu tabda qalır.</p><Button onClick={start} size="lg" className="w-full" data-activity="exam.start">Sınağı hazırla →</Button>{error && <p role="alert">{error}</p>}</aside></div>
  </main><Footer /></div>;
}
