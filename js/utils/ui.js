/**
 * Модуль UI утилит
 * Общие функции для работы с интерфейсом
 */

const UIManager = {
    /**
     * Показывает сообщение
     * @param {string} elementId - ID элемента для сообщения
     * @param {string} text - Текст сообщения
     * @param {string} type - Тип (success, error, info, warning)
     * @param {number} duration - Длительность показа в мс
     */
    showMessage(elementId, text, type = 'info', duration = 5000) {
        const element = document.getElementById(elementId);
        
        if (!element) {
            console.warn(`Элемент ${elementId} не найден`);
            return;
        }
        
        element.textContent = text;
        element.className = `auth-message ${type} show`;
        
        // Автоскрытие
        if (duration > 0) {
            setTimeout(() => {
                element.classList.remove('show');
            }, duration);
        }
    },

    /**
     * Скрывает сообщение
     * @param {string} elementId - ID элемента
     */
    hideMessage(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove('show');
        }
    },

    /**
     * Очищает все сообщения
     */
    clearAllMessages() {
        const messages = document.querySelectorAll('.auth-message, .form-success');
        messages.forEach(message => {
            message.classList.remove('show');
            message.textContent = '';
        });
    },

    /**
     * Показывает/скрывает элемент
     * @param {string|HTMLElement} element - Элемент или селектор
     * @param {boolean} show - Показать или скрыть
     */
    toggleElement(element, show) {
        const el = typeof element === 'string' 
            ? document.querySelector(element) 
            : element;

        if (!el) return;

        if (show) {
            el.style.display = '';
            el.removeAttribute('hidden');
        } else {
            el.style.display = 'none';
            el.setAttribute('hidden', '');
        }
    },

    /**
     * Добавляет класс загрузки к кнопке
     * @param {HTMLButtonElement} button - Кнопка
     * @param {boolean} loading - Состояние загрузки
     */
    setButtonLoading(button, loading) {
        if (!button) return;

        if (loading) {
            button.classList.add('loading');
            button.disabled = true;
            button.setAttribute('aria-busy', 'true');
        } else {
            button.classList.remove('loading');
            button.disabled = false;
            button.setAttribute('aria-busy', 'false');
        }
    },

    /**
     * Открывает модальное окно
     * @param {HTMLElement|string} modal - Модальное окно или селектор
     */
    openModal(modal) {
        const el = typeof modal === 'string' 
            ? document.getElementById(modal) 
            : modal;

        if (!el) return;

        el.removeAttribute('hidden');
        document.body.style.overflow = 'hidden';

        // Фокус на первом поле ввода
        const firstInput = el.querySelector('input, button');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }

        // Добавляем обработчик ESC
        this._modalEscHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeModal(el);
            }
        };
        document.addEventListener('keydown', this._modalEscHandler);
    },

    /**
     * Закрывает модальное окно
     * @param {HTMLElement|string} modal - Модальное окно или селектор
     */
    closeModal(modal) {
        const el = typeof modal === 'string' 
            ? document.getElementById(modal) 
            : modal;

        if (!el) return;

        el.setAttribute('hidden', '');
        document.body.style.overflow = '';

        // Очищаем форму внутри модального окна
        const form = el.querySelector('form');
        if (form) {
            form.reset();
            if (typeof Validator !== 'undefined') {
                Validator.clearFormErrors(form);
            }
        }

        // Очищаем сообщения
        const message = el.querySelector('.auth-message');
        if (message) {
            message.classList.remove('show');
        }

        // Удаляем обработчик ESC
        if (this._modalEscHandler) {
            document.removeEventListener('keydown', this._modalEscHandler);
            this._modalEscHandler = null;
        }
    },

    /**
     * Создает уведомление (toast)
     * @param {string} message - Текст сообщения
     * @param {string} type - Тип (success, error, info, warning)
     * @param {number} duration - Длительность в мс
     */
    showNotification(message, type = 'info', duration = 3000) {
        // Создаем контейнер для уведомлений, если его нет
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;
            document.body.appendChild(container);
        }

        // Создаем уведомление
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            padding: 15px 20px;
            background: ${this._getToastColor(type)};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s ease-out;
            min-width: 250px;
        `;

        container.appendChild(toast);

        // Автоматическое удаление
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                container.removeChild(toast);
                if (container.children.length === 0) {
                    document.body.removeChild(container);
                }
            }, 300);
        }, duration);
    },

    /**
     * Получает цвет для toast уведомления
     * @private
     */
    _getToastColor(type) {
        const colors = {
            success: '#51cf66',
            error: '#ff6b6b',
            warning: '#ffd43b',
            info: '#74c0fc'
        };
        return colors[type] || colors.info;
    },

    /**
     * Показывает/скрывает пароль
     * @param {HTMLInputElement} input - Поле пароля
     * @param {HTMLElement} button - Кнопка переключения
     */
    togglePasswordVisibility(input, button) {
        if (!input || !button) return;

        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';

        const icon = button.querySelector('.toggle-icon');
        if (icon) {
            icon.textContent = isPassword ? '🙈' : '👁️';
        }

        button.setAttribute('aria-label', isPassword ? 'Скрыть пароль' : 'Показать пароль');
    },

    /**
     * Обновляет индикатор силы пароля
     * @param {number} strength - Сила пароля (0-100)
     * @param {HTMLElement} fillElement - Элемент заполнения
     * @param {HTMLElement} textElement - Элемент текста
     */
    updatePasswordStrength(strength, fillElement, textElement) {
        if (!fillElement || !textElement) return;

        fillElement.className = 'strength-fill';
        textElement.className = 'strength-text';

        if (strength === 0) {
            textElement.textContent = '';
            return;
        }

        if (strength < 40) {
            fillElement.classList.add('weak');
            textElement.classList.add('weak');
            textElement.textContent = 'Слабый пароль';
        } else if (strength < 70) {
            fillElement.classList.add('medium');
            textElement.classList.add('medium');
            textElement.textContent = 'Средний пароль';
        } else {
            fillElement.classList.add('strong');
            textElement.classList.add('strong');
            textElement.textContent = 'Сильный пароль';
        }
    },

    /**
     * Проверяет доступность (a11y)
     */
    checkAccessibility() {
        // Проверяем изображения без alt
        const images = document.querySelectorAll('img:not([alt])');
        if (images.length > 0) {
            console.warn('⚠️ Найдены изображения без alt:', images);
        }

        // Проверяем input без label
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            const id = input.id;
            if (id) {
                const label = document.querySelector(`label[for="${id}"]`);
                if (!label && input.type !== 'hidden') {
                    console.warn(`⚠️ Input без label: ${id}`);
                }
            }
        });

        console.log('♿ Проверка доступности завершена');
    }
};

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}
