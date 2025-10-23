/**
 * Модуль валидации форм
 * Общие функции валидации для всего приложения
 */

const Validator = {
    /**
     * Проверяет корректность email
     * @param {string} email - Email для проверки
     * @returns {boolean}
     */
    isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },

    /**
     * Проверяет силу пароля
     * @param {string} password - Пароль для проверки
     * @returns {object} { isValid: boolean, strength: number, message: string }
     */
    validatePassword(password, minLength = 8) {
        const result = {
            isValid: false,
            strength: 0,
            message: ''
        };

        if (!password) {
            result.message = 'Пароль обязателен';
            return result;
        }

        if (password.length < minLength) {
            result.message = `Минимум ${minLength} символов`;
            return result;
        }

        // Проверка наличия букв и цифр
        const hasLetters = /[A-Za-z]/.test(password);
        const hasDigits = /\d/.test(password);

        if (!hasLetters || !hasDigits) {
            result.message = 'Пароль должен содержать буквы и цифры';
            return result;
        }

        result.isValid = true;
        result.strength = this.calculatePasswordStrength(password);
        return result;
    },

    /**
     * Вычисляет силу пароля (0-100)
     * @param {string} password - Пароль
     * @returns {number}
     */
    calculatePasswordStrength(password) {
        let strength = 0;

        if (password.length >= 8) strength += 20;
        if (password.length >= 12) strength += 10;
        if (password.length >= 16) strength += 10;

        if (/[a-z]/.test(password)) strength += 15;
        if (/[A-Z]/.test(password)) strength += 15;
        if (/[0-9]/.test(password)) strength += 15;
        if (/[@$!%*#?&.]/.test(password)) strength += 15;

        return strength;
    },

    /**
     * Валидирует поле формы
     * @param {HTMLInputElement} field - Поле для валидации
     * @param {object} config - Конфигурация валидации
     * @returns {object} { isValid: boolean, message: string }
     */
    validateField(field, config = {}) {
        const result = {
            isValid: true,
            message: ''
        };

        // Чекбоксы обрабатываем отдельно
        if (field.type === 'checkbox') {
            if (field.hasAttribute('required') && !field.checked) {
                result.isValid = false;
                result.message = config.requiredMessage || 'Необходимо принять условия';
            }
            return result;
        }

        const value = field.value.trim();

        // Проверка обязательности
        if (field.hasAttribute('required') && !value) {
            result.isValid = false;
            result.message = 'Это поле обязательно для заполнения';
            return result;
        }

        // Если поле пустое и не обязательное, пропускаем остальные проверки
        if (!value) {
            return result;
        }

        // Проверка email
        if (field.type === 'email') {
            if (!this.isValidEmail(value)) {
                result.isValid = false;
                result.message = 'Введите корректный email';
                return result;
            }
        }

        // Проверка пароля
        if (field.type === 'password' && config.validatePassword) {
            const passwordValidation = this.validatePassword(value, config.minLength || 8);
            if (!passwordValidation.isValid) {
                result.isValid = false;
                result.message = passwordValidation.message;
                return result;
            }
        }

        // Проверка минимальной длины
        if (field.minLength > 0 && value.length < field.minLength && field.type !== 'password') {
            result.isValid = false;
            result.message = `Минимум ${field.minLength} символов`;
            return result;
        }

        // Проверка максимальной длины
        if (field.maxLength > 0 && field.maxLength !== 524288 && value.length > field.maxLength) {
            result.isValid = false;
            result.message = `Максимум ${field.maxLength} символов`;
            return result;
        }

        // Проверка URL
        if (field.type === 'url' && value) {
            try {
                new URL(value);
            } catch {
                result.isValid = false;
                result.message = 'Введите корректный URL';
                return result;
            }
        }

        return result;
    },

    /**
     * Валидирует всю форму
     * @param {HTMLFormElement} form - Форма для валидации
     * @param {object} config - Конфигурация валидации
     * @returns {boolean}
     */
    validateForm(form, config = {}) {
        const inputs = form.querySelectorAll('input[required], select[required]');
        let isValid = true;

        inputs.forEach(input => {
            const validation = this.validateField(input, config);
            if (!validation.isValid) {
                this.showFieldError(input, validation.message);
                isValid = false;
            } else {
                this.clearFieldError(input);
            }
        });

        return isValid;
    },

    /**
     * Показывает ошибку поля
     * @param {HTMLInputElement} field - Поле
     * @param {string} message - Сообщение об ошибке
     */
    showFieldError(field, message) {
        field.classList.add('error');
        field.setAttribute('aria-invalid', 'true');

        const errorElement = document.getElementById(`${field.id}-error`);
        if (errorElement) {
            errorElement.textContent = message;
        }
    },

    /**
     * Очищает ошибку поля
     * @param {HTMLInputElement} field - Поле
     */
    clearFieldError(field) {
        field.classList.remove('error');
        field.setAttribute('aria-invalid', 'false');

        const errorElement = document.getElementById(`${field.id}-error`);
        if (errorElement) {
            errorElement.textContent = '';
        }
    },

    /**
     * Очищает все ошибки формы
     * @param {HTMLFormElement} form - Форма
     */
    clearFormErrors(form) {
        const inputs = form.querySelectorAll('.error');
        inputs.forEach(input => this.clearFieldError(input));

        const errors = form.querySelectorAll('.form-error');
        errors.forEach(error => {
            error.textContent = '';
        });
    }
};

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Validator;
}
