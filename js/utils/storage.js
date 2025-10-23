/**
 * Модуль работы с LocalStorage
 * Централизованное управление хранением данных
 */

const StorageManager = {
    /**
     * Получает данные из localStorage
     * @param {string} key - Ключ хранилища
     * @param {*} defaultValue - Значение по умолчанию
     * @returns {*} Данные или значение по умолчанию
     */
    get(key, defaultValue = null) {
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : defaultValue;
        } catch (error) {
            console.error(`❌ Ошибка чтения из localStorage (${key}):`, error);
            return defaultValue;
        }
    },

    /**
     * Сохраняет данные в localStorage
     * @param {string} key - Ключ хранилища
     * @param {*} value - Значение для сохранения
     * @returns {boolean} Успешность операции
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            console.log(`💾 Данные сохранены: ${key}`);
            return true;
        } catch (error) {
            console.error(`❌ Ошибка записи в localStorage (${key}):`, error);
            return false;
        }
    },

    /**
     * Удаляет данные из localStorage
     * @param {string} key - Ключ хранилища
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            console.log(`🗑️ Данные удалены: ${key}`);
        } catch (error) {
            console.error(`❌ Ошибка удаления из localStorage (${key}):`, error);
        }
    },

    /**
     * Очищает весь localStorage
     */
    clear() {
        try {
            localStorage.clear();
            console.log('🗑️ LocalStorage очищен');
        } catch (error) {
            console.error('❌ Ошибка очистки localStorage:', error);
        }
    },

    /**
     * Проверяет наличие ключа
     * @param {string} key - Ключ хранилища
     * @returns {boolean}
     */
    has(key) {
        return localStorage.getItem(key) !== null;
    }
};

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}
