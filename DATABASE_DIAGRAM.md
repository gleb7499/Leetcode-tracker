# Database Model

This document describes the logical data model for LeetCode Tracker.

## Architectural rules

- `USER_REVIEWS` is the source of truth for review history.
- `USER_TASKS` stores the operational snapshot and the next review date.
- `TASK_TOPICS` implements the many-to-many relationship between tasks and topics.
- Legacy user-specific tables are normalized into shared tables with `user_id`.
- Users interact only with their own tasks; the server manages the shared task lifecycle transparently.

## Integrity constraints

- `UNIQUE(user_id, task_id)` in `USER_TASKS`;
- `UNIQUE(task_id, topic_id)` in `TASK_TOPICS`;
- `UNIQUE(identity_key)` in `TASKS`;
- cascading deletes from users/tasks to relationships and review history;
- unique dictionary values for topic names, difficulty levels, and state codes.

```mermaid
erDiagram
    USERS {
        bigint id PK
        varchar email UK
        varchar pass_hash
        varchar name
        datetime created_at
        datetime updated_at
    }
    DIFFICULTY {
        int id PK
        varchar level UK
    }
    STATES {
        int id PK
        varchar code UK
        varchar label
    }
    REVIEW_POLICIES {
        int state_id PK
        int base_interval_days
        float growth_factor
        int max_interval_days
        bool is_active
    }
    TASKS {
        bigint id PK
        varchar identity_key UK
        varchar source_type
        varchar source_problem_id
        varchar title
        text description
        varchar link
        int difficulty_id FK
        datetime created_at
        datetime updated_at
    }
    TOPICS {
        bigint id PK
        varchar name UK
        varchar slug UK
        datetime created_at
    }
    TASK_TOPICS {
        bigint id PK
        bigint task_id FK
        bigint topic_id FK
        datetime created_at
    }
    USER_TASKS {
        bigint id PK
        bigint user_id FK
        bigint task_id FK
        int current_state_id FK
        date last_review_date
        date next_review_date
        text user_notes
        datetime created_at
        datetime updated_at
    }
    USER_REVIEWS {
        bigint id PK
        bigint user_task_id FK
        int state_id FK
        datetime reviewed_at
        int interval_days
        date next_review_date
        text review_text
        datetime created_at
    }
    DIFFICULTY ||--o{ TASKS : difficulty
    TASKS ||--o{ TASK_TOPICS : has_topics
    TOPICS ||--o{ TASK_TOPICS : maps
    USERS ||--o{ USER_TASKS : tracks
    TASKS ||--o{ USER_TASKS : assigned
    STATES ||--o{ USER_TASKS : current_state
    USER_TASKS ||--o{ USER_REVIEWS : review_history
    STATES ||--o{ USER_REVIEWS : outcome
    STATES ||--|| REVIEW_POLICIES : interval_policy
```

## Table groups

### Reference tables

- `DIFFICULTY`: problem difficulty levels.
- `STATES`: review outcomes.
- `TOPICS`: normalized problem topics.
- `REVIEW_POLICIES`: interval rules for each review outcome.

### Operational tables

- `USERS`: accounts and profile attributes.
- `TASKS`: shared problem cards and deduplication identity keys.
- `TASK_TOPICS`: task/topic relationships.
- `USER_TASKS`: the user's current tracking state for a task.

### Reporting table

- `USER_REVIEWS`: the complete review history used for analytics and learning trends.

## Task lifecycle

When a user adds a problem, the backend calculates `identity_key`, reuses an existing `TASKS` record where possible, and creates the user's `USER_TASKS` relationship. When a user removes a problem, only that relationship is removed; the shared task remains while other users reference it.
