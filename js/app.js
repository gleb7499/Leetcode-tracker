/**
 * LeetCode Tracker - Главный файл приложения (рефакторенная версия)
 * Использует общие утилиты для упрощения кода
 */

/* ============================================
   КОНСТАНТЫ И КОНФИГУРАЦИЯ
   ============================================ */

const CONFIG = {
    STORAGE_KEY: 'leetcode-tracker-tasks',
    STORAGE_KEY_SESSION: 'leetcode-tracker-session',
    STORAGE_KEY_CURRENT_USER: 'leetcode-tracker-current-user',
    SUCCESS_MESSAGE_DURATION: 3000,
    REVIEW_FEEDBACK_DURATION: 2000
};

/* ============================================
   СОСТОЯНИЕ ПРИЛОЖЕНИЯ
   ============================================ */

const AppState = {
    currentScreen: 'home',
    tasks: [],
    currentReviewTask: null,
    reviewQueue: []
};

/* ============================================
   ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 LeetCode Tracker запущен');
    
    // Проверяем авторизацию
    if (!checkAuth()) {
        return;
    }
    
    // Загружаем задачи
    AppState.tasks = StorageManager.get(CONFIG.STORAGE_KEY, initDemoData());
    console.log(`✅ Загружено задач: ${AppState.tasks.length}`);
    
    // Инициализируем обработчики
    initEventListeners();
    
    // Отображаем начальный экран
    renderHomeScreen();
    
    // Проверяем доступность
    UIManager.checkAccessibility();
});

/* ============================================
   ПРОВЕРКА АВТОРИЗАЦИИ
   ============================================ */

function checkAuth() {
    const session = StorageManager.get(CONFIG.STORAGE_KEY_SESSION);
    const currentUser = StorageManager.get(CONFIG.STORAGE_KEY_CURRENT_USER);
    
    if (!session || !currentUser) {
        console.log('❌ Пользователь не авторизован');
        redirectToLogin();
        return false;
    }
    
    const now = Date.now();
    
    if (session.expiresAt <= now) {
        console.log('⏱️ Сессия истекла');
        clearAuth();
        redirectToLogin();
        return false;
    }
    
    displayUserGreeting(currentUser);
    
    console.log('✅ Пользователь авторизован:', currentUser.email);
    return true;
}

function displayUserGreeting(user) {
    const greeting = document.getElementById('user-greeting');
    if (greeting) {
        greeting.textContent = `Привет, ${user.name}!`;
    }
}

function redirectToLogin() {
    window.location.href = 'login.html';
}

function clearAuth() {
    StorageManager.remove(CONFIG.STORAGE_KEY_SESSION);
    StorageManager.remove(CONFIG.STORAGE_KEY_CURRENT_USER);
}

function logout() {
    const confirmed = confirm('Вы уверены, что хотите выйти?');
    
    if (confirmed) {
        clearAuth();
        console.log('👋 Пользователь вышел из системы');
        redirectToLogin();
    }
}

/* ============================================
   ДЕМО-ДАННЫЕ
   ============================================ */

function initDemoData() {
    return [
        {
            id: Helpers.generateId('task'),
            name: 'Two Sum',
            url: 'https://leetcode.com/problems/two-sum/',
            difficulty: 'Easy',
            topics: ['Array', 'Hash Table'],
            notes: 'Классическая задача на HashMap. Проход за O(n).',
            createdAt: new Date().toISOString(),
            nextReview: new Date().toISOString(),
            reviews: []
        },
        {
            id: Helpers.generateId('task'),
            name: 'Add Two Numbers',
            url: 'https://leetcode.com/problems/add-two-numbers/',
            difficulty: 'Medium',
            topics: ['Linked List', 'Math', 'Recursion'],
            notes: 'Сложение чисел в обратном порядке через списки.',
            createdAt: new Date().toISOString(),
            nextReview: new Date().toISOString(),
            reviews: []
        },
        {
            id: Helpers.generateId('task'),
            name: 'Median of Two Sorted Arrays',
            url: 'https://leetcode.com/problems/median-of-two-sorted-arrays/',
            difficulty: 'Hard',
            topics: ['Array', 'Binary Search', 'Divide and Conquer'],
            notes: 'Бинарный поиск по меньшему массиву. Сложная задача!',
            createdAt: new Date().toISOString(),
            nextReview: new Date().toISOString(),
            reviews: []
        }
    ];
}

