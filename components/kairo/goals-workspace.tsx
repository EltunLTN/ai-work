"use client";
import Link from "next/link";
import {GoalOverview,GoalsExplorer} from "./goals-explorer";
import { useState } from "react";
import { kairo, useKairo, dateTime } from "@/lib/kairo/client";
import { admissionProgress } from "@/lib/kairo/goal-progress";
import type { GoalState, Program } from "@/lib/kairo/types";
import { ModuleHeading, ModuleStatus, Modal, Notice } from "./shared";
export function GoalsWorkspace() {
  const q = useKairo<GoalState>("goals.get"),
    [selected, setSelected] = useState<Program | null>(null),
    [target, setTarget] = useState(600),
    [year, setYear] = useState(new Date().getFullYear() + 1),
    [funding, setFunding] = useState("either"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  function chooseProgram(p:Program) { const saved=q.data?.goals.find(g=>g.program.id===p.id); if(saved){setTarget(saved.target_score);setYear(saved.admission_year);setFunding(saved.funding);} setSelected(p); }
  async function act(op: string, p: object) {
    setBusy(true);
    setError("");
    try {
      q.setData(await kairo<GoalState>(op, p));
      setSelected(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="goals-premium">
      <ModuleHeading
        eyebrow="03 / Universitet hədəfim"
        title="Hədəfini gör. Yolunu qur."
        description="İxtisasları araşdır, yan-yana müqayisə et və öz gələcəyin üçün düşünülmüş seçim et."
      />
      <ModuleStatus {...q} retry={q.refresh} />
      {error && <Notice error>{error}</Notice>}
      {q.data && (
        <>
          <GoalOverview data={q.data}/>
          <section className="saved-goals-section">
            <h2>
              Hədəflərim <span className="muted">{q.data.goals.length}/12</span>
            </h2>
            {!q.data.goals.length ? (
              <div className="module-empty">
                Hədəf hələ seçilməyib. Aşağıdakı kataloqdan ixtisas seç.
              </div>
            ) : (
              <div className="module-grid">
                {q.data.goals.map((g) => {
                  const progress = admissionProgress(
                      q.data!.mock_history,
                      g.target_score,
                    ),
                    cutoff =
                      g.funding === "state"
                        ? g.program.state_cutoff
                        : g.program.cutoff;
                  return (
                    <article
                      key={g.id}
                      className={`module-card ${g.is_primary ? "is-primary" : ""}`}
                    >
                      <div className="card-kicker">
                        {g.is_primary ? "Əsas hədəf" : "Alternativ hədəf"} ·{" "}
                        {g.admission_year}
                      </div>
                      <h2>{g.university}</h2>
                      <p>
                        {g.program.name} · {g.program.language}
                      </p>
                      <div className="goal-score">
                        <strong>{g.target_score}</strong>
                        <span>şəxsi hədəf / 700</span>
                      </div>
                      <p>
                        Keçid balı:{" "}
                        {cutoff === null
                          ? "təsdiqlənmiş məlumat yoxdur"
                          : `${cutoff} (${g.program.year})${g.program.cutoff_status === "reported" ? " · rəsmi təsdiqlənməyib" : ""}`}
                      </p>
                      {progress ? (
                        <>
                          <progress max={100} value={progress.percent} />
                          <p>
                            Son uyğun sınaq: {progress.score}/700 · hədəfə{" "}
                            {progress.gap} bal
                          </p>
                        </>
                      ) : (
                        <p className="data-note">
                          700 ballıq təsdiqlənmiş sınaq nəticən yoxdur. Adi məşq
                          faizləri qəbul balına çevrilmir.
                        </p>
                      )}
                      <div className="module-actions">
                        {!g.is_primary && (
                          <button
                            className="module-button"
                            disabled={busy}
                            onClick={() =>
                              void act("goals.primary", { id: g.id })
                            }
                          >
                            Əsas et
                          </button>
                        )}
                        <button
                          className="module-button"
                          disabled={busy}
                          onClick={() =>
                            void act("goals.archive", { id: g.id })
                          }
                        >
                          Arxivlə
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
          <GoalsExplorer data={q.data} onSelect={chooseProgram} busy={busy}/>
          <section className="module-panel">
            <h2>Sınaqların dinamikası</h2>
            <p>
              Hər nəticə öz şkalası ilə göstərilir. Müxtəlif şkalalar bir qəbul
              balı kimi birləşdirilmir.
            </p>
            {!q.data.mock_history.length ? (
              <Link href="/kairo/exam">İlk sınağa başla ↗</Link>
            ) : (
              <div className="history-bars">
                {q.data.mock_history.map((h) => (
                  <Link href={`/kairo/exam/session/${h.id}`} key={h.id}>
                    <span>
                      {h.name}
                      <small>{dateTime(h.started_at)}</small>
                    </span>
                    <progress value={h.earned} max={h.maximum} />
                    <strong>
                      {h.earned}/{h.maximum}
                    </strong>
                  </Link>
                ))}
              </div>
            )}
          </section>
          <section>
            <h2>Növbəti addımların</h2>
            <div className="module-grid">
              {q.data.priorities.length ? (
                q.data.priorities.map((p, i) => (
                  <article className="module-card" key={i}>
                    <div className="card-kicker">
                      {p.subject} · {p.grade ?? "—"}-ci sinif
                    </div>
                    <h3>{p.topic}</h3>
                    <p>
                      {p.correct}/{p.total} düzgün · əvvəlcə bu anlayışı
                      möhkəmləndir.
                    </p>
                    <Link
                      className="module-button"
                      href={`/kairo/tutor?subject=${encodeURIComponent(p.subject)}&grade=${p.grade ?? 11}&topic=${encodeURIComponent(p.topic)}`}
                    >
                      AI müəllimlə öyrən ↗
                    </Link>
                  </article>
                ))
              ) : (
                <div className="module-empty">
                  Tövsiyələr real məşq nəticələrin olduqdan sonra yaranacaq.
                </div>
              )}
            </div>
          </section>
        </>
      )}
      {selected && (
        <Modal
          label="Universitet hədəfini saxla"
          onClose={() => setSelected(null)}
        >
          <form
            className="module-modal module-form"
            onSubmit={(e) => {
              e.preventDefault();
              void act("goals.save", {
                program: selected.id,
                target,
                year,
                funding,
              });
            }}
          >
            <h2>{selected.university}</h2>
            <p>{selected.name}</p>
            <label>
              Şəxsi hədəf balın
              <input
                type="number"
                min={0}
                max={700}
                required
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
              />
            </label>
            <label>
              Qəbul ili
              <input
                type="number"
                min={new Date().getFullYear()}
                max={2100}
                value={year}
                required
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </label>
            <label>
              Maliyyələşmə
              <select
                value={funding}
                onChange={(e) => setFunding(e.target.value)}
              >
                <option value="either">Hər iki variant</option>
                <option value="state">Dövlət sifarişi</option>
                <option value="tuition">Ödənişli</option>
              </select>
            </label>
            <div className="module-actions">
              <button
                type="button"
                className="module-button"
                onClick={() => setSelected(null)}
              >
                Bağla
              </button>
              <button disabled={busy} className="module-button primary">
                Saxla
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

