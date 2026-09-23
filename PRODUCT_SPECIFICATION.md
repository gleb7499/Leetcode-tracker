# Product Specification

## 1. Product concept

LeetCode Tracker is a system for regular algorithm practice based on spaced repetition.

The product should let users add problems, assess recall quality, automatically schedule future reviews, and understand both learning progress and upcoming workload.

## 2. Technology baseline

The current target stack is:

- frontend: React, Vite, and TypeScript;
- backend: Java and Spring;
- database: PostgreSQL.

Older technology references should be treated as historical notes rather than implementation guidance.

## 3. Architecture

The product is evolving toward a client/server architecture:

1. **Web client**: tasks, reviews, statistics, and settings.
2. **API and business logic**: tasks, reviews, scheduling, statistics, authentication, and access control.
3. **PostgreSQL storage**: users, tasks, review history, schedules, and analytics.
4. **Mobile direction**: an optional Android client and review reminders.

## 4. Functional requirements

### Task management

- add problems manually;
- support external links such as LeetCode URLs;
- store notes, difficulty, topics, and user labels;
- edit and delete tracked problems.

### Review workflow

- review one problem at a time;
- review all problems due today;
- record recall quality after each attempt.

### Review outcomes

- Don't Remember;
- Partially Remember;
- Remember Well.

The selected outcome determines the next review date.

### Progress and analytics

- reviews per day;
- successful and unsuccessful outcomes;
- recall quality over time;
- upcoming workload;
- progress by topic, difficulty, and selected segments.

### Synchronization and notifications

Data should remain consistent across clients. Users should see the same task state after signing in on another device. The roadmap includes reminders for tasks due today, with Android notifications as the first priority and web notifications as a possible extension.

## 5. Non-functional requirements

- predictable and stable scheduling logic;
- good performance for normal personal learning volumes;
- secure authentication and protection of user data;
- container-ready deployment;
- scalability as the number of users and tasks grows.

## 6. Conceptual data model

The minimum domain includes users, tasks, topics, task/topic relationships, review history, schedules, authentication/session data, and analytics aggregates or views. PostgreSQL remains the required target database.

## 7. Spaced repetition

The system must support short intervals after poor recall, longer intervals after stable successful recall, recalculation after every review, and complete history retention for analytics and context recovery.

## 8. Product screens

- **Home**: tasks due today, quick access to review, and daily workload.
- **Add task**: create a problem and enter its metadata.
- **Review**: show the problem, collect the outcome, and move to the next task.
- **Statistics**: activity, recall quality, and future workload.
- **Settings**: review preferences, notifications, and interface options.

## 9. Current status

The frontend is active as a React + Vite + TypeScript application. The Java/Spring backend and PostgreSQL integration are the next major delivery stages. Local or temporary implementations are acceptable during this transition but must remain compatible with the target architecture.

Stage 0 done (2026-09): the Spring Boot backend scaffold exists — environment-driven configuration (`.env`-style variables with local defaults), package structure (`config`/`controller`/`service`/`repository`/`entity`/`dto`), `GET /api/health`, CORS and stateless security stubs.

Stage 1 done (2026-09): PostgreSQL schema via Flyway (`V1__init_schema.sql`, 9 tables per DATABASE_DIAGRAM.md with integrity constraints and seed data), Flyway enabled by default, docker-compose stack (postgres + backend multi-stage build + frontend behind nginx with `/api` proxy, optional maildev profile). Clean `docker compose up --build` brings up the whole stack.

Stage 2 done (2026-09): full auth API per BACKEND_FRONTEND_CONTRACT.md — register/login/me/logout, email-verification OTP (SMTP with log fallback), password reset, JWT access tokens + rotating hashed refresh tokens, unified error model, BCrypt. Contract extended with verify/refresh/reset endpoints.

Stage 3 done (2026-09): tasks CRUD with user isolation, LeetCode URL parsing, /today review queue, review recording with interval recalculation from review_policies (REMEMBER grows, PARTIAL keeps, FORGOT resets), full review history in user_reviews. Contract extended with tasks endpoints; V3 migration.

Stage 4 done (2026-09): statistics endpoints under /api/v1/me/stats — summary with streak, distributions by difficulty and source, recall quality, upcoming workload; computed from user_reviews/user_tasks/tasks per DATABASE_DIAGRAM.md (no separate aggregate table).

Stage 5 done (2026-09): frontend fully integrated with the backend per contract — shared API client (typed errors, token refresh rotation), auth/tasks/review/stats over HTTP, local storage removed for domain data, Vite /api proxy. Manual browser E2E passed; screenshots in docs/screenshots/.

Stage 6 done (2026-09): user settings + review-policy presets on the backend (V4 migration, `GET/PATCH /api/v1/me/settings`, `GET /api/v1/review-policies`; the chosen preset drives interval recalculation in the review flow), backup export/import (`GET/POST /api/v1/me/backup`, idempotent, no secrets in the file), password change with refresh revocation, account deletion with cascades. Settings panel on the frontend covers policy choice, UI options, backup, password change and account deletion. Contract extended; Testcontainers integration tests cover the round-trip export → wipe → import, preset-driven intervals, idempotent import, cascade deletion and session revocation.

Owner decision (2026-09): the project is a pet/open-source product. It is not deployed to the cloud and not monetized. The final form is a repository anyone can clone and run locally via Docker, positioned as local-first — user data lives only on their own machine. At the same time the architecture stays container-ready: the owner can deploy it on a real server at any time by changing only the environment configuration (including real SMTP for email). The step-by-step plan for this goal is maintained in [ROADMAP.md](ROADMAP.md) and takes precedence over the general roadmap below.

## 10. Roadmap

1. Stabilize task and review flows.
2. Implement the Java/Spring API.
3. Connect PostgreSQL and migrate persistence to the server.
4. Complete authentication and local backup/export (cross-device synchronization is out of scope for the local-first goal).
5. Expand analytics and local reminders.
6. Develop the mobile client.

## 11. Documentation priority

When documents disagree, prioritize current owner decisions, this specification, and repository-level project instructions. Older stack descriptions are historical context.
