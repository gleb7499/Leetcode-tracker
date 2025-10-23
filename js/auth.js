/**
 * LeetCode Tracker - Модуль авторизации (рефакторенная версия)
 * Использует общие утилиты для упрощения кода
 */

/* ============================================
   КОНСТАНТЫ
   ============================================ */

const AUTH_CONFIG = {
    STORAGE_KEY_USERS: 'leetcode-tracker-users',
    STORAGE_KEY_CURRENT_USER: 'leetcode-tracker-current-user',
    STORAGE_KEY_SESSION: 'leetcode-tracker-session',
    SESSION_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 дней
    MESSAGE_DURATION: 5000,
    PASSWORD_MIN_LENGTH: 8
};

/* ============================================
   СОСТОЯНИЕ
   ============================================ */

const AuthState = {
    currentTab: 'login',
    users: [],
    isProcessing: false
};

/* ============================================
   ИНИЦИАЛИЗАЦИЯ
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    console.log('🔐 Модуль авторизации запущен');
    
    // Загружаем пользователей
    AuthState.users = StorageManager.get(AUTH_CONFIG.STORAGE_KEY_USERS, []);
    console.log(`✅ Загружено пользователей: ${AuthState.users.length}`);
    
    // Проверяем активную сессию
    checkActiveSession();
    
    // Инициализируем обработчики
    initAuthListeners();
    
    // Проверяем доступность
    UIManager.checkAccessibility();
});

/* ============================================
   УПРАВЛЕНИЕ СЕССИЕЙ
   ============================================ */

function checkActiveSession() {
    const session = StorageManager.get(AUTH_CONFIG.STORAGE_KEY_SESSION);
    
    if (!session) return;
    
    const now = Date.now();
    
    // Проверяем срок действия сессии
    if (session.expiresAt > now) {
        console.log('✅ Активная сессия найдена');
        redirectToApp();
    } else {
        // Сессия истекла
        clearSession();
        console.log('⏱️ Сессия истекла');
    }
}

function createSession(user, remember = false) {
    const expiresAt = remember 
        ? Date.now() + AUTH_CONFIG.SESSION_DURATION 
        : Date.now() + 24 * 60 * 60 * 1000; // 24 часа
    
    const session = {
        userId: user.id,
        email: user.email,
        name: user.name,
        createdAt: Date.now(),
        expiresAt: expiresAt
    };
    
    StorageManager.set(AUTH_CONFIG.STORAGE_KEY_SESSION, session);
    StorageManager.set(AUTH_CONFIG.STORAGE_KEY_CURRENT_USER, {
        id: user.id,
        email: user.email,
        name: user.name
    });
    
    console.log('✅ Сессия создана');
}

function clearSession() {
    StorageManager.remove(AUTH_CONFIG.STORAGE_KEY_SESSION);
    StorageManager.remove(AUTH_CONFIG.STORAGE_KEY_CURRENT_USER);
}

function redirectToApp() {
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

/* ============================================
   ИНИЦИАЛИЗАЦИЯ ОБРАБОТЧИКОВ
   ============================================ */

function initAuthListeners() {
    initTabListeners();
    initLoginForm();
    initRegisterForm();
    initForgotPasswordModal();
    initPasswordToggles();
    initPasswordStrength();
}

function initTabListeners() {
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const loginPanel = document.getElementById('login-panel');
    const registerPanel = document.getElementById('register-panel');
    
    if (loginTab && registerTab && loginPanel && registerPanel) {
        loginTab.addEventListener('click', () => {
            switchTab('login', loginTab, loginPanel, registerTab, registerPanel);
        });
        
        registerTab.addEventListener('click', () => {
            switchTab('register', registerTab, registerPanel, loginTab, loginPanel);
        });
    }
}

function switchTab(tabName, activeTab, activePanel, inactiveTab, inactivePanel) {
    AuthState.currentTab = tabName;
    
    activeTab.classList.add('active');
    activeTab.setAttribute('aria-selected', 'true');
    inactiveTab.classList.remove('active');
    inactiveTab.setAttribute('aria-selected', 'false');
    
    activePanel.classList.add('active');
    activePanel.removeAttribute('hidden');
    inactivePanel.classList.remove('active');
    inactivePanel.setAttribute('hidden', '');
    
    UIManager.clearAllMessages();
}

/* ============================================
   ФОРМА ВХОДА
   ============================================ */

function initLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;
    
    form.addEventListener('submit', handleLogin);
    
    // Валидация в реальном времени
    const inputs = form.querySelectorAll('input[required]');
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
}

