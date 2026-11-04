"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { kairo, useKairo, dateTime } from "@/lib/kairo/client";
import { parseCatalogCSV } from "@/lib/kairo/catalog-import";
import type { ExamTemplate, PublicPlayer } from "@/lib/kairo/types";
import { MathContent } from "./math-content";
import { ModuleHeading, ModuleStatus, Notice } from "./shared";
type Row = Record<string, unknown>;
interface AdminCatalog {
  questions: Array<
    Row & {
      id: string;
      subject: string;
      topic: string;
      type: string;
      status: string;
      body: { statement: string };
    }
  >;
  templates: ExamTemplate[];
  programs: Row[];
  tournaments: Array<
    Row & {
      id: string;
      name: string;
      mode: string;
      status: string;
      starts_at: string;
    }
  >;
  weekly: Array<
    Row & {
      id: string;
      name: string;
      mode: string;
      template_id: string;
      enabled: boolean;
    }
  >;
  duels: Array<{
    id: string;
    status: string;
    created_at: string;
    settings: { subject: string };
    players: Array<PublicPlayer & { last_seen: string; ready: boolean }>;
  }>;
  written: Array<{
    session: string;
    ordinal: number;
    question: { body: { statement: string } };
    answer: string;
    rubric: string;
    maximum: number;
    saved_at: string;
  }>;
  ai_config: { enabled: boolean; max_hints: number; max_turns: number };
  ai_metrics: Record<string, number>;
  reports: Array<{
    id: string;
    reason: string;
    content: string;
    created_at: string;
  }>;
  arena_entries: Array<{
    tournament: string;
    session: string;
    player: PublicPlayer;
    disqualified: boolean;
    note: string;
  }>;
}
const emptyQuestion = {
  subject: "Riyaziyyat",
  grade: 11,
  topic: "Yeni mövzu",
  difficulty: "easy",
  type: "single",
  body: {
    statement: "Sual mətni",
    options: ["A variantı", "B variantı", "C variantı", "D variantı"],
  },
  answer_key: { answer: 0 },
  explanation: "Həllin əsaslandırılması",
  points: 1,
  status: "draft",
  origin: "authored",
  source_note: "Müəllif və yoxlama qeydi",
};
const emptyTemplate = {
  name: "Yeni Kairo sınağı",
  year: 2027,
  exam_type: "custom",
  admission_group: null,
  grade: 11,
  duration_seconds: 1800,
  max_score: 100,
  scale: "kairo100",
  sections: [
    { subject: "Riyaziyyat", count: 10, types: ["single"], weight: 1 },
  ],
  rules: { instructions: "AI bağlıdır. Hər sual üçün bir cavab seç." },
  official_format: false,
  source_url: null,
  source_published: null,
  status: "draft",
};
function JSONEditor({
  initial,
  onSave,
  label,
}: {
  initial: unknown;
  onSave: (value: Row) => Promise<void>;
  label: string;
}) {
  const [text, setText] = useState(() => JSON.stringify(initial, null, 2)),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        let parsed: Row;
        try {
          parsed = JSON.parse(text);
          if (!parsed || Array.isArray(parsed) || typeof parsed !== "object")
            throw new Error("JSON obyekt tələb olunur.");
        } catch (e) {
          setError((e as Error).message);
          return;
        }
        setBusy(true);
        void onSave(parsed)
          .catch((e) => setError(e.message))
          .finally(() => setBusy(false));
      }}
    >
      <label className="review-label">
        {label}
        <textarea
          className="admin-editor"
          spellCheck={false}
          value={text}
          maxLength={50000}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <p className="data-note">
        Bütün dəyişikliklər serverdə yoxlanır və admin jurnalına yazılır. Cavab
        variantlarının indeksləri 0-dan başlayır. Yayımlanmış şablonun redaktəsi
        yeni versiya yaradır.
      </p>
      {error && <Notice error>{error}</Notice>}
      <button className="module-button primary" disabled={busy}>
        {busy ? "Saxlanılır…" : "Yoxla və saxla"}
      </button>
    </form>
  );
}
export function KairoAdmin() {
  const q = useKairo<AdminCatalog>("admin.catalog"),
    [tab, setTab] = useState("questions"),
    [search, setSearch] = useState(""),
    [message, setMessage] = useState(""),
    [editor, setEditor] = useState<{
      kind: "question" | "template";
      value: unknown;
    } | null>(null),
    [csv, setCsv] = useState(""),
    [rows, setRows] = useState<Record<string, string>[]>([]),
    [authorized, setAuthorized] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(()=>{if(new URLSearchParams(location.search).get("section")==="arena")queueMicrotask(()=>setTab("arena"));},[]);
  async function mutate(op: string, p: object) {
    setMessage("");
    setBusy(true);
    try {
      await kairo(op, p);
      setMessage("Dəyişiklik saxlanıldı və jurnala yazıldı.");
      q.refresh();
    } catch (e) {
      setMessage((e as Error).message);
      throw e;
    } finally {
      setBusy(false);
    }
  }
  function launch(op: string, p: object) {
    void mutate(op, p).catch(() => {});
  }
  return (
    <div className="kairo-admin">
      <ModuleHeading
        eyebrow="Admin / Kairo"
        title="Təhsil sisteminin idarəsi."
        description="Sual bankı, imtahan versiyaları, mənbəli qəbul məlumatları, yarışlar və müəllim nəzarəti."
      />
      <Link className="module-button" href="/admin">
        Hesablar və əməliyyat jurnalına qayıt ↗
      </Link>
      <Link className="module-button primary" href="/admin/overview?competitions=1">Bütün duel və Arena nəticələrini aç ↗</Link>
      <ModuleStatus {...q} retry={q.refresh} />
      {message && <Notice>{message}</Notice>}
      {q.data && (
        <>
          <div
            className="module-tabs"
            role="group"
            aria-label="İdarəetmə bölmələri"
          >
            {[
              ["questions", "Sual bankı"],
              ["templates", "İmtahanlar"],
              ["written", "Yazılı yoxlama"],
              ["universities", "Universitetlər"],
              ["arena", "Arena"],
              ["duels", "Duellər"],
              ["teacher", "AI müəllim"],
            ].map(([v, l]) => (
              <button
                key={v}
                aria-pressed={tab === v}
                onClick={() => {
                  setTab(v);
                  setEditor(null);
                  setSearch("");
                }}
              >
                {l}
              </button>
            ))}
          </div>
          {editor ? (
            <section className="module-panel">
              <button className="module-button" onClick={() => setEditor(null)}>
                ← Siyahıya qayıt
              </button>
              <h2>
                {editor.kind === "question"
                  ? "Sual redaktoru"
                  : "İmtahan şablonu"}
              </h2>
              <JSONEditor
                key={JSON.stringify(editor.value)}
                initial={editor.value}
                label="Məzmun və konfiqurasiya (JSON)"
                onSave={async (value) => {
                  await mutate(`admin.${editor.kind}.save`, {
                    [editor.kind]: value,
                  });
                  setEditor(null);
                }}
              />
            </section>
          ) : tab === "questions" ? (
            <section className="module-panel">
              <div className="admin-toolbar">
                <input
                  type="search"
                  aria-label="Sualları axtar"
                  placeholder="Fənn, mövzu, mətn…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button
                  className="module-button primary"
                  onClick={() =>
                    setEditor({ kind: "question", value: emptyQuestion })
                  }
                >
                  Yeni sual +
                </button>
              </div>
              <p>
                {q.data.questions.length} sual. Növlər: single, multiple,
                numeric, short, matching, written, passage, image.
              </p>
              {q.data.questions
                .filter((x) =>
                  `${x.subject} ${x.topic} ${x.body.statement}`
                    .toLocaleLowerCase("az")
                    .includes(search.toLocaleLowerCase("az")),
                )
                .map((x) => (
                  <details className="admin-entry" key={x.id}>
                    <summary>
                      {x.subject} / {x.topic} · {x.type} · {x.status}
                    </summary>
                    <MathContent>{x.body.statement}</MathContent>
                    <div className="module-actions">
                      <button
                        className="module-button"
                        onClick={() =>
                          setEditor({ kind: "question", value: x })
                        }
                      >
                        Redaktə / yoxla
                      </button>
                      <button
                        className="module-button"
                        onClick={() => {
                          const copy = { ...x };
                          delete (copy as Row).id;
                          setEditor({ kind: "question", value: copy });
                        }}
                      >
                        Yeni nüsxə
                      </button>
                    </div>
                  </details>
                ))}
            </section>
          ) : tab === "templates" ? (
            <section className="module-panel">
              <div className="admin-toolbar">
                <h2>Versiyalı imtahan şablonları</h2>
                <button
                  className="module-button primary"
                  onClick={() =>
                    setEditor({ kind: "template", value: emptyTemplate })
                  }
                >
                  Yeni şablon +
                </button>
              </div>
              <Notice>
                Rəsmi DİM profili üçün mənbə URL-i, nəşr tarixi, təsdiqlənmiş
                qiymətləndirmə qaydaları və icazəli sual bankı tələb olunur.
                Hazırkı rəsmi profil qaralama olaraq saxlanılıb. Tam təsdiq
                olmadan yayımlama.
              </Notice>
              {q.data.templates.map((t) => (
                <article className="admin-entry" key={t.id}>
                  <h3>
                    {t.name} · v{t.version}
                  </h3>
                  <p>
                    {t.status} · {t.grade}-ci sinif · {t.duration_seconds / 60}{" "}
                    dəq · {t.max_score} bal
                  </p>
                  <div className="module-actions">
                    <button
                      className="module-button"
                      onClick={() => setEditor({ kind: "template", value: t })}
                    >
                      Redaktə / yeni versiya
                    </button>
                    {t.status !== "archived" && (
                      <button
                        className="module-button"
                        disabled={busy}
                        onClick={() =>
                          launch("admin.template.archive", { id: t.id })
                        }
                      >
                        Arxivlə
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </section>
          ) : tab === "written" ? (
            <section className="module-panel">
              <h2>Yazılı həlllərin qiymətləndirilməsi</h2>
              {!q.data.written.length && <p>Yoxlama gözləyən cavab yoxdur.</p>}
              {q.data.written.map((w) => (
                <WrittenReview
                  key={`${w.session}-${w.ordinal}`}
                  value={w}
                  onSave={(p) => mutate("admin.exam.review", p)}
                />
              ))}
            </section>
          ) : tab === "universities" ? (
            <section className="module-panel module-form">
              <h2>Mənbəli kataloq idxalı</h2>
              <p>
                CSV başlıqları:
                university,name,code,admission_group,language,study_format,year,cutoff,state_cutoff,minimum_requirement,source_url,source_published.
                Çatışmayan keçid ballarını boş saxla.
              </p>
              <label>
                CSV faylı
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 180000) {
                      setMessage("Fayl 180 KB-dan kiçik olmalıdır.");
                      return;
                    }
                    void file.text().then((text) => {
                      setCsv(text);
                      setRows([]);
                    });
                  }}
                />
              </label>
              <label>
                CSV məzmunu
                <textarea
                  rows={7}
                  value={csv}
                  maxLength={180000}
                  onChange={(e) => {
                    setCsv(e.target.value);
                    setRows([]);
                  }}
                />
              </label>
              <button
                className="module-button"
                onClick={() => {
                  try {
                    setRows(parseCatalogCSV(csv));
                    setMessage("İdxal önizləməsi hazırdır. Mənbələri yoxla.");
                  } catch (e) {
                    setMessage((e as Error).message);
                  }
                }}
              >
                Yoxla və önizlə
              </button>
              {rows.length > 0 && (
                <>
                  <div className="module-table-wrap">
                    <table className="module-table">
                      <thead>
                        <tr>
                          <th>Universitet</th>
                          <th>İxtisas</th>
                          <th>İl / bal</th>
                          <th>Mənbə</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={i}>
                            <td>{r.university}</td>
                            <td>{r.name}</td>
                            <td>
                              {r.year} / {r.cutoff || "Boş"}
                            </td>
                            <td>
                              <a
                                href={r.source_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Mənbə ↗
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <label className="module-checkbox">
                    <input
                      type="checkbox"
                      checked={authorized}
                      onChange={(e) => setAuthorized(e.target.checked)}
                    />
                    Mənbəni, nəşr tarixini və məlumatdan istifadə icazəsini
                    yoxladım.
                  </label>
                  <button
                    className="module-button primary"
                    disabled={busy || !authorized}
                    onClick={() =>
                      launch("admin.universities.import", { authorized, rows })
                    }
                  >
                    {rows.length} sətri idxal et
                  </button>
                </>
              )}
              <details>
                <summary>
                  Mövcud {q.data.programs.length} proqramı göstər
                </summary>
                <pre className="admin-editor">
                  {JSON.stringify(q.data.programs, null, 2)}
                </pre>
              </details>
            </section>
          ) : tab === "arena" ? (
            <section className="module-panel">
              <h2>Turnirlər və həftəlik cədvəl</h2>
              <TournamentForm
                templates={q.data.templates}
                save={(p) => mutate("admin.tournament.create", p)}
              />
              <h3>Avtomatik həftəlik cədvəllər</h3>
              {q.data.weekly.map((s) => (
                <div className="admin-entry" key={s.id}>
                  <strong>{s.name}</strong>
                  <p>
                    {s.mode} · {s.enabled ? "Aktiv" : "Dayandırılıb"}
                  </p>
                  <button
                    className="module-button"
                    disabled={busy}
                    onClick={() =>
                      launch("admin.weekly.save", { ...s, enabled: !s.enabled })
                    }
                  >
                    {s.enabled ? "Növbəti həftələri dayandır" : "Aktivləşdir"}
                  </button>
                </div>
              ))}
              <details className="admin-entry">
                <summary>Yeni həftəlik cədvəl</summary>
                <JSONEditor
                  label="Cədvəl"
                  initial={{
                    name: "Yeni həftəlik yarış",
                    mode: "async",
                    template_id:
                      q.data.templates.find((t) => t.status === "published")
                        ?.id ?? "",
                    enabled: true,
                  }}
                  onSave={(v) => mutate("admin.weekly.save", v)}
                />
              </details>
              {q.data.tournaments.map((t) => (
                <article className="admin-entry" key={t.id}>
                  <h3>{t.name}</h3>
                  <p>
                    {t.mode} · {t.status} · {dateTime(t.starts_at)}
                  </p>
                  <div className="module-actions">
                    <Link
                      className="module-button"
                      href={`/kairo/arena/${t.id}`}
                    >
                      Cədvəl / reytinq
                    </Link>
                    {["scheduled", "active"].includes(t.status) && (
                      <button
                        className="module-button"
                        disabled={busy}
                        onClick={() => {
                          const reason = window.prompt("Ləğv səbəbini yaz");
                          if (reason?.trim())
                            launch("admin.tournament.cancel", {
                              id: t.id,
                              reason,
                            });
                        }}
                      >
                        Turniri ləğv et
                      </button>
                    )}
                  </div>
                  {q
                    .data!.arena_entries.filter((e) => e.tournament === t.id)
                    .map((e) => (
                      <div className="metric-row" key={e.session}>
                        <span>
                          {e.player.nickname} ·{" "}
                          {e.disqualified ? "Diskvalifikasiya" : "Reytinqdə"}
                        </span>
                        <button
                          className="module-button"
                          disabled={busy}
                          onClick={() => {
                            const reason = window.prompt(
                              "Nəticə dəyişikliyinin səbəbi",
                            );
                            if (reason?.trim())
                              launch("admin.arena.disqualify", {
                                id: t.id,
                                session: e.session,
                                disqualified: !e.disqualified,
                                reason,
                              });
                          }}
                        >
                          {e.disqualified ? "Bərpa et" : "Diskvalifikasiya"}
                        </button>
                      </div>
                    ))}
                </article>
              ))}
            </section>
          ) : tab === "duels" ? (
            <section className="module-panel">
              <h2>Qarşılaşma nəzarəti</h2>
              <button className="module-button" onClick={q.refresh}>
                Vəziyyəti yenilə
              </button>
              {q.data.duels.map((d) => (
                <div key={d.id} className="admin-entry">
                  <h3>
                    {d.settings.subject} · {d.status}
                  </h3>
                  <p>
                    {dateTime(d.created_at)} · {d.id}
                  </p>
                  {d.players?.map((p) => (
                    <p key={p.id}>
                      {p.nickname} · {p.ready ? "Hazır" : "Hazırlıq gözləyir"} ·
                      Son əlaqə {dateTime(p.last_seen)}
                    </p>
                  ))}
                </div>
              ))}
            </section>
          ) : (
            <section className="module-panel">
              <h2>AI müəllim konfiqurasiyası</h2>
              <JSONEditor
                initial={q.data.ai_config}
                label="Limitlər"
                onSave={(v) => mutate("admin.ai.config", v)}
              />
              <div className="module-stats">
                {Object.entries(q.data.ai_metrics).map(([k, v]) => (
                  <div key={k}>
                    <strong>{v}</strong>
                    <span>
                      {(
                        {
                          sessions: "Sessiya",
                          completed: "Tamamlanıb",
                          hints: "İpucu",
                          reveals: "Həll açılıb",
                          verified: "Riyazi təsdiq",
                        } as Record<string, string>
                      )[k] ?? k}
                    </span>
                  </div>
                ))}
              </div>
              <h2>İstifadəçinin paylaşdığı cavablar</h2>
              <p>
                Şəxsi dərs söhbətləri avtomatik göstərilmir. Yalnız açıq
                razılıqla bildirilmiş AI cavabı görünür.
              </p>
              {!q.data.reports.length && <p>Açıq bildiriş yoxdur.</p>}
              {q.data.reports.map((r) => (
                <article className="admin-entry" key={r.id}>
                  <strong>{r.reason}</strong>
                  <MathContent>{r.content}</MathContent>
                  <small>{dateTime(r.created_at)}</small>
                  <div>
                    <button
                      className="module-button"
                      disabled={busy}
                      onClick={() =>
                        launch("admin.report.resolve", { id: r.id })
                      }
                    >
                      Baxılıb kimi qeyd et
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
function WrittenReview({
  value: w,
  onSave,
}: {
  value: AdminCatalog["written"][number];
  onSave: (p: object) => Promise<void>;
}) {
  const [score, setScore] = useState(0),
    [feedback, setFeedback] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="admin-entry module-form"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        void onSave({ id: w.session, ordinal: w.ordinal, score, feedback })
          .catch((e) => setError(e.message))
          .finally(() => setBusy(false));
      }}
    >
      <MathContent>{w.question.body.statement}</MathContent>
      <strong>Şagirdin həlli</strong>
      <MathContent>
        {typeof w.answer === "string" ? w.answer : JSON.stringify(w.answer)}
      </MathContent>
      <strong>Rubrik</strong>
      <MathContent>{w.rubric}</MathContent>
      <div className="module-form-row">
        <label>
          Bal (0–{w.maximum})
          <input
            type="number"
            min={0}
            max={w.maximum}
            step="0.001"
            required
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
          />
        </label>
        <label>
          Əsaslandırılmış rəy
          <textarea
            required
            minLength={3}
            maxLength={3000}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </label>
      </div>
      {error && <Notice error>{error}</Notice>}
      <button className="module-button primary" disabled={busy}>
        Qiymətləndir və yekunlaşdır
      </button>
    </form>
  );
}
function TournamentForm({
  templates,
  save,
}: {
  templates: ExamTemplate[];
  save: (p: object) => Promise<void>;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <details className="admin-entry">
      <summary>Yeni turnir yarat</summary>
      <form
        className="module-form"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget),
            value = Object.fromEntries(f.entries());
          setBusy(true);
          setError("");
          const tournament = {
            ...value,
            max_participants: Number(value.max_participants),
            time_per_question: Number(value.time_per_question),
            ...Object.fromEntries(
              [
                "registration_opens",
                "registration_closes",
                "starts_at",
                "ends_at",
              ].map((k) => [k, new Date(String(value[k])).toISOString()]),
            ),
          };
          void save({ tournament })
            .catch((e) => setError(e.message))
            .finally(() => setBusy(false));
        }}
      >
        <label>
          Ad
          <input name="name" minLength={3} maxLength={180} required />
        </label>
        <div className="module-form-row">
          <label>
            Rejim
            <select name="mode">
              <option value="async">Həftəlik sınaq</option>
              <option value="knockout">Pley-off</option>
            </select>
          </label>
          <label>
            Şablon
            <select name="template_id">
              {templates
                .filter(
                  (t) => t.status === "published" && t.sections.length === 1,
                )
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
          </label>
          {[
            ["registration_opens", "Qeydiyyat açılır"],
            ["registration_closes", "Qeydiyyat bağlanır"],
            ["starts_at", "Başlayır"],
            ["ends_at", "Bitir"],
          ].map(([key, label]) => (
            <label key={key}>
              {label} (yerli vaxt)
              <input name={key} type="datetime-local" required />
            </label>
          ))}
          <label>
            İştirakçı limiti
            <input
              name="max_participants"
              type="number"
              min={2}
              max={64}
              defaultValue={16}
              required
            />
          </label>
          <label>
            Sual vaxtı
            <select name="time_per_question">
              {[15, 20, 30, 45, 60, 90].map((n) => (
                <option key={n} value={n}>
                  {n} san
                </option>
              ))}
            </select>
          </label>
        </div>
        {error && <Notice error>{error}</Notice>}
        <button className="module-button primary" disabled={busy}>
          Turniri yarat
        </button>
      </form>
    </details>
  );
}

