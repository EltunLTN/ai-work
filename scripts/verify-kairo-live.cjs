/* eslint-disable @typescript-eslint/no-require-imports -- Opt-in HTTP/WebSocket integration test against disposable QA identities. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createClient } = require("@supabase/supabase-js");
// KAIRO_QA_CREDENTIALS must point outside the repository to disposable, confirmed test accounts.
// This script creates only synthetic learning records; it never deletes or edits another account.
async function main() {
  const f = JSON.parse(
    fs.readFileSync(process.env.KAIRO_QA_CREDENTIALS, "utf8"),
  );
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const clients = [0, 1].map(() =>
    createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  );
  const sessions = await Promise.all(
    clients.map((db, i) =>
      db.auth
        .signInWithPassword({
          email: i ? f.emailB : f.emailA,
          password: f.password,
        })
        .then((r) => {
          if (r.error) throw r.error;
          return r.data.session;
        }),
    ),
  );
  assert.notEqual(sessions[0].user.id, sessions[1].user.id);
  assert.notEqual(sessions[0].access_token, sessions[1].access_token);
  const call = async (i, operation, payload = {}) => {
    const { data, error } = await clients[i].rpc("kairo_api", {
      operation,
      payload,
    });
    if (error) throw new Error(`${operation}: ${error.message}`);
    return data;
  };
  await Promise.all(
    [0, 1].map((i) =>
      call(i, "profile.save", {
        nickname: `QA Live ${i ? "B" : "A"} ${sessions[i].user.id.slice(0, 6)}`,
        color: "#587162",
        consent: true,
      }),
    ),
  );
  const deny = await clients[1].rpc("kairo_api", {
    operation: "duel.join",
    payload: { token: "0".repeat(48) },
  });
  assert.ok(deny.error);
  let match = await call(0, "duel.create", {
    settings: {
      subject: "Riyaziyyat",
      grade: 11,
      count: 5,
      seconds: 15,
      difficulty: "mixed",
      topic: "",
    },
  });
  const id = match.id;
  const privateBefore = await clients[1]
    .from("kairo_live_matches")
    .select("*")
    .eq("id", id);
  assert.equal(privateBefore.data.length, 0);
  let revisions = 0;
  const channel = clients[0].channel(`qa-live-${id}`).on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "kairo_live_matches",
      filter: `id=eq.${id}`,
    },
    () => revisions++,
  );
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Realtime subscription timeout")),
      15000,
    );
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timeout);
        resolve();
      }
      if (status === "CHANNEL_ERROR") {
        clearTimeout(timeout);
        reject(new Error("Realtime subscription failed"));
      }
    });
  });
  const joined = await call(1, "duel.join", { token: match.token });
  assert.equal(joined.players.length, 2);
  const privateAfter = await clients[1]
    .from("kairo_live_matches")
    .select("*")
    .eq("id", id);
  assert.equal(privateAfter.data.length, 1);
  await Promise.all([0, 1].map((i) => call(i, "duel.ready", { id })));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const answered = new Set();
  let duplicateChecked = false;
  for (let tries = 0; tries < 100; tries++) {
    const states = await Promise.all(
      [0, 1].map((i) => call(i, "duel.get", { id })),
    );
    match = states[0];
    assert.equal(states[0].round, states[1].round);
    if (match.status === "finished") break;
    if (match.status === "active" && !answered.has(match.round)) {
      assert.deepEqual(states[0].question, states[1].question);
      assert.equal(match.question.key, undefined);
      const value =
        match.question.type === "matching"
          ? { 0: "0", 1: "1" }
          : match.question.type === "multiple"
            ? [0]
            : ["numeric", "short"].includes(match.question.type)
              ? "0"
              : 0;
      await Promise.all(
        [0, 1].map((i) =>
          call(i, "duel.answer", {
            id,
            round: match.round,
            answer: value,
            points: 999999,
          }),
        ),
      );
      const before = await call(0, "duel.get", { id });
      const duplicate = await call(0, "duel.answer", {
        id,
        round: match.round,
        answer: value,
      });
      assert.deepEqual(
        before.players.map((p) => p.score),
        duplicate.players.map((p) => p.score),
      );
      duplicateChecked = true;
      answered.add(match.round);
    }
    await sleep(1000);
  }
  assert.equal(match.status, "finished");
  assert.equal(answered.size, 5);
  assert.ok(duplicateChecked);
  assert.ok(revisions > 0, "Realtime must deliver actual revisions");
  assert.ok(match.players.every((p) => p.score >= 0 && p.score <= 750));
  assert.equal(match.review.length, 5);
  assert.ok(match.players.every((p) => !("user_id" in p) && !("email" in p)));
  await clients[0].removeChannel(channel);
  const catalog = await call(0, "exam.catalog");
  const template = catalog.templates.find(
    (t) => t.sections.length === 1 && t.sections[0].subject === "Fizika",
  );
  const request = crypto.randomUUID();
  const exam = await call(0, "exam.start", {
    template: template.id,
    request_id: request,
  });
  assert.equal(
    (
      await call(0, "exam.start", {
        template: template.id,
        request_id: request,
      })
    ).id,
    exam.id,
  );
  assert.ok(
    (
      await clients[1].rpc("kairo_api", {
        operation: "exam.get",
        payload: { id: exam.id },
      })
    ).error,
  );
  const lock = await clients[0].rpc("kairo_ai_allowed");
  assert.equal(lock.data, false);
  await call(0, "exam.save", {
    id: exam.id,
    answers: [{ ordinal: 0, value: 0, marked: true, revision: 1 }],
    index: 2,
  });
  const resumed = await call(0, "exam.get", { id: exam.id });
  assert.equal(resumed.current_index, 2);
  assert.equal(resumed.answers[0].marked, true);
  const result = await call(0, "exam.submit", { id: exam.id });
  const repeated = await call(0, "exam.submit", { id: exam.id });
  assert.deepEqual(result.result, repeated.result);
  assert.equal((await clients[0].rpc("kairo_ai_allowed")).data, true);
  const goals = await call(0, "goals.get");
  assert.ok(goals.programs.length >= 3);
  const saved = await call(0, "goals.save", {
    program: goals.programs[0].id,
    target: 600,
    year: 2027,
    funding: "either",
  });
  assert.equal(saved.goals[0].target_score, 600);
  assert.equal(saved.goals[0].program.cutoff, null);
  const focus = await call(0, "focus.start", {
    request_id: crypto.randomUUID(),
    subject: "Fizika",
    task: "QA HTTP focus",
    return_path: "/kairo/exam",
    settings: {
      focus: 1,
      short_break: 1,
      long_break: 1,
      rounds: 1,
      daily_goal: 30,
      auto_break: false,
      sound: false,
    },
  });
  assert.equal(focus.active.status, "active");
  const paused = await call(0, "focus.pause", { id: focus.active.id });
  assert.equal(paused.active.status, "paused");
  await call(0, "focus.resume", { id: focus.active.id });
  await call(0, "focus.end", { id: focus.active.id });
  const teacher = await call(0, "tutor.create", {
    subject: "Riyaziyyat",
    grade: 7,
    topic: "Xətti tənliklər",
    statement: "2x + 3 = 11",
    mode: "socratic",
  });
  assert.ok(teacher.session.id);
  const forged = await clients[0].rpc("kairo_api", {
    operation: "tutor.finish",
    payload: {
      id: teacher.session.id,
      request_id: crypto.randomUUID(),
      answer: "fake",
      verified: true,
    },
  });
  assert.ok(forged.error);
  const arenas = await call(0, "arena.catalog");
  assert.ok(arenas.tournaments.length >= 2);
  const summary = {
    authenticatedSessions: 2,
    realtimeRevisions: revisions,
    duelRounds: answered.size,
    duelStatus: match.status,
    serverScores: match.players.map((p) => p.score),
    examResume: true,
    examIdempotency: true,
    aiLock: true,
    crossUserDenied: true,
    goals: true,
    focus: true,
    tutorSession: teacher.session.id,
    arenaEvents: arenas.tournaments.length,
  };
  fs.writeFileSync(
    process.env.KAIRO_QA_REPORT || "../kairo-live-verification.json",
    JSON.stringify(summary, null, 2),
  );
  console.log(JSON.stringify(summary));
  await Promise.all(clients.map((db) => db.auth.signOut({ scope: "local" })));
  for (const db of clients) db.realtime.disconnect();
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
