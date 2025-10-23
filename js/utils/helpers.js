/**
 * Модуль вспомогательных функций
 * Общие утилиты для всего приложения
 */

const Helpers = {
    /**
     * Генерирует уникальный ID
     * @param {string} prefix - Префикс ID
     * @returns {string}
     */
    generateId(prefix = 'item') {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Экранирует HTML для безопасности
     * @param {string} text - Текст для экранирования
     * @returns {string}
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Задержка (Promise)
     * @param {number} ms - Миллисекунды
     * @returns {Promise}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Форматирует дату
     * @param {string|Date} date - Дата
     * @param {string} format - Формат (short, long, time)
     * @returns {string}
     */
    formatDate(date, format = 'short') {
        const d = new Date(date);
        
        const options = {
            short: { year: 'numeric', month: '2-digit', day: '2-digit' },
            long: { year: 'numeric', month: 'long', day: 'numeric' },
            time: { hour: '2-digit', minute: '2-digit' }
        };

        return d.toLocaleDateString('ru-RU', options[format] || options.short);
    },

    /**
     * Парсит строку с разделителями в массив
     * @param {string} str - Строка
     * @param {string} delimiter - Разделитель
     * @returns {Array}
     */
    parseStringToArray(str, delimiter = ',') {
        if (!str) return [];
        
        return str
            .split(delimiter)
            .map(item => item.trim())
            .filter(item => item.length > 0);
    },

    /**
     * Дебаунс функции
     * @param {Function} func - Функция
     * @param {number} wait - Время ожидания в мс
     * @returns {Function}
     */
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Троттлинг функции
     * @param {Function} func - Функция
     * @param {number} limit - Лимит времени в мс
     * @returns {Function}
     */
    throttle(func, limit = 300) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Копирует текст в буфер обмена
     * @param {string} text - Текст для копирования
     * @returns {Promise<boolean>}
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.error('Ошибка копирования:', error);
            return false;
        }
    },

    /**
     * Проверяет, является ли устройство мобильным
     * @returns {boolean}
     */
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },

    /**
     * Получает параметры URL
     * @returns {Object}
     */
    getUrlParams() {
        const params = {};
        const searchParams = new URLSearchParams(window.location.search);
        for (const [key, value] of searchParams) {
            params[key] = value;
        }
        return params;
    },

    /**
     * Скроллит к элементу плавно
     * @param {HTMLElement|string} element - Элемент или селектор
     * @param {object} options - Опции скролла
     */
    scrollToElement(element, options = {}) {
        const el = typeof element === 'string' 
            ? document.querySelector(element) 
            : element;

        if (!el) return;

        el.scrollIntoView({
            behavior: options.behavior || 'smooth',
            block: options.block || 'start',
            inline: options.inline || 'nearest'
        });
    },

    /**
     * Проверяет, виден ли элемент во viewport
     * @param {HTMLElement} element - Элемент
     * @returns {boolean}
     */
    isElementInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },

    /**
     * Создает элемент из HTML строки
     * @param {string} html - HTML строка
     * @returns {HTMLElement}
     */
    createElementFromHTML(html) {
        const template = document.createElement('template');
        template.innerHTML = html.trim();
        return template.content.firstChild;
    }
};

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Helpers;
}
