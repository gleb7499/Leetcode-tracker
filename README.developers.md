# LeetCode Tracker: Developer README

This document describes the technical baseline, implementation boundaries, and review conventions for LeetCode Tracker.

## 1. Purpose

LeetCode Tracker is a personal learning product for algorithm practice, spaced repetition, and progress analysis.

## 2. Technology baseline

The active target stack is:

- frontend: React, Vite, and TypeScript;
- backend: Java and Spring;
- database: PostgreSQL.

References to alternative stacks in older files are historical and should not be used as the basis for new work.

## 3. Current state

- `frontend` contains the active client application;
- `backend` is the planned Java + Spring service boundary;
- the architecture is moving from local browser storage toward a PostgreSQL-backed server model.

## 4. Repository structure

- `frontend`: React + Vite + TypeScript client;
- `backend`: backend service under development;
- `PRODUCT_SPECIFICATION.md`: product and technical direction;
- `DATABASE_DIAGRAM.md`: conceptual data model;
- `BACKEND_FRONTEND_CONTRACT.md`: API and DTO contract.

## 5. Local development

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Additional commands:

```bash
npm run build
npm run lint
npm run preview
```

### Backend

The backend is being developed as a Java + Spring service designed around PostgreSQL as the primary database.

## 6. Architectural principles

- the server is the source of truth for user and learning data;
- spaced-repetition logic must be deterministic and testable;
- the data model must support review history and analytical views;
- API contracts and DTOs must be stable and versioned;
- PostgreSQL is the default choice for persistence and migrations.

## 7. Backend design directions

- authentication and session management;
- task and topic management;
- review scheduling and interval recalculation;
- statistics and reporting;
- notifications and integrations.

## 8. Documentation rules

- the public README remains concise and product-oriented;
- technical decisions belong in this document and the linked engineering artifacts;
- when descriptions conflict, the current baseline is React + Vite + TypeScript, Java + Spring, and PostgreSQL.
