/**
 * Модуль криптографии
 * Функции для работы с паролями и шифрованием
 */

const CryptoHelper = {
    /**
     * Хеширует пароль с использованием SHA-256
     * ВАЖНО: В продакшене хеширование должно происходить на сервере!
     * @param {string} password - Пароль для хеширования
     * @returns {Promise<string>} Хеш пароля
     */
    async hashPassword(password) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hashHex;
        } catch (error) {
            console.error('❌ Ошибка хеширования пароля:', error);
            throw error;
        }
    },

    /**
     * Проверяет пароль с хешем
     * @param {string} password - Введенный пароль
     * @param {string} hash - Сохраненный хеш
     * @returns {Promise<boolean>} Совпадают ли пароли
     */
    async verifyPassword(password, hash) {
        try {
            const inputHash = await this.hashPassword(password);
            return inputHash === hash;
        } catch (error) {
            console.error('❌ Ошибка проверки пароля:', error);
            return false;
        }
    },

    /**
     * Генерирует случайный токен
     * @param {number} length - Длина токена
     * @returns {string}
     */
    generateToken(length = 32) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    },

    /**
     * Генерирует случайный salt для хеширования
     * @returns {string}
     */
    generateSalt() {
        return this.generateToken(16);
    }
};

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CryptoHelper;
}