/* ============================================
   ИНИЦИАЛИЗАЦИЯ ОБРАБОТЧИКОВ
   ============================================ */

function initEventListeners() {
    initNavigationListeners();
    initFormListeners();
    initHomeScreenListeners();
    initReviewScreenListeners();
    initKeyboardNavigation();
}

function initNavigationListeners() {
    const navButtons = document.querySelectorAll('[data-screen]');
    
    navButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const screenName = e.currentTarget.getAttribute('data-screen');
            navigateToScreen(screenName);
        });
    });
    
    // Кнопка выхода
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

function navigateToScreen(screenName) {
    // Скрываем все экраны
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.remove('active'));
    
    // Показываем нужный экран
    const targetScreen = document.getElementById(`${screenName}-screen`);
    if (targetScreen) {
        targetScreen.classList.add('active');
        AppState.currentScreen = screenName;
        
        updateActiveNavButton(screenName);
        renderScreen(screenName);
        
        // Фокус на заголовок
        const heading = targetScreen.querySelector('h2');
        if (heading) {
            heading.focus();
            heading.setAttribute('tabindex', '-1');
        }
    }
}

function updateActiveNavButton(screenName) {
    const navButtons = document.querySelectorAll('.nav-button');
    navButtons.forEach(button => {
        button.classList.remove('active');
        button.removeAttribute('aria-current');
    });
    
    const activeButton = document.querySelector(`.nav-button[data-screen="${screenName}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
        activeButton.setAttribute('aria-current', 'page');
    }
}

function renderScreen(screenName) {
    switch (screenName) {
        case 'home':
            renderHomeScreen();
            break;
        case 'add':
            resetAddTaskForm();
            break;
    }
}

/* ============================================
   ГЛАВНЫЙ ЭКРАН
   ============================================ */

function initHomeScreenListeners() {
    const repeatAllBtn = document.getElementById('repeat-all-btn');
    if (repeatAllBtn) {
        repeatAllBtn.addEventListener('click', startRepeatAll);
    }
}

function renderHomeScreen() {
    const tasksList = document.getElementById('tasks-list');
    const tasksCount = document.getElementById('tasks-count');
    const emptyState = document.getElementById('empty-state');
    
    const todayTasks = getTasksForToday();
    
    if (tasksCount) {
        tasksCount.textContent = todayTasks.length;
    }
    
    if (todayTasks.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        tasksList.querySelectorAll('.task-card').forEach(card => card.remove());
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    tasksList.querySelectorAll('.task-card').forEach(card => card.remove());
    
    todayTasks.forEach(task => {
        const card = createTaskCard(task);
        tasksList.appendChild(card);
    });
}

function getTasksForToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return AppState.tasks.filter(task => {
        const nextReview = new Date(task.nextReview);
        nextReview.setHours(0, 0, 0, 0);
        return nextReview <= today;
    });
}

function createTaskCard(task) {
    const article = document.createElement('article');
    article.className = 'task-card';
    article.setAttribute('role', 'article');
    article.setAttribute('aria-label', `Задача: ${task.name}`);
    
    const difficultyClass = task.difficulty.toLowerCase();
    const topicsHTML = task.topics.map(topic => 
        `<span class="task-topic">${Helpers.escapeHtml(topic)}</span>`
    ).join('');
    
    article.innerHTML = `
        <header class="task-card-header">
            <h3 class="task-card-title">
                <a href="${Helpers.escapeHtml(task.url)}" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   aria-label="Открыть задачу ${Helpers.escapeHtml(task.name)} на LeetCode">
                    ${Helpers.escapeHtml(task.name)}
                </a>
            </h3>
            <span class="task-difficulty ${difficultyClass}" 
                  aria-label="Сложность: ${task.difficulty}">
                ${task.difficulty}
            </span>
        </header>
        
        ${task.topics.length > 0 ? `
            <div class="task-topics" role="list" aria-label="Темы задачи">
                ${topicsHTML}
            </div>
        ` : ''}
        
        ${task.notes ? `
            <p class="task-notes">${Helpers.escapeHtml(task.notes)}</p>
        ` : ''}
        
        <div class="task-card-actions">
            <button type="button" 
                    class="btn btn-primary btn-small" 
                    data-task-id="${task.id}"
                    data-action="review"
                    aria-label="Решить задачу ${Helpers.escapeHtml(task.name)}">
                Решить
            </button>
            <button type="button" 
                    class="btn btn-secondary btn-small" 
                    data-task-id="${task.id}"
                    data-action="delete"
                    aria-label="Удалить задачу ${Helpers.escapeHtml(task.name)}">
                Удалить
            </button>
        </div>
    `;
    
    const reviewBtn = article.querySelector('[data-action="review"]');
    const deleteBtn = article.querySelector('[data-action="delete"]');
    
    if (reviewBtn) reviewBtn.addEventListener('click', () => startReview(task.id));
    if (deleteBtn) deleteBtn.addEventListener('click', () => deleteTask(task.id));
    
    return article;
}

function startRepeatAll() {
    const todayTasks = getTasksForToday();
    
    if (todayTasks.length === 0) {
        alert('Нет задач для повторения');
        return;
    }
    
    AppState.reviewQueue = [...todayTasks];
    startNextReview();
}

function startNextReview() {
    if (AppState.reviewQueue.length === 0) {
        navigateToScreen('home');
        UIManager.showNotification('✅ Все задачи повторены!', 'success');
        return;
    }
    
    const task = AppState.reviewQueue.shift();
    startReview(task.id);
}

function startReview(taskId) {
    const task = AppState.tasks.find(t => t.id === taskId);
    
    if (!task) {
        console.error('Задача не найдена:', taskId);
        return;
    }
    
    AppState.currentReviewTask = task;
    navigateToScreen('review');
    renderReviewScreen(task);
}

function deleteTask(taskId) {
    const task = AppState.tasks.find(t => t.id === taskId);
    
    if (!task) return;
    
    const confirmed = confirm(`Вы уверены, что хотите удалить задачу "${task.name}"?`);
    
    if (confirmed) {
        AppState.tasks = AppState.tasks.filter(t => t.id !== taskId);
        StorageManager.set(CONFIG.STORAGE_KEY, AppState.tasks);
        renderHomeScreen();
        UIManager.showNotification('Задача удалена', 'success');
    }
}

/* ============================================
   ФОРМА ДОБАВЛЕНИЯ ЗАДАЧИ
   ============================================ */

function initFormListeners() {
    const form = document.getElementById('add-task-form');
    if (!form) return;
    
    form.addEventListener('submit', handleFormSubmit);
    
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', () => {
            const validation = Validator.validateField(input);
            if (!validation.isValid) {
                Validator.showFieldError(input, validation.message);
            } else {
                Validator.clearFieldError(input);
            }
        });
        
        input.addEventListener('input', () => {
            if (input.classList.contains('error')) {
                const validation = Validator.validateField(input);
                if (validation.isValid) {
                    Validator.clearFieldError(input);
                }
            }
        });
    });
    
    const cancelBtn = document.getElementById('cancel-task-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            resetAddTaskForm();
            navigateToScreen('home');
        });
    }
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    
    if (!Validator.validateForm(form)) {
        console.log('❌ Форма содержит ошибки');
        return;
    }
    
    const formData = new FormData(form);
    const task = {
        id: Helpers.generateId('task'),
        name: formData.get('name').trim(),
        url: formData.get('url').trim(),
        difficulty: formData.get('difficulty'),
        topics: Helpers.parseStringToArray(formData.get('topics')),
        notes: formData.get('notes').trim(),
        createdAt: new Date().toISOString(),
        nextReview: new Date().toISOString(),
        reviews: []
    };
    
    AppState.tasks.push(task);
    StorageManager.set(CONFIG.STORAGE_KEY, AppState.tasks);
    
    showFormSuccess('✅ Задача успешно добавлена!');
    
    setTimeout(() => {
        resetAddTaskForm();
        navigateToScreen('home');
    }, 1500);
    
    console.log('✅ Задача добавлена:', task);
}

function showFormSuccess(message) {
    const successElement = document.getElementById('form-success');
    if (successElement) {
        successElement.textContent = message;
        successElement.classList.add('show');
        
        setTimeout(() => {
            successElement.classList.remove('show');
        }, CONFIG.SUCCESS_MESSAGE_DURATION);
    }
}

function resetAddTaskForm() {
    const form = document.getElementById('add-task-form');
    if (form) {
        form.reset();
        Validator.clearFormErrors(form);
    }
}

/* ============================================
   ЭКРАН ПОВТОРЕНИЯ
   ============================================ */

function initReviewScreenListeners() {
    const reviewButtons = document.querySelectorAll('.btn-review');
    
    reviewButtons.forEach(button => {
        button.addEventListener('click', handleReviewStatus);
    });
}

function renderReviewScreen(task) {
    const reviewCard = document.getElementById('review-card');
    const reviewActions = document.getElementById('review-actions');
    
    if (!reviewCard || !reviewActions) return;
    
    const difficultyClass = task.difficulty.toLowerCase();
    const topicsHTML = task.topics.map(topic => 
        `<span class="task-topic">${Helpers.escapeHtml(topic)}</span>`
    ).join('');
    
    reviewCard.innerHTML = `
        <header class="review-card-header">
            <h3 class="review-card-title">${Helpers.escapeHtml(task.name)}</h3>
            <div class="review-card-meta">
                <span class="task-difficulty ${difficultyClass}">
                    ${task.difficulty}
                </span>
                <a href="${Helpers.escapeHtml(task.url)}" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   class="btn btn-secondary btn-small"
                   aria-label="Открыть задачу на LeetCode">
                    Открыть на LeetCode →
                </a>
            </div>
        </header>
        
        <div class="review-card-body">
            ${task.topics.length > 0 ? `
                <section class="review-section">
                    <h4 class="review-section-title">Темы</h4>
                    <div class="task-topics" role="list">
                        ${topicsHTML}
                    </div>
                </section>
            ` : ''}
            
            ${task.notes ? `
                <section class="review-section">
                    <h4 class="review-section-title">Мои заметки</h4>
                    <div class="review-section-content">
                        ${Helpers.escapeHtml(task.notes)}
                    </div>
                </section>
            ` : ''}
            
            ${task.reviews.length > 0 ? `
                <section class="review-section">
                    <h4 class="review-section-title">История повторений</h4>
                    <div class="review-section-content">
                        Повторений: ${task.reviews.length}
                    </div>
                </section>
            ` : ''}
        </div>
    `;
    
    reviewActions.style.display = 'block';
    
    const feedback = document.getElementById('review-feedback');
    if (feedback) {
        feedback.classList.remove('show');
        feedback.textContent = '';
    }
}

function handleReviewStatus(e) {
    const button = e.currentTarget;
    const status = button.getAttribute('data-status');
    
    if (!AppState.currentReviewTask) return;
    
    const review = {
        date: new Date().toISOString(),
        status: status
    };
    
    AppState.currentReviewTask.reviews.push(review);
    AppState.currentReviewTask.nextReview = calculateNextReview(status);
    
    StorageManager.set(CONFIG.STORAGE_KEY, AppState.tasks);
    
    showReviewFeedback(status);
    
    setTimeout(() => {
        if (AppState.reviewQueue.length > 0) {
            startNextReview();
        } else {
            navigateToScreen('home');
            UIManager.showNotification('✅ Повторение записано!', 'success');
        }
    }, CONFIG.REVIEW_FEEDBACK_DURATION);
}

function showReviewFeedback(status) {
    const feedback = document.getElementById('review-feedback');
    if (!feedback) return;
    
    const messages = {
        'forgot': '❌ Не помню — повторим завтра',
        'partial': '⚠️ Частично помню — повторим через 3 дня',
        'remember': '✅ Помню хорошо — повторим через неделю'
    };
    
    feedback.textContent = messages[status] || 'Повторение записано';
    feedback.classList.add('show', 'success');
}

function calculateNextReview(status) {
    const now = new Date();
    
    const intervals = {
        'forgot': 1,
        'partial': 3,
        'remember': 7
    };
    
    const days = intervals[status] || 1;
    now.setDate(now.getDate() + days);
    
    return now.toISOString();
}

/* ============================================
   КЛАВИАТУРНАЯ НАВИГАЦИЯ
   ============================================ */

function initKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (AppState.currentScreen !== 'home') {
                navigateToScreen('home');
            }
        }
        
        if (e.altKey) {
            switch (e.key) {
                case '1':
                    e.preventDefault();
                    navigateToScreen('home');
                    break;
                case '2':
                    e.preventDefault();
                    navigateToScreen('add');
                    break;
                case '3':
                    e.preventDefault();
                    navigateToScreen('stats');
                    break;
                case '4':
                    e.preventDefault();
                    navigateToScreen('settings');
                    break;
            }
        }
    });
}
