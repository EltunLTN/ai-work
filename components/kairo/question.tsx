"use client";
import Image from "next/image";
import { MathContent } from "./math-content";
import type { Answer, BankQuestion } from "@/lib/kairo/types";
export function AnswerInput({
  question: q,
  value,
  onChange,
  disabled = false,
}: {
  question: BankQuestion;
  value: Answer;
  onChange: (value: Answer) => void;
  disabled?: boolean;
}) {
  if (q.type === "single" || q.type === "passage" || q.type === "image")
    return (
      <div
        className="module-answer-options"
        role="group"
        aria-label="Cavab variantları"
      >
        {q.body.options?.map((option, i) => (
          <button
            key={i}
            disabled={disabled}
            aria-pressed={value === i}
            onClick={() => onChange(i)}
          >
            <span>{String.fromCharCode(65 + i)}</span>
            <MathContent>{option}</MathContent>
          </button>
        ))}
      </div>
    );
  if (q.type === "multiple") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div
        className="module-answer-options"
        role="group"
        aria-label="Bir neçə cavab seç"
      >
        {q.body.options?.map((option, i) => (
          <button
            key={i}
            disabled={disabled}
            aria-pressed={selected.includes(i)}
            onClick={() =>
              onChange(
                selected.includes(i)
                  ? selected.filter((n) => n !== i)
                  : [...selected, i].sort(),
              )
            }
          >
            <span>
              {selected.includes(i) ? "✓" : String.fromCharCode(65 + i)}
            </span>
            <MathContent>{option}</MathContent>
          </button>
        ))}
      </div>
    );
  }
  if (q.type === "matching") {
    const selected =
      value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return (
      <div className="matching-answers">
        {q.body.left?.map((left, i) => (
          <label key={i}>
            <MathContent>{left}</MathContent>
            <select
              disabled={disabled}
              value={selected[String(i)] ?? ""}
              onChange={(e) => onChange({ ...selected, [i]: e.target.value })}
            >
              <option value="">Uyğunluğu seç</option>
              {q.body.right?.map((right, n) => (
                <option key={n} value={n}>
                  {right.replaceAll("$", "")}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    );
  }
  return (
    <label className="typed-answer">
      {q.type === "written"
        ? "Həllini addım-addım yaz"
        : q.type === "numeric"
          ? "Rəqəm cavabı (məsələn, 1/2 və ya 0,5)"
          : "Qısa cavab"}
      {q.type === "written" ? (
        <textarea
          rows={8}
          maxLength={6000}
          disabled={disabled}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          inputMode={q.type === "numeric" ? "decimal" : "text"}
          maxLength={q.type === "numeric" ? 80 : 300}
          disabled={disabled}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
export function QuestionView({
  question: q,
  value,
  onChange,
  disabled = false,
}: {
  question: BankQuestion;
  value: Answer;
  onChange: (value: Answer) => void;
  disabled?: boolean;
}) {
  return (
    <article className="module-question">
      <div className="question-meta">
        <span>
          {q.subject} · {q.topic}
        </span>
        <span>
          {
            {
              single: "Bir cavab",
              multiple: "Bir neçə cavab",
              numeric: "Rəqəm",
              short: "Qısa cavab",
              matching: "Uyğunlaşdırma",
              written: "Yazılı həll",
              passage: "Mətn üzrə",
              image: "Diaqram üzrə",
            }[q.type]
          }
        </span>
      </div>
      {q.body.passage && (
        <div className="question-passage">
          <MathContent>{q.body.passage}</MathContent>
        </div>
      )}
      {q.body.image_url && (
        <Image
          src={q.body.image_url}
          alt={q.body.image_alt ?? "Sualın diaqramı"}
          width={520}
          height={310}
          unoptimized
          className="question-diagram"
        />
      )}
      <div className="question-statement">
        <MathContent>{q.body.statement}</MathContent>
      </div>
      <AnswerInput
        question={q}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    </article>
  );
}
export function answerText(q: BankQuestion, value: Answer | undefined): string {
  if (value === undefined || value === null || value === "")
    return "Cavab verilməyib";
  if (typeof value === "number")
    return q.body.options?.[value] ?? String(value);
  if (Array.isArray(value))
    return value.length
      ? value.map((i) => q.body.options?.[i] ?? String(i)).join("; ")
      : "Cavab seçilməyib";
  if (typeof value === "object")
    return Object.entries(value)
      .map(
        ([i, n]) =>
          `${q.body.left?.[Number(i)] ?? i} → ${q.body.right?.[Number(n)] ?? n}`,
      )
      .join("; ");
  return value;
}
export function QuestionReview({
  question: q,
  answer,
  explanation,
  points,
}: {
  question: BankQuestion;
  answer: Answer;
  explanation?: string;
  points?: string;
}) {
  return (
    <details className="question-review">
      <summary>
        <span>
          {q.ordinal !== undefined ? `${q.ordinal + 1}. ` : ""}
          {q.topic}
        </span>
        <strong>
          {points ??
            (q.correct === null
              ? "Yoxlama gözləyir"
              : q.correct
                ? "Düzgün"
                : "Səhv")}
        </strong>
      </summary>
      <MathContent>{q.body.statement}</MathContent>
      <p className="review-label">Sənin cavabın</p>
      <MathContent>{answerText(q, answer)}</MathContent>
      {q.key && (
        <>
          <p className="review-label">Cavab / meyar</p>
          <MathContent>
            {q.key.rubric ??
              (q.key.answers?.join("; ") || answerText(q, q.key.answer))}
          </MathContent>
        </>
      )}
      {(explanation ?? q.explanation) && (
        <div className="question-explanation">
          <MathContent>{explanation ?? q.explanation ?? ""}</MathContent>
        </div>
      )}
      {q.written_review?.feedback && (
        <p>Yoxlayıcı rəyi: {q.written_review.feedback}</p>
      )}
    </details>
  );
}