async function handleLogin(e) {
    e.preventDefault();
    
    if (AuthState.isProcessing) return;
    
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    
    // Валидация
    if (!Validator.validateForm(form)) {
        UIManager.showMessage('login-message', 'Пожалуйста, исправьте ошибки в форме', 'error');
        return;
    }
    
    // Получаем данные
    const formData = new FormData(form);
    const email = formData.get('email')?.trim().toLowerCase() || '';
    const password = formData.get('password') || '';
    const remember = formData.get('remember') === 'on';
    
    if (!email || !password) {
        UIManager.showMessage('login-message', 'Заполните все обязательные поля', 'error');
        return;
    }
    
    // Начинаем обработку
    AuthState.isProcessing = true;
    UIManager.setButtonLoading(submitButton, true);
    
    // Имитация задержки сети
    await Helpers.delay(800);
    
    // Ищем пользователя
    const user = AuthState.users.find(u => u.email === email);
    
    if (!user) {
        UIManager.showMessage('login-message', 'Пользователь с таким email не найден', 'error');
        AuthState.isProcessing = false;
        UIManager.setButtonLoading(submitButton, false);
        return;
    }
    
    // Проверяем пароль
    const isPasswordValid = await CryptoHelper.verifyPassword(password, user.passwordHash);
    
    if (!isPasswordValid) {
        UIManager.showMessage('login-message', 'Неверный пароль', 'error');
        AuthState.isProcessing = false;
        UIManager.setButtonLoading(submitButton, false);
        return;
    }
    
    // Успешный вход
    console.log('✅ Вход выполнен:', user.email);
    UIManager.showMessage('login-message', `Добро пожаловать, ${user.name}! Перенаправление...`, 'success');
    
    createSession(user, remember);
    redirectToApp();
}

/* ============================================
   ФОРМА РЕГИСТРАЦИИ
   ============================================ */

function initRegisterForm() {
    const form = document.getElementById('register-form');
    if (!form) return;
    
    form.addEventListener('submit', handleRegister);
    
    // Валидация в реальном времени
    const inputs = form.querySelectorAll('input[required]');
    inputs.forEach(input => {
        input.addEventListener('blur', () => {
            const config = input.type === 'password' && input.id.includes('register') 
                ? { validatePassword: true, minLength: AUTH_CONFIG.PASSWORD_MIN_LENGTH }
                : {};
            
            const validation = Validator.validateField(input, config);
            if (!validation.isValid) {
                Validator.showFieldError(input, validation.message);
            } else {
                Validator.clearFieldError(input);
            }
        });
        
        input.addEventListener('input', () => {
            if (input.classList.contains('error')) {
                const config = input.type === 'password' && input.id.includes('register')
                    ? { validatePassword: true, minLength: AUTH_CONFIG.PASSWORD_MIN_LENGTH }
                    : {};
                    
                const validation = Validator.validateField(input, config);
                if (validation.isValid) {
                    Validator.clearFieldError(input);
                }
            }
        });
    });
    
    // Проверка совпадения паролей
    const password = document.getElementById('register-password');
    const passwordConfirm = document.getElementById('register-password-confirm');
    
    if (password && passwordConfirm) {
        passwordConfirm.addEventListener('input', () => {
            validatePasswordMatch(password, passwordConfirm);
        });
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    if (AuthState.isProcessing) return;
    
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    
    // Валидация
    const config = { validatePassword: true, minLength: AUTH_CONFIG.PASSWORD_MIN_LENGTH };
    if (!Validator.validateForm(form, config)) {
        UIManager.showMessage('register-message', 'Пожалуйста, исправьте ошибки в форме', 'error');
        return;
    }
    
    // Получаем данные
    const formData = new FormData(form);
    const name = formData.get('name')?.trim() || '';
    const email = formData.get('email')?.trim().toLowerCase() || '';
    const password = formData.get('password') || '';
    const passwordConfirm = formData.get('passwordConfirm') || '';
    const acceptedTerms = formData.get('terms') === 'on';
    
    // Дополнительные проверки
    if (!name || !email || !password || !passwordConfirm) {
        UIManager.showMessage('register-message', 'Заполните все обязательные поля', 'error');
        return;
    }
    
    if (password !== passwordConfirm) {
        UIManager.showMessage('register-message', 'Пароли не совпадают', 'error');
        Validator.showFieldError(document.getElementById('register-password-confirm'), 'Пароли не совпадают');
        return;
    }
    
    const passwordValidation = Validator.validatePassword(password, AUTH_CONFIG.PASSWORD_MIN_LENGTH);
    if (!passwordValidation.isValid) {
        UIManager.showMessage('register-message', passwordValidation.message, 'error');
        return;
    }
    
    if (!acceptedTerms) {
        UIManager.showMessage('register-message', 'Необходимо принять условия использования', 'error');
        Validator.showFieldError(document.getElementById('accept-terms'), 'Необходимо принять условия');
        return;
    }
    
    // Проверяем, существует ли пользователь
    if (AuthState.users.find(u => u.email === email)) {
        UIManager.showMessage('register-message', 'Пользователь с таким email уже зарегистрирован', 'error');
        Validator.showFieldError(document.getElementById('register-email'), 'Пользователь с таким email уже существует');
        return;
    }
    
    // Начинаем обработку
    AuthState.isProcessing = true;
    UIManager.setButtonLoading(submitButton, true);
    
    await Helpers.delay(1000);
    
    // Хешируем пароль и создаем пользователя
    const passwordHash = await CryptoHelper.hashPassword(password);
    
    const user = {
        id: Helpers.generateId('user'),
        name: name,
        email: email,
        passwordHash: passwordHash,
        createdAt: new Date().toISOString(),
        lastLogin: null
    };
    
    // Сохраняем
    AuthState.users.push(user);
    StorageManager.set(AUTH_CONFIG.STORAGE_KEY_USERS, AuthState.users);
    
    console.log('✅ Пользователь зарегистрирован:', user.email);
    UIManager.showMessage('register-message', 'Регистрация успешна! Перенаправление...', 'success');
    
    createSession(user, true);
    redirectToApp();
}

function validatePasswordMatch(password, passwordConfirm) {
    if (password.value && passwordConfirm.value) {
        if (password.value !== passwordConfirm.value) {
            Validator.showFieldError(passwordConfirm, 'Пароли не совпадают');
            return false;
        } else {
            Validator.clearFieldError(passwordConfirm);
            return true;
        }
    }
    
    if (!passwordConfirm.value) {
        Validator.clearFieldError(passwordConfirm);
    }
    
    return true;
}

/* ============================================
   ПОКАЗАТЬ/СКРЫТЬ ПАРОЛЬ
   ============================================ */

function initPasswordToggles() {
    const toggleButtons = document.querySelectorAll('.toggle-password');
    
    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');
            const input = document.getElementById(targetId);
            
            if (input) {
                UIManager.togglePasswordVisibility(input, button);
            }
        });
    });
}

