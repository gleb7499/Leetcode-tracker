# BACKEND_FRONTEND_CONTRACT

## 1. Назначение

Этот документ фиксирует контракт взаимодействия между frontend (React + Vite + TypeScript) и backend (Java + Spring) для Leetcode Tracker.

Документ разделён на два уровня:

- Обязательно сейчас (MVP NOW): без этого текущий frontend логически не сможет работать после отключения localStorage-моков.
- Следующий этап (PHASE 2): полезно, но не блокирует запуск текущего UI.

## 2. Что реально нужно текущему frontend

| Экран/поток | Что нужно от backend |
|---|---|
| Login/Register | Вход, регистрация, проверка текущей сессии, выход |
| Home | Список задач на сегодня (уже готовых к повторению), удаление задачи |
| Add Task | Добавление задачи в кабинет пользователя |
| Review | Получение данных задачи и запись результата повторения |
| Forgot Password modal | Безопасный endpoint с одинаковым ответом (без раскрытия существования email) |
| Stats/Settings | Пока заглушки, для MVP не блокируют работоспособность |

## 3. Базовые правила API

| Правило | Значение |
|---|---|
| Базовый префикс | /api/v1 |
| Формат данных | application/json; charset=utf-8 |
| Формат полей JSON | camelCase |
| Формат datetime | ISO 8601 UTC |
| Формат date | YYYY-MM-DD |
| Трассировка | каждый ответ содержит requestId |

## 4. Совместимость с текущим frontend (обязательно)

Текущий frontend ожидает в auth-потоках понятный результат операции:

- success: boolean
- message: string

Поэтому для auth-endpoints это поле обязательно в ответе.

## 5. Обязательно сейчас (MVP NOW)

### 5.1 Auth endpoints

| Метод | Маршрут | Назначение | Обязательно |
|---|---|---|---|
| POST | /api/v1/auth/login | Вход пользователя | Да |
| POST | /api/v1/auth/register | Регистрация пользователя | Да |
| GET | /api/v1/auth/me | Получение текущего пользователя по сессии | Да |
| POST | /api/v1/auth/logout | Выход из сессии | Да |
| POST | /api/v1/auth/forgot-password | Запрос восстановления пароля | Да |

Контракт запросов:

- login request: email, password, remember
- register request: name, email, password
- forgot-password request: email

Контракт ответов (auth):

- success: boolean
- message: string
- user: object (для login/register/me при success = true)

Контракт user:

- id
- email
- name

Требование безопасности для forgot-password:

- ответ должен быть одинаково нейтральным вне зависимости от существования email.

### 5.2 Контракт данных задачи для текущего UI

Backend может иметь любую внутреннюю схему, но для текущего frontend должен отдавать DTO, достаточный для рендера без потери функциональности.

Контракт FrontendTask:

- id
- name
- url
- difficulty (Easy | Medium | Hard)
- topics: string[]
- notes
- createdAt
- nextReview
- reviews: array of { date, status }

Контракт ReviewStatus:

- forgot
- partial
- remember

### 5.3 User tasks endpoints (MVP)

| Метод | Маршрут | Назначение | Обязательно |
|---|---|---|---|
| GET | /api/v1/me/tasks/today | Список задач на сегодня для главного экрана | Да |
| GET | /api/v1/me/tasks/{taskId} | Получить задачу по id для экрана review | Да |
| POST | /api/v1/me/tasks | Добавить задачу в кабинет | Да |
| DELETE | /api/v1/me/tasks/{taskId} | Удалить задачу из кабинета | Да |
| POST | /api/v1/me/tasks/{taskId}/reviews | Записать результат повторения | Да |

Контракт add-task request:

- name
- url
- difficulty
- topics (допускается string CSV или string[]; backend обязан нормализовать)
- notes

Контракт record-review request:

- status (forgot | partial | remember)

Контракт record-review response:

- success
- message
- task (обновлённый FrontendTask с новым nextReview и расширенным reviews)

### 5.4 Динамический жизненный цикл TASKS (обязательно)

Это обязательное поведение backend, скрытое от конечного пользователя.

При добавлении задачи:

- backend вычисляет внутренний identityKey;
- ищет существующую TASKS по identityKey;
- если запись есть, не создаёт дубль TASKS и создаёт только связь пользователя с задачей;
- если записи нет, создаёт TASKS и затем связь пользователя с задачей.

При удалении задачи из кабинета:

- backend удаляет связь текущего пользователя с задачей;
- проверяет, остались ли ссылки от других пользователей;
- если ссылки есть, TASKS не удаляется;
- если ссылок нет, TASKS удаляется вместе со связями TASK_TOPICS.

Технические требования:

- add/remove выполняются транзакционно;
- система устойчива к конкурентным запросам;
- удаление идемпотентно с пользовательской точки зрения.

### 5.5 Ошибки для MVP

| HTTP | code | Когда используется |
|---|---|---|
| 400 | BAD_REQUEST | Некорректный формат входных данных |
| 401 | UNAUTHORIZED | Нет валидной сессии |
| 404 | NOT_FOUND | Задача или пользовательский ресурс не найден |
| 409 | CONFLICT | Дубликат или конфликт бизнес-инварианта |
| 422 | VALIDATION_ERROR | Ошибка доменной валидации |
| 500 | INTERNAL_ERROR | Внутренняя ошибка backend |

## 6. Следующий этап (PHASE 2)

Эти контракты не обязательны для запуска текущего frontend, но нужны для развития продукта.

### 6.1 Справочники

- GET /api/v1/dictionaries/difficulty
- GET /api/v1/dictionaries/states
- GET /api/v1/dictionaries/topics
- GET /api/v1/dictionaries/review-policies

### 6.2 Расширенный каталог задач

- GET /api/v1/tasks
- GET /api/v1/tasks/{taskId}
- PATCH /api/v1/tasks/{taskId}

### 6.3 Статистика

- GET /api/v1/me/stats/overview
- GET /api/v1/me/stats/daily-activity
- GET /api/v1/me/stats/outcomes
- GET /api/v1/me/stats/load-forecast

### 6.4 Общие платформенные расширения

- расширенная пагинация и сортировка;
- rate limiting и observability-политики;
- контрактная версионизация с отдельным /api/v2 при breaking changes.

## 7. Правила эволюции контракта

- Любое изменение MVP-endpoints сначала фиксируется в этом документе.
- Если изменение ломает текущий frontend, оно не может попадать в ту же версию API.
- Перед внедрением backend/frontend должны синхронно подтвердить DTO и коды ошибок.
