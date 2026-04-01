---
description: "Use when planning, implementing, reviewing, or documenting Leetcode Tracker features. Defines stable product vision and authoritative technology stack across frontend, backend, and database."
name: "Leetcode Tracker Foundation"
---
# Leetcode Tracker Foundation

- Treat this file as the stable baseline for project decisions unless the user explicitly overrides it in a newer instruction.
- Core product idea: build a Leetcode task tracker with spaced repetition, progress tracking, and a clear daily review workflow for algorithm practice.
- Functional direction that should remain stable: task management, review sessions with memory-quality outcomes, scheduling of next reviews, and user-facing statistics.
- Frontend stack is fixed: React + Vite + TypeScript.
- Backend stack is fixed: Java + Spring ecosystem and Spring libraries.
- Database choice is fixed: PostgreSQL.
- If any README, historical note, or technical specification mentions alternative stacks, treat them as outdated context. The stack defined in this instruction is authoritative.
- Do not propose or scaffold alternative backend frameworks (for example Node.js, Python frameworks, or non-Spring Java stacks) unless the user explicitly requests a stack change.
- Do not propose or scaffold alternative databases as a default choice; use PostgreSQL assumptions for schema, migrations, and persistence design.
- Keep architecture discussions and implementation plans aligned with a long-term client-server model where the current frontend evolves into integration with the Java Spring backend.
- For architecture or process documentation, prefer concise prose rules and rationale. Do not include code examples unless the user explicitly asks for them.
- In frontend code comments, prefer architecture-aware comments with single-source-of-truth references and avoid duplicated rule statements.
