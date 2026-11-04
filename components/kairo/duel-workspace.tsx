"use client";
import Link from "next/link";
import { DuelStanding } from "./progress-overview";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { aiFetch, getSupabase } from "@/lib/supabase/client";
import { kairo, useKairo, useNow, clock, dateTime } from "@/lib/kairo/client";
import { getTextbooksBySelection, isSupportedSelection } from "@/lib/textbook-reference";
import type { Grade, Subject } from "@/lib/types";
import type {
  Answer,
  DuelState,
  DuelSettings,
  PublicPlayer,
} from "@/lib/kairo/types";
import {
  LockedSurface,
  ModuleHeading,
  ModuleStatus,
  Notice,
  PlayerAvatar,
} from "./shared";
import { QuestionReview, QuestionView } from "./question";
interface DuelCatalog {
  profile: PublicPlayer;
  consent: boolean;
  pool: Array<{
    subject: string;
    grade: number;
    difficulty: string;
    topic: string;
    count: number;
  }>;
  history: Array<{
    id: string;
    status: string;
    settings: DuelSettings;
    created_at: string;
    won: boolean | null;
    score: number;
    opponent: PublicPlayer | null;
  }>;
  achievements: Array<{ code: string; earned_at: string }>;
}
export function CompetitionIdentity({ onSave }: { onSave?: () => void }) {
  const q = useKairo<{
      nickname: string;
      avatar_color: string;
      consent_public: boolean;
    }>("profile.get"),
    [name, setName] = useState(""),
    [color, setColor] = useState("#587162"),
    [consent, setConsent] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    initialized = useRef(false);
  useEffect(() => {
    if (!q.data || initialized.current) return;
    initialized.current = true;
    queueMicrotask(() => {
      setName(q.data!.nickname);
      setColor(q.data!.avatar_color);
      setConsent(q.data!.consent_public);
    });
  }, [q.data]);
  if (!q.data) return null;
  return (
    <details className="competition-identity" open={!q.data.consent_public}>
      <summary>Yarış profilim · {q.data.nickname}</summary>
      <form
        className="module-form"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          void kairo<typeof q.data>("profile.save", {
            nickname: name,
            color,
            consent,
          })
            .then((data) => {
              q.setData(data);
              setMessage("Profil saxlanıldı.");
              onSave?.();
            })
            .catch((e) => setMessage(e.message))
            .finally(() => setBusy(false));
        }}
      >
        <div className="module-form-row">
          <label>
            İctimai ləqəb
            <input
              minLength={3}
              maxLength={30}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="nickname"
            />
          </label>
          <label>
            Avatar rəngi
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </label>
        </div>
        <label className="module-checkbox">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          Ləqəbimin və yarış nəticələrimin iştirakçılara və reytinqdə
          görünməsinə razıyam. E-poçt və şəxsi hesab identifikatoru göstərilmir.
        </label>
        <button className="module-button" disabled={busy}>
          Saxla
        </button>
        {message && <p role="status">{message}</p>}
      </form>
    </details>
  );
}
export function DuelLobby() {
  const q = useKairo<DuelCatalog>("duel.catalog"),
    router = useRouter(),
    [settings, setSettings] = useState<DuelSettings>({
      subject: "Riyaziyyat",
      grade: 11,
      count: 5,
      seconds: 30,
      difficulty: "mixed",
      topic: "",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function create(op: string) {
    setBusy(true);
    setError("");
    try {
      const response = await aiFetch("/api/ai/duel-questions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({settings,request_id:crypto.randomUUID(),find:op==="duel.find"})});
      const next = await response.json() as DuelState & {error?:string};
      if(!response.ok)throw new Error(next.error??"AI sualları hazırlanmadı.");
      if (next.token)
        sessionStorage.setItem(`kairo-invite:${next.id}`, next.token);
      router.push(`/kairo/duel/match/${next.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <ModuleHeading
        eyebrow="05 / Duel"
        title="Bilik qarşılaşması."
        description="AI ilə yeni suallar. Eyni vaxt və bərabər şərtlər. Xallar serverdə hesablanır."
      />
      <ModuleStatus {...q} retry={q.refresh} /><DuelStanding/>
      {error && <Notice error>{error}</Notice>}
      {q.data && (
        <>
          <CompetitionIdentity onSave={q.refresh} />
          <div className="duel-lobby-layout">
            <section className="module-panel module-form">
              <h2>Qarşılaşmanı qur</h2>
              <div className="module-form-row">
                <label>
                  Fənn
                  <select
                    value={settings.subject}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        subject: e.target.value,
                        topic: "",
                      })
                    }
                  >
                    {[...new Set(q.data.pool.map((p) => p.subject))].map(
                      (s) => (
                        <option key={s}>{s}</option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  Sinif
                  <select
                    value={settings.grade}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        grade: Number(e.target.value),
                        topic: "",
                      })
                    }
                  >
                    {Array.from({length:11},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}
                  </select>
                </label>
                <label>
                  Sual sayı
                  <select
                    value={settings.count}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        count: Number(e.target.value),
                      })
                    }
                  >
                    {[5, 10, 15, 20].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Sual üçün vaxt
                  <select
                    value={settings.seconds}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        seconds: Number(e.target.value),
                      })
                    }
                  >
                    {[15, 20, 30, 45, 60, 90].map((n) => (
                      <option key={n} value={n}>
                        {n} saniyə
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Çətinlik
                  <select
                    value={settings.difficulty}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        difficulty: e.target.value,
                        topic: "",
                      })
                    }
                  >
                    {[
                      ["mixed", "Qarışıq"],
                      ["easy", "Asan"],
                      ["medium", "Orta"],
                      ["hard", "Çətin"],
                    ].map(([v, l]) => (
                      <option value={v} key={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Mövzu
                  <select
                    value={settings.topic}
                    onChange={(e) =>
                      setSettings({ ...settings, topic: e.target.value })
                    }
                  >
                    <option value="">Qarışıq mövzular</option>
{[...new Set(getTextbooksBySelection(String(settings.grade) as Grade,settings.subject as Subject).flatMap(t=>t.topics))].map(t=><option key={t}>{t}</option>)}
                  </select>
                </label>
              </div>
              <p>Yeni duel üçün AI mövzuya uyğun suallar hazırlayır. Son qarşılaşmalarındakı suallar təkrar qəbul edilmir. AI suallarında səhv ehtimalı var; nəticə yarış reytinqində sayılır.</p>
              <div className="module-actions">
                <button
                  className="module-button primary"
                  disabled={busy || !q.data.consent || !isSupportedSelection(String(settings.grade) as Grade,settings.subject as Subject)}
                  onClick={() => void create("duel.create")}
                >
                  Dostunu dəvət et
                </button>
                <button
                  className="module-button"
                  disabled={busy || !q.data.consent || !isSupportedSelection(String(settings.grade) as Grade,settings.subject as Subject)}
                  onClick={() => void create("duel.find")}
                >
                  Rəqib axtar
                </button>
              </div>
            </section>
            <aside className="duel-rules module-card">
              <span className="card-kicker">Dürüst oyun</span>
              <h2>Sürətli düşün. Dəqiq cavabla.</h2>
              <p>
                Düzgün cavab: 100 xal. Sürət bonusu: 0–50 xal. Səhv və cavabsız
                sual: 0 xal.
              </p>
              <p>
                Hər raundun cavabı hər iki iştirakçı cavablayandan və ya vaxt
                bitəndən sonra açılır. Aktiv duel zamanı AI yardımı bağlıdır.
              </p>
              <p>
                Rəqib yoxdursa gözlə, axtarışı ləğv et və ya özəl dəvətə keç.
                Süni rəqib yaradılmır.
              </p>
            </aside>
          </div>
          <section className="module-panel">
            <h2>Duel tarixçən</h2>
            <div className="module-stats">
              <div>
                <strong>{q.data.history.filter((h) => h.won).length}</strong>
                <span>Qələbə (son 40 duel)</span>
              </div>
              <div>
                <strong>
                  {
                    q.data.history.filter((h) =>
                      ["finished", "abandoned"].includes(h.status),
                    ).length
                  }
                </strong>
                <span>Bitmiş duel (son 40)</span>
              </div>
            </div>
            {!q.data.history.length ? (
              <p>İlk qarşılaşmandan sonra nəticələr burada görünəcək.</p>
            ) : (
              <div className="module-table-wrap">
                <table className="module-table">
                  <thead>
                    <tr>
                      <th>Qarşılaşma</th>
                      <th>Tarix</th>
                      <th>Xal</th>
                      <th>Vəziyyət</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.data.history.map((h) => (
                      <tr key={h.id}>
                        <td>
                          <Link href={`/kairo/duel/match/${h.id}`}>
                            {h.settings.subject} ·{" "}
                            {h.opponent?.nickname ?? "Rəqib gözlənilir"}
                          </Link>
                        </td>
                        <td>{dateTime(h.created_at)}</td>
                        <td>{h.score}</td>
                        <td>
                          {h.won
                            ? "Qələbə"
                            : h.status === "finished"
                              ? "Bitib"
                              : h.status === "waiting"
                                ? "Gözləyir"
                                : h.status === "abandoned"
                                  ? "Bağlantı kəsilib"
                                  : h.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Achievements items={q.data.achievements} />
          </section>
        </>
      )}
    </>
  );
}
export function Achievements({
  items,
}: {
  items: Array<{ code: string; earned_at: string }>;
}) {
  const names: Record<string, string> = {
    first_win: "İlk duel qələbəsi",
    five_wins: "5 duel qələbəsi",
    ten_wins: "10 duel qələbəsi",
    first_duel_win: "İlk duel qələbəsi",
    first_arena_win: "İlk Arena qələbəsi",
    weekly_champion: "Həftənin qalibi",
  };
  return (
    <div className="module-tags">
      {items.map((a) => (
        <span key={a.code} title={dateTime(a.earned_at)}>
          ✦ {names[a.code] ?? a.code}
        </span>
      ))}
    </div>
  );
}
export function DuelJoin({ token }: { token: string }) {
  const q = useKairo<{ nickname: string }>("profile.get"),
    router = useRouter(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <>
      <ModuleHeading
        eyebrow="Duel / Dəvət"
        title="Qarşılaşmaya hazırsan?"
        description="Dəvəti qəbul etmək üçün yarış ləqəbini təsdiqlə. Keçid iki iştirakçı və məhdud vaxt üçün keçərlidir."
      />
      <ModuleStatus {...q} retry={q.refresh} />
      {q.data && (
        <>
          <CompetitionIdentity />
          <button
            className="module-button primary"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setError("");
              void kairo<DuelState>("duel.join", { token })
                .then((s) => router.push(`/kairo/duel/match/${s.id}`))
                .catch((e) => setError(e.message))
                .finally(() => setBusy(false));
            }}
          >
            {busy ? "Qoşulur…" : "Duelə qoşul"}
          </button>
        </>
      )}
      {error && <Notice error>{error}</Notice>}
    </>
  );
}
export function DuelWorkspace({ id }: { id: string }) {
  const q = useKairo<DuelState>("duel.get", { id }, 3000),
    now = useNow(),
    router = useRouter(),
    [value, setValue] = useState<Answer>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [invite, setInvite] = useState(""),
    [connection, setConnection] = useState("Qoşulur…");
  const [offset, setOffset] = useState(0);
  const currentRound = useRef(-1);
  useEffect(() => {
    if (!q.data) return;
    queueMicrotask(() =>
      setOffset(Date.parse(q.data!.server_now) - Date.now()),
    );
    if (currentRound.current !== q.data.round) {
      currentRound.current = q.data.round;
      queueMicrotask(() => setValue(q.data?.my_answer ?? null));
    }
  }, [q.data]);
  useEffect(() => {
    queueMicrotask(() => {
      const token = sessionStorage.getItem(`kairo-invite:${id}`);
      if (token) setInvite(`${location.origin}/kairo/duel/join/${token}`);
    });
    const refresh = q.refresh;
    const db = getSupabase(),
      channel = db
        .channel(`kairo-match-${id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "kairo_live_matches",
            filter: `id=eq.${id}`,
          },
          () => refresh(),
        )
        .subscribe((status) =>
          setConnection(
            status === "SUBSCRIBED"
              ? "Canlı bağlantı"
              : status === "CHANNEL_ERROR" || status === "TIMED_OUT"
                ? "Ehtiyat sinxronizasiya aktivdir"
                : "Qoşulur…",
          ),
        );
    return () => {
      void db.removeChannel(channel);
    };
  }, [id, q.refresh]);
  async function act(op: string, p: object = {}) {
    setBusy(true);
    setError("");
    try {
      let s: DuelState;
      if(op==="duel.rematch"){
       const response=await aiFetch("/api/ai/duel-questions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({settings:q.data!.settings,request_id:crypto.randomUUID(),find:false})});
       const data=await response.json();if(!response.ok)throw new Error(data.error??"Yeni suallar hazırlanmadı.");s=data;
      }else s = await kairo<DuelState>(op, { id, ...p });
      if (s.token) {
        sessionStorage.setItem(`kairo-invite:${s.id}`, s.token);
        setInvite(`${location.origin}/kairo/duel/join/${s.token}`);
      }
      if (s.id !== id) router.push(`/kairo/duel/match/${s.id}`);
      else q.setData(s);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!q.data) return <ModuleStatus {...q} retry={q.refresh} />;
  const s = q.data,
    me = s.players.find((p) => p.me),
    ended = ["finished", "abandoned", "expired", "cancelled"].includes(
      s.status,
    ),
    active = ["countdown", "active", "round_result"].includes(s.status),
    remaining = s.deadline ? (Date.parse(s.deadline) - now - offset) / 1000 : 0,
    countdown = s.round_started
      ? (Date.parse(s.round_started) - now - offset) / 1000
      : 0;
  return (
    <>
      <LockedSurface active={active} />
      <header className="duel-topbar">
        <Link
          href={
            s.tournament_id ? `/kairo/arena/${s.tournament_id}` : "/kairo/duel"
          }
        >
          Kairo / {s.tournament_id ? "Arena" : "Duel"}
        </Link>
        <span className="live-indicator">{connection}</span>
        <span>
          {s.settings.subject} · {s.settings.grade}-ci sinif
        </span>
      </header>
      {(error || q.error) && <Notice error>{error || q.error}</Notice>}
      <div className="duel-scoreboard">
        {[0, 1].map((n) => (
          <div key={n} className={s.players[n]?.me ? "is-me" : ""}>
            <PlayerAvatar player={s.players[n] ?? null} size={60} />
            <h2>{s.players[n]?.nickname ?? "Rəqib gözlənilir"}</h2>
            <span>
              {s.players[n]
                ? s.players[n].online
                  ? "Onlayn"
                  : "Bağlantı gözlənilir"
                : "Dəvət et"}
            </span>
            <strong>{s.players[n]?.score ?? 0}</strong>
          </div>
        ))}
        <span className="duel-vs">VS</span>
      </div>
      {!active && !ended && (
        <section className="module-panel duel-waiting">
          <h1>
            {s.players.length < 2
              ? "Rəqibini gözləyirik."
              : "Hər ikiniz hazır olduqda başlayır."}
          </h1>
          {invite && (
            <label>
              Dəvət keçidi
              <div className="invite-field">
                <input
                  readOnly
                  value={invite}
                  onFocus={(e) => e.target.select()}
                />
                <button
                  className="module-button"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(invite)
                      .then(() => setError("Keçid kopyalandı."))
                      .catch(() => setError("Keçidi xanadan seçib kopyala."))
                  }
                >
                  Kopyala
                </button>
              </div>
            </label>
          )}
          <div className="module-actions">
            <button
              className="module-button primary"
              disabled={busy || me?.ready}
              onClick={() => void act("duel.ready")}
            >
              {me?.ready ? "Hazırsan ✓" : "Hazıram"}
            </button>
            {!s.tournament_id && (
              <button
                className="module-button"
                disabled={busy}
                onClick={() => void act("duel.cancel")}
              >
                Gözləməni ləğv et
              </button>
            )}
            {s.status === "waiting" && !s.tournament_id && !invite && (
              <button
                className="module-button"
                disabled={busy}
                onClick={() => void act("duel.private")}
              >
                Özəl dəvətə keç
              </button>
            )}
          </div>
          {s.tournament_id && (
            <Notice>
              Hazırlıq müddətində qoşulmayan iştirakçı texniki məğlubiyyət alır.
              Qarşılaşma başlamazdan əvvəl “Hazıram” seç.
            </Notice>
          )}
        </section>
      )}
      {s.status === "countdown" && (
        <div className="duel-countdown" role="timer">
          <span>Qarşılaşma başlayır</span>
          <strong>{Math.max(0, Math.ceil(countdown))}</strong>
        </div>
      )}
      {s.question && active && (
        <section className="duel-question-panel">
          <div className="duel-round">
            <span>
              Raund {s.round + 1} / {s.settings.count}
            </span>
            <strong role="timer">
              {s.status === "round_result" ? "Raund bitdi" : clock(remaining)}
            </strong>
          </div>
          <progress
            className="duel-timebar"
            max={s.settings.seconds}
            value={s.status === "active" ? Math.max(0, remaining) : 0}
          />
          <QuestionView
            question={s.question}
            value={s.my_answer ?? value}
            onChange={setValue}
            disabled={
              s.status !== "active" || !!me?.answered || busy || remaining <= 0
            }
          />
          {s.status === "active" && (
            <button
              className="module-button primary"
              disabled={
                busy || !!me?.answered || value === null || remaining <= 0
              }
              onClick={() =>
                void act("duel.answer", { round: s.round, answer: value })
              }
            >
              {me?.answered
                ? "Cavab qeydə alındı · rəqib gözlənilir"
                : "Cavabı təsdiqlə"}
            </button>
          )}
          {s.round_review && (
            <QuestionReview
              question={{ ...s.question, key: s.round_review.key }}
              answer={s.round_review.my_answer}
              explanation={s.round_review.explanation}
              points="Raundun izahı"
            />
          )}
        </section>
      )}
      {ended && (
        <section className="duel-result module-panel">
          <span className="card-kicker">Qarşılaşma tamamlandı</span>
          <h1>
            {s.status === "cancelled"
              ? "Duel ləğv edildi"
              : s.status === "expired"
                ? "Dəvətin vaxtı bitdi"
                : s.winner
                  ? `${s.winner.nickname} qalib gəldi`
                  : "Qalib müəyyən edilmədi"}
          </h1>
          {s.status === "abandoned" && (
            <p>
              Bağlantı qaydası tətbiq olundu. Hər iki iştirakçı əlaqəsizdirsə
              qalib təyin edilmir.
            </p>
          )}
          <div className="module-stats">
            {s.players.map((p) => (
              <div key={p.id}>
                <strong>
                  {p.correct}/{s.settings.count}
                </strong>
                <span>{p.nickname} · düzgün cavab</span>
                <small>
                  Orta vaxt: {((p.average_ms ?? 0) / 1000).toFixed(1)} san
                </small>
              </div>
            ))}
          </div>
          <div className="module-actions">
            {!s.tournament_id &&
              ["finished", "abandoned"].includes(s.status) && (
                <button
                  className="module-button primary"
                  disabled={busy}
                  onClick={() => void act("duel.rematch")}
                >
                  Yeni revanş dəvəti
                </button>
              )}
            <Link
              className="module-button"
              href={
                s.tournament_id
                  ? `/kairo/arena/${s.tournament_id}`
                  : "/kairo/duel"
              }
            >
              Geri qayıt
            </Link>
          </div>
        </section>
      )}
      {ended &&
        s.review?.map((r, i) => (
          <div key={i}>
            <QuestionReview
              question={{
                ...r.question,
                ordinal: i,
                key: r.key,
                correct: r.correct,
              }}
              answer={r.my_answer}
              explanation={r.explanation}
              points={`${r.base} + ${r.bonus} = ${r.points} xal`}
            />
            {!r.correct && (
              <Link
                className="review-tutor-link"
                href={`/kairo/tutor?question=${r.question.id}&subject=${encodeURIComponent(r.question.subject)}&topic=${encodeURIComponent(r.question.topic)}&grade=${r.question.grade}`}
              >
                Bu sualı AI müəllimlə öyrən ↗
              </Link>
            )}
          </div>
        ))}
    </>
  );
}
