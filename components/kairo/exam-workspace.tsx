"use client";
import Link from "next/link";
import { ExamStudyPlan } from "./exam-study-plan";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, ChevronLeft, ChevronRight, Check, CloudOff } from "lucide-react";
import { kairo, useKairo, useNow, clock, dateTime } from "@/lib/kairo/client";
import type {
  Answer,
  ExamState,
  ExamTemplate,
  SavedAnswer,
} from "@/lib/kairo/types";
import { LockedSurface, ModuleHeading, ModuleStatus, Notice } from "./shared";
import { QuestionReview, QuestionView } from "./question";
interface Catalog {
  templates: ExamTemplate[];
  history: Array<{
    id: string;
    name: string;
    status: string;
    started_at: string;
    earned: number | null;
    maximum: number | null;
    result_status: string | null;
  }>;
}
export function ExamLobby() {
  const q = useKairo<Catalog>("exam.catalog"),
    router = useRouter();
  const [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  const request = useRef<Record<string, string>>({});
  async function start(id: string) {
    setBusy(id);
    setError("");
    try {
      request.current[id] ??= crypto.randomUUID();
      const s = await kairo<ExamState>("exam.start", {
        template: id,
        request_id: request.current[id],
      });
      router.push(`/kairo/exam/session/${s.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <ModuleHeading
        eyebrow="01 / İmtahan"
        title="Bildiklərini sına."
        description="Server vaxtı, avtomatik yaddaş və mövzu üzrə nəticələr. Yazılı həllər ayrıca yoxlanılır."
      />
      <ModuleStatus {...q} retry={q.refresh} />
      {error && <Notice error>{error}</Notice>}
      {q.data && (
        <>
          <Notice>
            Hazırkı dəstlər Kairo-nun müəllif suallarıdır. DİM formatı yalnız
            rəsmi qaydalar, qiymətləndirmə və məzmun təsdiqlənəndən sonra ayrıca
            yayımlanır.
          </Notice>
          <div className="module-grid">
            {q.data.templates.map((t) => (
              <article className="module-card" key={t.id}>
                <div className="card-kicker">
                  {t.official_format
                    ? "Təsdiqlənmiş format"
                    : "Kairo məşq imtahanı"}{" "}
                  · v{t.version}
                </div>
                <h2>{t.name}</h2>
                <p>
                  {t.grade}-ci sinif ·{" "}
                  {t.sections.reduce((n, s) => n + s.count, 0)} sual ·{" "}
                  {Math.round(t.duration_seconds / 60)} dəqiqə
                </p>
                <div className="module-tags">
                  {t.sections.map((s, i) => (
                    <span key={i}>
                      {s.subject} · {s.count}
                    </span>
                  ))}
                  <span>{t.max_score} bal</span>
                </div>
                <p className="data-note">
                  {t.rules.instructions ??
                    "Vaxt bitəndə imtahan avtomatik yekunlaşır."}{" "}
                  {t.rules.calculator
                    ? "Kalkulyator: icazəlidir."
                    : "Kalkulyator: bu şablonda nəzərdə tutulmayıb."}{" "}
                  Formatlar:{" "}
                  {[...new Set(t.sections.flatMap((s) => s.types))].join(", ")}.
                </p>
                <button
                  className="module-button primary"
                  disabled={!!busy}
                  onClick={() => void start(t.id)}
                >
                  {busy === t.id ? "Hazırlanır…" : "İmtahana başla"}
                </button>
              </article>
            ))}
          </div>
          <section className="module-panel">
            <h2>İmtahan tarixçəsi</h2>
            {!q.data.history.length ? (
              <p>İlk imtahanından sonra nəticələr burada görünəcək.</p>
            ) : (
              <div className="module-table-wrap">
                <table className="module-table">
                  <thead>
                    <tr>
                      <th>İmtahan</th>
                      <th>Tarix</th>
                      <th>Nəticə</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {q.data.history.map((h) => (
                      <tr key={h.id}>
                        <td>{h.name}</td>
                        <td>{dateTime(h.started_at)}</td>
                        <td>
                          {h.status === "active"
                            ? "Davam edir"
                            : h.result_status === "provisional"
                              ? "Yazılı yoxlama gözləyir"
                              : `${h.earned ?? 0} / ${h.maximum ?? 0}`}
                        </td>
                        <td>
                          <Link href={`/kairo/exam/session/${h.id}`}>
                            {h.status === "active"
                              ? "Davam et"
                              : "Nəticəyə bax"}{" "}
                            ↗
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
export function ExamWorkspace({ id }: { id: string }) {
  const q = useKairo<ExamState>("exam.get", { id }),
    now = useNow();
  const [answers, setAnswers] = useState<Record<number, SavedAnswer>>({}),
    [index, setIndex] = useState(0),
    [saveStatus, setSaveStatus] = useState("Yadda saxlanılıb"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false);
  const pending = useRef<Record<number, SavedAnswer>>({}),
    initialized = useRef(""),
    revision = useRef(0),
    saving = useRef(false),
    state = useRef<ExamState | null>(null),
    indexRef = useRef(0),
    [offset, setOffset] = useState(0);
  const setData = q.setData;
  useEffect(() => {
    state.current = q.data;
    indexRef.current = index;
  }, [q.data, index]);
  const storageKey = `kairo-exam:${id}`;
  const flush = useCallback(async () => {
    if (
      saving.current ||
      !state.current ||
      state.current.status !== "active" ||
      (!Object.keys(pending.current).length &&
        state.current.current_index === indexRef.current)
    )
      return;
    saving.current = true;
    const batch = Object.values(pending.current);
    setSaveStatus("Saxlanılır…");
    try {
      const next = await kairo<ExamState>("exam.save", {
        id,
        answers: batch,
        index: indexRef.current,
      });
      for (const a of batch) {
        if (pending.current[a.ordinal]?.revision === a.revision)
          delete pending.current[a.ordinal];
      }
      try {
        if (Object.keys(pending.current).length)
          sessionStorage.setItem(storageKey, JSON.stringify(pending.current));
        else sessionStorage.removeItem(storageKey);
      } catch {}
      setData(next);
      setSaveStatus(
        Object.keys(pending.current).length
          ? "Dəyişikliklər gözləyir"
          : "Yadda saxlanılıb",
      );
      setError("");
    } catch (e) {
      setSaveStatus("Bağlantı gözlənilir");
      setError((e as Error).message);
    } finally {
      saving.current = false;
    }
  }, [id, storageKey, setData]);
  useEffect(() => {
    if (!q.data || initialized.current === id) return;
    initialized.current = id;
    revision.current = Date.now();
    queueMicrotask(() =>
      setOffset(Date.parse(q.data!.server_now) - Date.now()),
    );
    const restored = Object.fromEntries(
      q.data.answers.map((a) => [a.ordinal, a]),
    );
    if (q.data.status === "active") {
      try {
        const cache = JSON.parse(sessionStorage.getItem(storageKey) ?? "{}");
        for (const [key, value] of Object.entries(cache)) {
          const a = value as SavedAnswer;
          if (
            Number(key) >= 0 &&
            Number(key) < q.data.questions.length &&
            Number.isSafeInteger(a.revision) &&
            a.revision > (restored[Number(key)]?.revision ?? -1)
          ) {
            pending.current[Number(key)] = a;
            restored[Number(key)] = a;
            revision.current = Math.max(revision.current, a.revision + 1);
          }
        }
      } catch {}
    }
    queueMicrotask(() => {
      setAnswers(restored);
      setIndex(q.data?.current_index ?? 0);
    });
  }, [q.data, id, storageKey]);
  useEffect(() => {
    const timer = setInterval(() => {
      void flush();
    }, 1000);
    const online = () => void flush();
    window.addEventListener("online", online);
    const unload = (e: BeforeUnloadEvent) => {
      if (Object.keys(pending.current).length) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", unload);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", online);
      window.removeEventListener("beforeunload", unload);
    };
  }, [flush]);
  const remaining = q.data
    ? Math.max(0, (Date.parse(q.data.deadline) - now - offset) / 1000)
    : 0;
  const submit = useCallback(async () => {
    if (saving.current) return;
    setBusy(true);
    setError("");
    try {
      await flush();
      if (
        Object.keys(pending.current).length &&
        Date.now() + offset < Date.parse(state.current?.deadline ?? "")
      )
        throw new Error(
          "Cavablar hələ bazaya çatmayıb. Bağlantını bərpa edib yenidən göndər.",
        );
      const next = await kairo<ExamState>("exam.submit", { id });
      setData(next);
      pending.current = {};
      sessionStorage.removeItem(storageKey);
      setConfirm(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [flush, id, setData, storageKey, offset]);
  useEffect(() => {
    if (q.data?.status !== "active" || remaining > 0) return;
    const timer = setTimeout(() => void submit(), 1000);
    return () => clearTimeout(timer);
  }, [remaining, q.data?.status, submit]);
  function edit(value: Answer, marked?: boolean) {
    const a: SavedAnswer = {
      ordinal: index,
      value,
      marked: marked ?? answers[index]?.marked ?? false,
      revision: ++revision.current,
    };
    pending.current[index] = a;
    setAnswers((old) => ({ ...old, [index]: a }));
    setSaveStatus("Dəyişikliklər gözləyir");
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(pending.current));
    } catch {
      setSaveStatus("Yerli yaddaş bağlıdır; açıq saxla");
    }
  }
  if (!q.data) return <ModuleStatus {...q} retry={q.refresh} />;
  const s = q.data,
    active = s.status === "active",
    question = s.questions[index],
    unanswered = s.questions.filter(
      (x) =>
        answers[x.ordinal]?.value === undefined ||
        answers[x.ordinal]?.value === null ||
        answers[x.ordinal]?.value === "",
    ).length;
  if (!active)
    return (
      <>
        <ModuleHeading
          eyebrow="İmtahan / nəticə"
          title={s.template.name}
          description={`${dateTime(s.started_at)} · ${s.result?.status === "provisional" ? "Yazılı həll yoxlama gözləyir" : "İmtahan tamamlanıb"}`}
        />
        <div className="module-stats">
          <div>
            <strong>
              {s.result?.earned ?? 0}
              <small> / {s.result?.maximum ?? s.template.max_score}</small>
            </strong>
            <span>Toplanmış bal</span>
          </div>
          <div>
            <strong>{s.result?.correct ?? 0}</strong>
            <span>Düzgün cavab</span>
          </div>
          <div>
            <strong>{s.result?.unanswered ?? 0}</strong>
            <span>Cavabsız</span>
          </div>
          <div>
            <strong>{s.result?.pending ?? 0}</strong>
            <span>Yazılı yoxlama</span>
          </div>
          <div>
            <strong>
              {s.result?.total
                ? Math.round((s.result.correct / s.result.total) * 100)
                : 0}
              %
            </strong>
            <span>Dəqiqlik</span>
          </div>
          <div>
            <strong>
              {clock(
                s.submitted_at
                  ? Math.max(
                      0,
                      (Date.parse(s.submitted_at) - Date.parse(s.started_at)) /
                        1000,
                    )
                  : 0,
              )}
            </strong>
            <span>Ümumi imtahan vaxtı</span>
          </div>
        </div>
        <div className="module-actions">
          <Link className="module-button" href="/kairo/exam">
            Yeni imtahan
          </Link>
          <Link className="module-button" href="/kairo/university-goals">
            Hədəflərim
          </Link>
          <Link
            className="module-button"
            href="/kairo/focus?task=İmtahan%20səhvlərinin%20təhlili&return_path=/kairo/exam"
          >
            Fokusla təkrar et
          </Link>
        </div>
        <section className="module-panel">
          <h2>Fənnlər üzrə nəticə</h2>
          {s.result?.subjects.map((t) => (
            <div className="metric-row" key={t.subject}>
              <span>{t.subject}</span>
              <strong>
                {t.correct}/{t.total} · {t.earned}/{t.maximum} xam bal
              </strong>
              <progress value={t.correct} max={t.total} />
            </div>
          ))}
        </section>
        <section className="module-panel">
          <h2>Mövzular üzrə nəticə</h2>
          {s.result?.topics.map((t, i) => (
            <div className="metric-row" key={i}>
              <span>
                {t.subject} / {t.topic}
              </span>
              <strong>
                {t.correct}/{t.total}
              </strong>
              <progress value={t.correct} max={t.total} />
            </div>
          ))}
        </section>
        {s.status === "finalized" && s.mode === "exam" && s.result && (
          <ExamStudyPlan
            id={s.id}
            grade={s.template.grade}
            subjects={s.result.subjects.map((t) => t.subject)}
          />
        )}
        {s.can_reveal ? (
          <section>
            <h2>Cavabların təhlili</h2>
            {s.questions.map((x) => (
              <div key={x.ordinal}>
                <QuestionReview
                  question={x}
                  answer={
                    s.answers.find((a) => a.ordinal === x.ordinal)?.value ??
                    null
                  }
                />
                {x.correct === false && (
                  <Link
                    className="review-tutor-link"
                    href={`/kairo/tutor?question=${x.id}&subject=${encodeURIComponent(x.subject)}&topic=${encodeURIComponent(x.topic)}&grade=${x.grade}`}
                  >
                    AI müəllimlə addım-addım öyrən ↗
                  </Link>
                )}
              </div>
            ))}
          </section>
        ) : (
          <Notice>
            Arena bitənədək cavab açarları göstərilmir.{" "}
            <button onClick={q.refresh}>Yenilə</button>
          </Notice>
        )}
      </>
    );
  return (
    <>
      <LockedSurface active />
      <header className="exam-toolbar">
        <Link href="/kairo/exam" aria-label="İmtahan siyahısına qayıt">
          Kairo / {s.mode === "arena" ? "Arena" : "İmtahan"}
        </Link>
        <span>
          {index + 1} / {s.questions.length}
        </span>
        <strong
          className={remaining < 60 ? "danger-text" : ""}
          aria-label="Qalan vaxt"
        >
          {clock(remaining)}
        </strong>
        <button
          className="module-button primary"
          disabled={busy}
          onClick={() => setConfirm(true)}
        >
          Təhvil ver
        </button>
      </header>
      <h1 className="exam-active-title">{s.template.name}</h1>
      {remaining <= 300 && (
        <Notice>
          Son 5 dəqiqə. Cavab vərəqini və işarələdiyin sualları yoxla.
        </Notice>
      )}
      <div className="exam-layout">
        <section>
          <div className="exam-save-state" role="status">
            {saveStatus.includes("Bağlantı") ? (
              <CloudOff size={15} />
            ) : (
              <Check size={15} />
            )}{" "}
            {saveStatus}
          </div>
          {error && <Notice error>{error}</Notice>}
          {question && (
            <QuestionView
              question={question}
              value={answers[index]?.value ?? null}
              onChange={(value) => edit(value)}
              disabled={remaining <= 0}
            />
          )}
          <div className="exam-bottom">
            <button
              className="module-button"
              disabled={!index}
              onClick={() => setIndex((n) => n - 1)}
            >
              <ChevronLeft size={16} /> Əvvəlki
            </button>
            <button
              className="module-button"
              aria-pressed={!!answers[index]?.marked}
              onClick={() =>
                edit(answers[index]?.value ?? null, !answers[index]?.marked)
              }
            >
              <Flag size={16} />
              {answers[index]?.marked ? "İşarəni sil" : "Sonra bax"}
            </button>
            <button
              className="module-button"
              disabled={index >= s.questions.length - 1}
              onClick={() => setIndex((n) => n + 1)}
            >
              Növbəti <ChevronRight size={16} />
            </button>
          </div>
        </section>
        <aside className="exam-navigator">
          <h2>Cavab vərəqi</h2>
          <div>
            {s.questions.map((x) => (
              <button
                key={x.ordinal}
                aria-label={`Sual ${x.ordinal + 1}${answers[x.ordinal]?.marked ? ", işarələnib" : ""}`}
                aria-current={index === x.ordinal ? "step" : undefined}
                data-answered={
                  answers[x.ordinal]?.value !== undefined &&
                  answers[x.ordinal]?.value !== null &&
                  answers[x.ordinal]?.value !== ""
                }
                data-marked={!!answers[x.ordinal]?.marked}
                onClick={() => setIndex(x.ordinal)}
              >
                {x.ordinal + 1}
              </button>
            ))}
          </div>
          <p>
            {unanswered} cavabsız ·{" "}
            {Object.values(answers).filter((a) => a.marked).length} işarələnmiş
          </p>
          <small>
            Vaxt serverdə hesablanır. Səhifəni yeniləmək vaxtı sıfırlamır.
            İmtahan zamanı AI yardımı bağlıdır.
          </small>
        </aside>
      </div>
      {confirm && (
        <div className="module-modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-title"
            className="module-modal"
          >
            <h2 id="submit-title">İmtahanı təhvil ver?</h2>
            <p>
              {unanswered} sual cavabsızdır. Təhvil verdikdən sonra cavabları
              dəyişmək mümkün deyil.
            </p>
            <div className="module-actions">
              <button
                autoFocus
                className="module-button"
                onClick={() => setConfirm(false)}
              >
                Davam et
              </button>
              <button
                className="module-button primary"
                disabled={busy}
                onClick={() => void submit()}
              >
                {busy ? "Göndərilir…" : "Təhvil ver"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
