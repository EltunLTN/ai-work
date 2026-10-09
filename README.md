<p align="center">
  <img src="./public/kairo-logo.svg" alt="Kairo Logo" width="520" />
</p>

<h1 align="center">Kairo</h1>
<p align="center">
  AI-powered Math Exam Coach for grades 1-11, aligned with e-derslik topic structures.
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" />
  <img alt="Tailwind" src="https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss&logoColor=white" />
  <img alt="OpenAI" src="https://img.shields.io/badge/OpenAI-API-412991" />
</p>

## Overview

Kairo is a modern AI learning platform focused on Mathematics only.
It provides:

- Diagnostic and adaptive quiz generation
- Skill-level detection and weakness analysis
- Mistake review with explanations
- Personalized 7-day AI plan
- Dashboard insights and progress tracking

The platform is designed for startup demo quality and practical daily use by students.

## Core Product Direction

- Subject scope: Mathematics only
- Grade coverage: 1 to 11
- Curriculum source: e-derslik references and topic structures
- Output language: Azerbaijani and English UI support
- Learning model: diagnostic first, adaptive next, plan-driven progression

## Key Features

### 1) AI Quiz Engine

- Generates topic-aware diagnostic question sets
- Generates adaptive questions based on weak topics and level
- Repairs malformed or inconsistent AI output
- Performs extra correctness checks for math patterns (including derivative-style checks)

### 2) Reliable Review Layer

- Stores user answers and served questions
- Shows where the student made mistakes
- Displays user answer, correct answer, and AI explanation together

### 3) Personalized Plan System

- Builds a 7-day AI study plan
- Interactive daily tasks with progress tracking
- Topic resource cards: material, mini quiz, video

### 4) Dashboard Analytics

- Predicted score and level
- Topic performance chart
- Recommended next action
- Learning stage snapshots

### 5) UX and Theming

- Dark and light theme modes
- Responsive mobile-first layout
- Framer Motion-powered interactive transitions

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- Recharts
- OpenAI API
- Reusable UI primitives

## Project Structure

- app: routes and API endpoints
- components: reusable UI and feature modules
- lib: AI client, analytics, storage, i18n, constants
- data: curriculum and topic references
- public: static assets and branding

## Main Routes

- / : Landing page
- /onboarding : Grade and textbook topic setup
- /quiz : Diagnostic plus adaptive quiz flow
- /results : Analysis plus detailed mistake review
- /plan : Interactive 7-day AI study plan
- /mini-quiz : Topic-focused quick quiz mode
- /dashboard : Persistent summary and progression view

## AI Endpoints

- POST /api/ai/diagnostic
- POST /api/ai/adaptive
- POST /api/ai/feedback-summary
- POST /api/ai/study-plan

Compatibility endpoints:

- POST /api/ai/questions
- POST /api/ai/feedback
- POST /api/ai/plan

## Curriculum and Source Policy

Kairo uses e-derslik as a curriculum reference source, not as a raw content mirror.

- Source references are kept as metadata and topic guidance
- Full textbook content is not copied into the app
- Questions are generated as original outputs

Example source reference:

- https://www.e-derslik.edu.az/portal/book.php?id=817

## Local Development

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create a .env.local file and set:

```bash
OPENAI_API_KEY=your_openai_api_key
```

### 3) Run the app

```bash
npm run dev
```

Open:

- http://localhost:3000

### 4) Quality checks

```bash
npm run lint
npm run build
```

## Production Notes

- Local storage is used for profile, question set, answers, result, feedback, and plan state.
- AI responses are validated and repaired before being served to the UI.
- If AI output is invalid, robust fallback generation protects core flows.

## Security Recommendation

Do not commit real API keys to version control.

- Keep .env.local private
- Rotate any exposed keys immediately
- Use environment secrets in deployment platforms

## Roadmap Ideas

- Teacher dashboard and classroom mode
- Attempt history with trend lines
- Topic mastery heatmap per grade
- Parent view with weekly summary
- Question bank calibration and quality scoring

## License

For hackathon and educational demo use. Add a formal license file if you plan public distribution.
