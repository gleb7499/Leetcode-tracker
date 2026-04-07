## Plan: FAB Add Task Happy Path

Добавляем новый flow добавления задачи через плавающую кнопку в правом нижнем углу и модальный overlay, не ломая текущую архитектуру frontend. Первая итерация покрывает только LeetCode happy-path, но внутренняя структура сразу делается source-driven (для будущих custom/codewars и API).

**Steps**
1. Phase 1 — Domain foundation (*блокирует последующие UI/flow шаги*):
1. Зафиксировать доменную модель источника задачи и сценария добавления: `source`, `resolvedTaskDraft`, `scheduleMode` (today/tomorrow), статусы шага flow.
2. Расширить контракт `addTask` в локальном data-layer так, чтобы он принимал дополнительные опции планирования даты показа (`nextReviewAt`) и метаданные источника без обязательных breaking-изменений.
3. Добавить адаптер-слой для резолва задачи по источнику (интерфейс + LeetCode-реализация), чтобы API-провайдер можно было подключить позже без переписывания UI.

2. Phase 2 — Entry UX (FAB + modal shell) (*зависит от Phase 1*):
1. Добавить плавающую кнопку Add task в правый нижний угол в основном приложении (только home-экран), по стилю и easing синхронизированную с текущими floating-контролами.
2. Реализовать hover-поведение кнопки: плавное увеличение и появление подписи “Add task”.
3. Реализовать раскрытие кнопки в modal overlay: fade backdrop, scroll lock, блокировка взаимодействия с фоном, закрытие по `X`, клику вне модалки и `Escape`.
4. Внедрить shell в `App` так, чтобы не конфликтовать с review-режимом и side-panel.

3. Phase 3 — Step flow architecture (*зависит от Phase 2; шаги 2 и 3 можно делать параллельно*):
1. Вынести сценарий в reducer/state-machine с явными состояниями: source-select → leetcode-url → loading → solved-check → optional-note → success.
2. Экран выбора способа добавить задачу сделать с двумя вариантами (LeetCode активен, Custom пока неактивен/coming soon), но с общей конфигурацией провайдеров для последующего масштабирования.
3. Подключить URL-валидацию LeetCode в UX-стиле login-формы: `onBlur` field-validation, `onSubmit` form-validation, одинаковый визуальный паттерн ошибок.

4. Phase 4 — Async resolve + loader (*зависит от Phase 3*):
1. После подтверждения URL запускать асинхронный resolve через LeetCode-адаптер (в текущей итерации local/mock async).
2. Добавить отдельный переиспользуемый loader из двух орбитальных кругов с прозрачностью и пересечением, где цвет задается через CSS custom properties (под будущие темы).
3. Подготовить точку расширения для будущего fallback-режима «ручной ввод при неуспешном резолве», но не включать его в текущий scope.

5. Phase 5 — Completion branch logic (*зависит от Phase 4*):
1. Ветка “Не решил сейчас”: сразу сохранять задачу и показывать success-состояние “добавлено в список на сегодня”.
2. Ветка “Решил”: попросить заметку, затем сохранять задачу с датой следующего показа на завтра и показывать поощряющее сообщение.
3. После успеха оставлять модалку управляемо открытой до явного закрытия пользователем, а при закрытии корректно сбрасывать flow.

6. Phase 6 — Stability + verification (*частично параллельно с Phase 4-5, финал после них*):
1. Проверить, что добавление задачи на сегодня корректно отражается в home-метриках; при необходимости синхронизировать daily-progress target с актуальным количеством задач на сегодня.
2. Добавить тесты для ключевого happy-path: state-machine переходы, URL-валидация LeetCode, планирование даты `nextReview` для solved/unsolved веток.
3. Прогнать typecheck/lint/tests и выполнить ручной UX smoke-test всех переходов и анимаций на desktop/mobile.

**Relevant files**
- c:/Users/kseni/Documents/Leetcode/Leetcode tracker/Leetcode-tracker/frontend/src/App.tsx — точка интеграции FAB и modal flow, условия видимости по состоянию `view`.
- c:/Users/kseni/Documents/Leetcode/Leetcode tracker/Leetcode-tracker/frontend/components/profile-menu.tsx — референс для floating-button стиля, easing и поведения.
- c:/Users/kseni/Documents/Leetcode/Leetcode tracker/Leetcode-tracker/frontend/components/confirm-dialog.tsx — референс portal/backdrop/scroll-lock/close semantics.
- c:/Users/kseni/Documents/Leetcode/Leetcode tracker/Leetcode-tracker/frontend/src/features/auth/LoginForm.tsx — источник визуального паттерна валидации ошибок.
- c:/Users/kseni/Documents/Leetcode/Leetcode tracker/Leetcode-tracker/frontend/src/shared/validation/schemas.ts — расширение URL-валидации под source-aware подход.
- c:/Users/kseni/Documents/Leetcode/Leetcode tracker/Leetcode-tracker/frontend/src/shared/hooks/useTasks.ts — расширение addTask-контракта и правила `nextReview`.
- c:/Users/kseni/Documents/Leetcode/Leetcode tracker/Leetcode-tracker/frontend/src/shared/types/index.ts — расширение типов задачи под источник/метаданные.
- c:/Users/kseni/Documents/Leetcode/Leetcode tracker/Leetcode-tracker/frontend/src/index.css — новые анимации loader/FAB/modal и токены цветов.
- c:/Users/kseni/Documents/Leetcode/Leetcode tracker/Leetcode-tracker/frontend/data/review-tasks.ts — временный источник metadata для локального happy-path resolve.
- c:/Users/kseni/Documents/Leetcode/Leetcode tracker/Leetcode-tracker/frontend/hooks/use-daily-progress.ts — возможная синхронизация daily target после add flow.

**Verification**
1. Запустить `npm run typecheck` в frontend.
2. Запустить `npm run lint` в frontend.
3. Запустить `npm run test` в frontend.
4. Ручной happy-path A (LeetCode + “не решил”): открыть FAB на home → URL valid → loader → “не решил” → success “сегодня” → закрытие по `X` и по backdrop.
5. Ручной happy-path B (LeetCode + “решил”): URL valid → loader → “решил” → note → success “завтра” → проверить, что задача не попала в `getTasksForToday` на текущую дату.
6. Проверить клавиатурную доступность: `Escape`, focus trap/return focus, `aria` для dialog.
7. Проверить адаптивность: desktop + mobile viewport, отсутствие конфликтов с top-right ProfileMenu и SidePanel.

**Decisions**
- Подтвержденный scope итерации: только LeetCode happy-path.
- FAB показывается только на home-экране.
- Логика расписания подтверждена: solved → завтра, unsolved → сегодня.
- Текущая интеграция: frontend + localStorage с архитектурным адаптером под будущий API.
- Явно вне scope текущей итерации: fallback ручного ввода после неудачного автопарсинга, полноценный custom/codewars flow, real backend calls.

**Further Considerations**
1. Для smooth-morph анимации кнопка→модалка можно начать с scale+fade на общих easing-токенах, а затем при необходимости перейти на FLIP-анимацию без изменения state-machine.
2. Для LeetCode URL, отсутствующих в локальном каталоге, рекомендован predictable fallback: title из slug + difficulty `Medium` по умолчанию (до подключения backend).
3. После добавления задачи можно опционально добавить CTA “Открыть Library”, но это лучше оставить вторым шагом после стабилизации основного flow.
