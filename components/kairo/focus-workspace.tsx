"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { kairo, useKairo, useNow, clock, dateTime } from "@/lib/kairo/client";
import type { FocusSettings, FocusState } from "@/lib/kairo/types";
import { LockedSurface, ModuleHeading, ModuleStatus, Notice } from "./shared";
const defaults: FocusSettings = {
  focus: 25,
  short_break: 5,
  long_break: 15,
  rounds: 4,
  daily_goal: 60,
  auto_break: false,
  sound: false,
};
export function FocusWorkspace() {
  const q = useKairo<FocusState>("focus.get"),
    now = useNow(),
    [settings, setSettings] = useState(defaults),
    [subject, setSubject] = useState("Riyaziyyat"),
    [task, setTask] = useState(""),
    [returnPath, setReturnPath] = useState("/dashboard"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [full, setFull] = useState(false);
  const initialized = useRef(false),
    requestId = useRef(""),
    heartbeat = useRef(false),
    activeRef = useRef<FocusState["active"]>(null),
    lastPhase = useRef("");
  const [offset, setOffset] = useState(0);
  const setData = q.setData,
    refresh = q.refresh;
  useEffect(() => {
    activeRef.current = q.data?.active ?? null;
  }, [q.data]);
  useEffect(() => {
    if (!q.data || initialized.current) return;
    initialized.current = true;
    queueMicrotask(() =>
      setOffset(Date.parse(q.data!.server_now) - Date.now()),
    );
    const p = new URLSearchParams(window.location.search);
    queueMicrotask(() => {
      setSettings(q.data!.active?.settings ?? q.data!.preferences);
      setSubject(q.data!.active?.subject ?? p.get("subject") ?? "Riyaziyyat");
      setTask(q.data!.active?.task ?? (p.get("task") ?? "").slice(0, 300));
      const r = p.get("return_path");
      if (
        r &&
        /^\/(dashboard|plan|quiz|mini-quiz|results|kairo\/[a-z/-]+)$/.test(r)
      )
        setReturnPath(r);
    });
  }, [q.data]);
  async function act(op: string, p: object = {}) {
    setBusy(true);
    setError("");
    try {
      const next = await kairo<FocusState>(op, p);
      setOffset(Date.parse(next.server_now) - Date.now());
      setData(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    async function beat(op = "focus.heartbeat") {
      const s = activeRef.current;
      if (!s || s.status !== "active" || heartbeat.current) return;
      heartbeat.current = true;
      try {
        const next = await kairo<FocusState>(op, { id: s.id });
        setOffset(Date.parse(next.server_now) - Date.now());
        setData(next);
      } catch {
        setError(
          "Bağlantı kəsilib. Təsdiqlənməyən vaxt fokus statistikasına əlavə edilmir.",
        );
      } finally {
        heartbeat.current = false;
      }
    }
    const timer = setInterval(() => {
      if (!document.hidden) void beat();
    }, 10000);
    const visibility = () => {
      if (document.hidden) void beat("focus.pause");
      else refresh();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [setData, refresh]);
  useEffect(() => {
    const s = q.data?.active;
    if (!s) return;
    const key = `${s.id}:${s.phase}:${s.round}`;
    if (lastPhase.current && lastPhase.current !== key && s.settings.sound) {
      try {
        const context = new AudioContext();
        const tone = context.createOscillator(),
          gain = context.createGain();
        tone.frequency.value = 660;
        gain.gain.value = 0.08;
        tone.connect(gain);
        gain.connect(context.destination);
        tone.start();
        tone.stop(context.currentTime + 0.25);
        tone.onended = () => void context.close();
      } catch {}
    }
    lastPhase.current = key;
  }, [q.data]);
  useEffect(() => {
    if (q.data && !q.data.active) {
      requestId.current = "";
      lastPhase.current = "";
    }
  }, [q.data]);
  const s = q.data?.active;
  const remaining = s
    ? s.status === "active"
      ? Math.min(
          s.phase_seconds,
          Math.max(0, (Date.parse(s.deadline) - now - offset) / 1000),
        )
      : s.phase_seconds - s.phase_credited
    : settings.focus * 60;
  useEffect(() => {
    if (s?.status === "active" && remaining <= 0 && !heartbeat.current)
      void kairo<FocusState>("focus.heartbeat", { id: s.id })
        .then(q.setData)
        .catch(() => {});
  }, [s?.id, s?.status, remaining, q.setData]);
  return (
    <div className={full ? "focus-workspace is-fullscreen" : "focus-workspace"}>
      <LockedSurface active={full} />
      <ModuleHeading
        eyebrow="04 / Fokus"
        title="Bir iş. Tam diqqət."
        description="Vaxtı idarə et, işi kiçik raundlara böl. Fokus vaxtı serverin təsdiqlədiyi aktiv intervallarla hesablanır."
      />
      <ModuleStatus {...q} retry={q.refresh} />
      {error && <Notice error>{error}</Notice>}
      {q.data && (
        <>
          <div className="focus-layout">
            <section className="focus-clock-panel">
              <div className="card-kicker">
                {s
                  ? s.phase === "focus"
                    ? "Fokus"
                    : "Fasilə"
                  : "Başlamağa hazırsan"}{" "}
                · raund {s?.round ?? 1}/{s?.settings.rounds ?? settings.rounds}
              </div>
              <div className="focus-clock" role="timer" aria-label="Qalan vaxt">
                {clock(remaining)}
              </div>
              <h2>{s?.task || task || "Diqqətini bir mövzuya yönəlt"}</h2>
              <p>
                {s?.subject ?? subject}
                {s?.status === "paused" ? " · Dayandırılıb" : ""}
              </p>
              <div className="module-actions">
                {!s ? (
                  <button
                    className="module-button primary"
                    disabled={busy}
                    onClick={() => {
                      requestId.current ||= crypto.randomUUID();
                      void act("focus.start", {
                        request_id: requestId.current,
                        subject,
                        task,
                        return_path: returnPath,
                        settings,
                      });
                    }}
                  >
                    Fokusa başla
                  </button>
                ) : (
                  <>
                    <button
                      className="module-button primary"
                      disabled={busy}
                      onClick={() =>
                        void act(
                          s.status === "active"
                            ? "focus.pause"
                            : "focus.resume",
                          { id: s.id },
                        )
                      }
                    >
                      {s.status === "active" ? "Fasilə ver" : "Davam et"}
                    </button>
                    <button
                      className="module-button"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            "Sessiyanı bitir? Yalnız təsdiqlənmiş fokus vaxtı saxlanılacaq.",
                          )
                        ) {
                          requestId.current = "";
                          void act("focus.end", { id: s.id });
                        }
                      }}
                    >
                      Bitir
                    </button>
                  </>
                )}
                <button
                  className="module-button"
                  onClick={() => setFull((v) => !v)}
                >
                  {full ? "Adi görünüş" : "Diqqət görünüşü"}
                </button>
              </div>
              {s && (
                <Link className="review-tutor-link" href={s.return_path}>
                  Tapşırığa qayıt ↗
                </Link>
              )}
              <small>
                Səhifə arxa plana keçəndə taymer dayanır. 40 saniyədən uzun
                əlaqəsiz interval sayılmır.
              </small>
            </section>
            <section className="module-panel module-form">
              <h2>Sənin ritmin</h2>
              <div className="module-actions">
                <button
                  className="module-button"
                  disabled={!!s}
                  onClick={() =>
                    setSettings({ ...settings, focus: 25, short_break: 5 })
                  }
                >
                  25 / 5
                </button>
                <button
                  className="module-button"
                  disabled={!!s}
                  onClick={() =>
                    setSettings({ ...settings, focus: 50, short_break: 10 })
                  }
                >
                  50 / 10
                </button>
              </div>
              <label>
                Fənn
                <select
                  disabled={!!s}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                >
                  {[
                    "Riyaziyyat",
                    "Fizika",
                    "Kimya",
                    "Biologiya",
                    "Coğrafiya",
                    "Digər",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Tapşırıq
                <input
                  maxLength={300}
                  disabled={!!s}
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="Bu raundda nəyi bitirəcəksən?"
                />
              </label>
              <div className="module-form-row">
                {(
                  [
                    { key: "focus", label: "Fokus (dəq)", min: 1, max: 120 },
                    {
                      key: "short_break",
                      label: "Qısa fasilə",
                      min: 1,
                      max: 30,
                    },
                    {
                      key: "long_break",
                      label: "Uzun fasilə",
                      min: 1,
                      max: 60,
                    },
                    { key: "rounds", label: "Raund", min: 1, max: 8 },
                    {
                      key: "daily_goal",
                      label: "Günlük hədəf (dəq)",
                      min: 5,
                      max: 720,
                    },
                  ] as const
                ).map((x) => (
                  <label key={x.key}>
                    {x.label}
                    <input
                      type="number"
                      min={x.min}
                      max={x.max}
                      disabled={!!s}
                      value={settings[x.key]}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          [x.key]: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              <label className="module-checkbox">
                <input
                  type="checkbox"
                  disabled={!!s}
                  checked={settings.auto_break}
                  onChange={(e) =>
                    setSettings({ ...settings, auto_break: e.target.checked })
                  }
                />
                Fasiləyə avtomatik keç
              </label>
              <label className="module-checkbox">
                <input
                  type="checkbox"
                  disabled={!!s}
                  checked={settings.sound}
                  onChange={(e) =>
                    setSettings({ ...settings, sound: e.target.checked })
                  }
                />
                Keçid səsi
              </label>
              <button
                className="module-button"
                disabled={busy || !!s}
                onClick={() => void act("focus.preferences", { settings })}
              >
                Seçimləri saxla
              </button>
            </section>
          </div>
          <section className="module-stats">
            <div>
              <strong>
                {Math.floor(q.data.today / 60)}
                <small> dəq</small>
              </strong>
              <span>Bu gün</span>
              <progress
                value={q.data.today / 60}
                max={q.data.preferences.daily_goal}
              />
            </div>
            <div>
              <strong>
                {Math.floor(
                  q.data.week.reduce((n, d) => n + Number(d.seconds), 0) / 60,
                )}
              </strong>
              <span>Son 7 gündə dəqiqə</span>
            </div>
            <div>
              <strong>
                {q.data.week.reduce((n, d) => n + Number(d.rounds), 0)}
              </strong>
              <span>Tamamlanmış raund</span>
            </div>
          </section>
          <section className="module-panel">
            <h2>Həftəlik ritm</h2>
            <div className="history-bars">
              {q.data.week.map((d) => (
                <div key={d.day}>
                  <span>
                    {new Date(`${d.day}T12:00:00`).toLocaleDateString("az-AZ", {
                      weekday: "short",
                      day: "numeric",
                    })}
                  </span>
                  <progress
                    value={d.seconds / 60}
                    max={Math.max(
                      q.data!.preferences.daily_goal,
                      ...q.data!.week.map((w) => Number(w.seconds) / 60),
                    )}
                  />
                  <strong>{Math.floor(d.seconds / 60)} dəq</strong>
                </div>
              ))}
            </div>
            <h2>Fokus tarixçəsi</h2>
            {!q.data.history.length ? (
              <p>İlk sessiyan burada görünəcək.</p>
            ) : (
              <div className="module-table-wrap">
                <table className="module-table">
                  <thead>
                    <tr>
                      <th>Tapşırıq</th>
                      <th>Tarix</th>
                      <th>Fokus</th>
                      <th>Raund</th>
                      <th>Vəziyyət</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.data.history.map((h) => (
                      <tr key={h.id}>
                        <td>
                          {h.task || h.subject}
                          <br />
                          <small>{h.subject}</small>
                        </td>
                        <td>{dateTime(h.started_at)}</td>
                        <td>{clock(h.focused_seconds)}</td>
                        <td>{h.completed_rounds}</td>
                        <td>
                          {h.status === "completed"
                            ? "Tamamlanıb"
                            : h.status === "ended"
                              ? "Bitirilib"
                              : h.status === "paused"
                                ? "Dayandırılıb"
                                : "Aktiv"}
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
    </div>
  );
}