/* ============================================
   ИНДИКАТОР СИЛЫ ПАРОЛЯ
   ============================================ */

function initPasswordStrength() {
    const passwordInput = document.getElementById('register-password');
    const strengthFill = document.getElementById('strength-fill');
    const strengthText = document.getElementById('strength-text');
    
    if (!passwordInput || !strengthFill || !strengthText) return;
    
    passwordInput.addEventListener('input', () => {
        const password = passwordInput.value;
        const strength = password.length === 0 ? 0 : Validator.calculatePasswordStrength(password);
        UIManager.updatePasswordStrength(strength, strengthFill, strengthText);
    });
}

/* ============================================
   ВОССТАНОВЛЕНИЕ ПАРОЛЯ
   ============================================ */

function initForgotPasswordModal() {
    const link = document.getElementById('forgot-password-link');
    const modal = document.getElementById('forgot-password-modal');
    const closeButton = modal?.querySelector('.modal-close');
    const cancelButton = modal?.querySelector('.modal-cancel');
    const overlay = modal?.querySelector('.modal-overlay');
    const form = document.getElementById('forgot-password-form');
    
    if (!link || !modal) return;
    
    link.addEventListener('click', (e) => {
        e.preventDefault();
        UIManager.openModal(modal);
    });
    
    closeButton?.addEventListener('click', () => UIManager.closeModal(modal));
    cancelButton?.addEventListener('click', () => UIManager.closeModal(modal));
    overlay?.addEventListener('click', () => UIManager.closeModal(modal));
    
    if (form) {
        form.addEventListener('submit', handleForgotPassword);
    }
}

async function handleForgotPassword(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const emailField = form.querySelector('#forgot-email');
    const email = emailField?.value.trim().toLowerCase() || '';
    
    if (!email) {
        UIManager.showMessage('forgot-message', 'Введите email адрес', 'error', 0);
        Validator.showFieldError(emailField, 'Email обязателен');
        return;
    }
    
    if (!Validator.isValidEmail(email)) {
        UIManager.showMessage('forgot-message', 'Введите корректный email', 'error', 0);
        Validator.showFieldError(emailField, 'Некорректный email');
        return;
    }
    
    Validator.clearFieldError(emailField);
    
    UIManager.setButtonLoading(submitButton, true);
    await Helpers.delay(1500);
    
    UIManager.showMessage('forgot-message', 
        'Если аккаунт с таким email существует, вы получите письмо с инструкциями', 
        'success', 0);
    
    UIManager.setButtonLoading(submitButton, false);
    
    console.log('📧 Запрос на восстановление пароля:', email);
}
