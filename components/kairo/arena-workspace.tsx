"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { kairo, useKairo, useNow, dateTime } from "@/lib/kairo/client";
import type { ArenaState, Tournament } from "@/lib/kairo/types";
import { ModuleHeading, ModuleStatus, Notice, PlayerAvatar } from "./shared";
import { Achievements, CompetitionIdentity } from "./duel-workspace";
export function ArenaLobby() {
  const q = useKairo<{
      tournaments: Tournament[];
      achievements: Array<{ code: string; earned_at: string }>;
    }>("arena.catalog"),
    [filter, setFilter] = useState("all");
  return (
    <>
      <ModuleHeading
        eyebrow="06 / Arena"
        title="Birlikdə daha irəli."
        description="Həftəlik eyni sual dəsti ilə yarış və canlı pley-off. Reytinq yalnız real, bazada saxlanmış nəticələrdən yaranır."
      />
      <ModuleStatus {...q} retry={q.refresh} />
      {q.data && (
        <>
          <CompetitionIdentity />
          <div className="module-tabs" role="group" aria-label="Turnir filtri">
            {[
              ["all", "Hamısı"],
              ["active", "Aktiv"],
              ["scheduled", "Yaxınlaşan"],
              ["completed", "Bitmiş"],
            ].map(([v, l]) => (
              <button
                key={v}
                aria-pressed={filter === v}
                onClick={() => setFilter(v)}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="module-grid">
            {q.data.tournaments
              .filter((t) => filter === "all" || t.status === filter)
              .map((t) => (
                <article className="module-card arena-card" key={t.id}>
                  <div className="card-kicker">
                    {t.mode === "async" ? "Həftəlik sınaq" : "Canlı pley-off"} ·{" "}
                    {t.status === "active"
                      ? "Aktiv"
                      : t.status === "scheduled"
                        ? "Yaxınlaşır"
                        : t.status === "completed"
                          ? "Bitib"
                          : "Ləğv edilib"}
                  </div>
                  <h2>{t.name}</h2>
                  <p>
                    {t.subject} · {t.grade}-ci sinif · {t.question_count} sual
                  </p>
                  <p>
                    {dateTime(t.starts_at)} — {dateTime(t.ends_at)}
                  </p>
                  <div className="arena-participants">
                    <strong>{t.participants ?? 0}</strong>
                    <span>/ {t.max_participants} real iştirakçı</span>
                  </div>
                  {t.champion && <p>Qalib: {t.champion.nickname}</p>}
                  <Link
                    className="module-button primary"
                    href={`/kairo/arena/${t.id}`}
                  >
                    {t.registered ? "Yarışım" : "Yarışa bax"} ↗
                  </Link>
                </article>
              ))}
          </div>
          {!q.data.tournaments.filter(
            (t) => filter === "all" || t.status === filter,
          ).length && (
            <div className="module-empty">
              Bu bölmədə turnir yoxdur. Həftəlik yarışlar cədvəl əsasında
              yaradılır.
            </div>
          )}
          <section className="module-panel">
            <h2>Nailiyyətlərin</h2>
            {q.data.achievements.length ? (
              <Achievements items={q.data.achievements} />
            ) : (
              <p>İlk real qələbəndən sonra nailiyyətin burada görünəcək.</p>
            )}
          </section>
        </>
      )}
    </>
  );
}
export function ArenaWorkspace({ id }: { id: string }) {
  const q = useKairo<ArenaState>("arena.get", { id }, 10000),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    router = useRouter(),
    request = useRef(""),
    now = useNow();
  async function act(op: string) {
    setBusy(true);
    setError("");
    try {
      if (op === "arena.start") {
        request.current ||= crypto.randomUUID();
        const s = await kairo<{ session_id: string }>(op, {
          id,
          request_id: request.current,
        });
        router.push(`/kairo/exam/session/${s.session_id}`);
      } else q.setData(await kairo<ArenaState>(op, { id }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!q.data) return <ModuleStatus {...q} retry={q.refresh} />;
  const { tournament: t } = q.data;
  const registration =
      now >= Date.parse(t.registration_opens) &&
      now < Date.parse(t.registration_closes) &&
      ["scheduled", "active"].includes(t.status),
    started =
      t.status === "active" &&
      now >= Date.parse(t.starts_at) &&
      now < Date.parse(t.ends_at);
  return (
    <>
      <ModuleHeading
        eyebrow={`Arena / ${t.mode === "async" ? "Həftəlik sınaq" : "Pley-off"}`}
        title={t.name}
        description={`${t.subject} · ${t.grade}-ci sinif · ${t.question_count} sual · ${dateTime(t.starts_at)}`}
      />
      {(error || q.error) && <Notice error>{error || q.error}</Notice>}
      <CompetitionIdentity />
      <section className="module-panel">
        <div className="module-actions">
          {!q.data.registered && registration && (
            <button
              className="module-button primary"
              disabled={busy}
              onClick={() => void act("arena.register")}
            >
              Qeydiyyatdan keç
            </button>
          )}
          {q.data.registered && now < Date.parse(t.starts_at) && (
            <button
              className="module-button"
              disabled={busy}
              onClick={() => void act("arena.withdraw")}
            >
              Qeydiyyatdan çıx
            </button>
          )}
          {q.data.registered && t.mode === "async" && started && (
            <button
              className="module-button primary"
              disabled={busy}
              onClick={() => void act("arena.start")}
            >
              {q.data.my_entry ? "Sınağıma keç" : "Sınağa başla"}
            </button>
          )}
          {q.data.my_entry && (
            <Link
              className="module-button"
              href={`/kairo/exam/session/${q.data.my_entry.session_id}`}
            >
              Nəticəm / sessiyam ↗
            </Link>
          )}
          <Link className="module-button" href="/kairo/arena">
            Bütün yarışlar
          </Link>
        </div>
        <p>
          Qeydiyyat: {dateTime(t.registration_opens)} —{" "}
          {dateTime(t.registration_closes)}
        </p>
        <p>
          Yarışın sonu: {dateTime(t.ends_at)} ·{" "}
          {q.data.registered
            ? "Qeydiyyatın təsdiqlənib"
            : "Qeydiyyatdan keçməmisən"}
        </p>
        {t.mode === "async" ? (
          <Notice>
            Bir iştirakçıya bir cəhd. Eyni sabit sual dəsti. Sıralama: bal →
            düzgün cavab sayı → daha az server vaxtı → daha erkən bitirmə.
            Sualların cavab açarları yarış bitəndə açılır.
          </Notice>
        ) : (
          <Notice>
            İştirakçılar həqiqi qeydiyyatlardan seçilir. Tək qalan iştirakçı
            “bye” ilə keçir. Hər raund yeni suallar verir. Hazırlıq pəncərəsində
            qoşulmayan iştirakçı texniki məğlubiyyət alır.
          </Notice>
        )}
        {q.data.my_entry?.disqualified && (
          <Notice error>
            Nəticən reytinqdən çıxarılıb: {q.data.my_entry.note}
          </Notice>
        )}
        {t.champion && (
          <div className="arena-champion">
            <PlayerAvatar player={t.champion} />
            <div>
              <span className="card-kicker">Arena qalibi</span>
              <h2>{t.champion.nickname}</h2>
            </div>
          </div>
        )}
      </section>
      {t.mode === "async" ? (
        <section className="module-panel">
          <h2>Canlı reytinq</h2>
          {!q.data.leaderboard.length ? (
            <div className="module-empty">
              Hələ tamamlanmış nəticə yoxdur. Reytinq ilk real nəticədən sonra
              yaranacaq.
            </div>
          ) : (
            <div className="module-table-wrap">
              <table className="module-table">
                <thead>
                  <tr>
                    <th>Yer</th>
                    <th>İştirakçı</th>
                    <th>Bal</th>
                    <th>Düzgün</th>
                    <th>Vaxt</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.leaderboard.map((r) => (
                    <tr key={r.player.id} className={r.me ? "is-me" : ""}>
                      <td>#{r.rank}</td>
                      <td>
                        <span className="inline-player">
                          <PlayerAvatar player={r.player} size={30} />
                          {r.player.nickname}
                          {r.me ? " · sən" : ""}
                        </span>
                      </td>
                      <td>
                        {r.score}/{r.maximum}
                      </td>
                      <td>
                        {r.correct}/{r.total}
                      </td>
                      <td>{Number(r.elapsed_seconds).toFixed(1)} san</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <section>
          <h2>Turnir cədvəli</h2>
          {!q.data.bracket.length ? (
            <div className="module-empty">
              Pley-off qeydiyyat bağlandıqda real iştirakçılar əsasında
              qurulacaq.
            </div>
          ) : (
            <div className="arena-bracket">
              {[...new Set(q.data.bracket.map((n) => n.round))].map((round) => (
                <div className="bracket-round" key={round}>
                  <h3>Raund {round}</h3>
                  {q
                    .data!.bracket.filter((n) => n.round === round)
                    .map((n) => (
                      <article className="bracket-match" key={n.slot}>
                        {[n.a, n.b].map((p, i) => (
                          <div
                            key={i}
                            className={
                              p?.id === n.winner?.id ? "bracket-winner" : ""
                            }
                          >
                            <PlayerAvatar player={p} size={28} />
                            <span>
                              {p?.nickname ??
                                (n.status === "bye"
                                  ? "Bye — rəqibsiz keçid"
                                  : "Növbəti iştirakçı")}
                            </span>
                            {p?.id === n.winner?.id && <strong>✓</strong>}
                          </div>
                        ))}
                        <small>
                          {n.status === "active"
                            ? "Qarşılaşma aktivdir"
                            : n.status === "bye"
                              ? "Rəqibsiz keçid"
                              : n.status === "finished"
                                ? "Tamamlanıb"
                                : n.status}
                        </small>
                        {n.my_match && (
                          <Link
                            className="module-button primary"
                            href={`/kairo/duel/match/${n.my_match}`}
                          >
                            Qarşılaşmama keç ↗
                          </Link>
                        )}
                      </article>
                    ))}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}
