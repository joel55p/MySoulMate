/**
 * Funciones auxiliares para MySoulMate Backend
 */

/**
 * Valida si un email es de una universidad válida
 * @param {string} email - Email a validar
 * @returns {boolean} - true si es válido
 */
function isValidUniversityEmail(email) {
    const validDomains = [
        'uvg.edu.gt',
        'url.edu.gt', 
        'unis.edu.gt',
        'ufm.edu',
        'usac.edu.gt'
    ];
    
    const domain = email.split('@')[1];
    return validDomains.some(validDomain => 
        domain === validDomain || domain.endsWith('.' + validDomain)
    );
}

/**
 * Sanitiza un string removiendo caracteres peligrosos
 * @param {string} str - String a sanitizar
 * @returns {string} - String sanitizado
 */
function sanitizeString(str) {
    if (typeof str !== 'string') return '';
    
    return str
        .trim()
        .replace(/[<>\"'&]/g, '') // Remover caracteres HTML peligrosos
        .substring(0, 500); // Limitar longitud
}

/**
 * Valida formato de usuario de Instagram
 * @param {string} username - Usuario de Instagram
 * @returns {boolean} - true si es válido
 */
function isValidInstagramUsername(username) {
    if (!username) return true; // Es opcional
    
    const regex = /^[a-zA-Z0-9._]{1,30}$/;
    
    return regex.test(username) && 
           !username.startsWith('.') && 
           !username.endsWith('.') &&
           !username.includes('..');
}

/**
 * Calcula la edad basada en fecha de nacimiento
 * @param {Date} birthDate - Fecha de nacimiento
 * @returns {number} - Edad en años
 */
function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}

/**
 * Formatea un error para respuesta de API
 * @param {Error} error - Error a formatear
 * @param {boolean} isDevelopment - Si estamos en desarrollo
 * @returns {Object} - Error formateado
 */
function formatError(error, isDevelopment = false) {
    const formattedError = {
        error: 'Error interno del servidor',
        timestamp: new Date().toISOString()
    };
    
    if (isDevelopment) {
        formattedError.message = error.message;
        formattedError.stack = error.stack;
    }
    
    return formattedError;
}

/**
 * Genera un slug único basado en texto
 * @param {string} text - Texto base
 * @returns {string} - Slug generado
 */
function generateSlug(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[áéíóúü]/g, (match) => {
            const accents = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u' };
            return accents[match];
        })
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Valida si una fecha es válida y está en rango permitido
 * @param {string} dateString - Fecha en string
 * @param {number} minAge - Edad mínima permitida
 * @param {number} maxAge - Edad máxima permitida
 * @returns {Object} - {isValid: boolean, age?: number, error?: string}
 */
function validateBirthDate(dateString, minAge = 18, maxAge = 35) {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
        return { isValid: false, error: 'Fecha inválida' };
    }
    
    const age = calculateAge(date);
    
    if (age < minAge) {
        return { isValid: false, error: `Debes tener al menos ${minAge} años` };
    }
    
    if (age > maxAge) {
        return { isValid: false, error: `La edad máxima permitida es ${maxAge} años` };
    }
    
    return { isValid: true, age };
}

/**
 * Capitaliza la primera letra de cada palabra
 * @param {string} str - String a capitalizar
 * @returns {string} - String capitalizado
 */
function capitalizeWords(str) {
    if (typeof str !== 'string') return '';
    
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Genera un código aleatorio alfanumérico
 * @param {number} length - Longitud del código
 * @returns {string} - Código generado
 */
function generateRandomCode(length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
}

/**
 * Valida fortaleza de contraseña
 * @param {string} password - Contraseña a validar
 * @returns {Object} - {isValid: boolean, score: number, feedback: string[]}
 */
function validatePasswordStrength(password) {
    const feedback = [];
    let score = 0;
    
    if (password.length < 8) {
        feedback.push('Debe tener al menos 8 caracteres');
    } else {
        score++;
    }
    
    if (!/[a-z]/.test(password)) {
        feedback.push('Debe incluir al menos una letra minúscula');
    } else {
        score++;
    }
    
    if (!/[A-Z]/.test(password)) {
        feedback.push('Debe incluir al menos una letra mayúscula');
    } else {
        score++;
    }
    
    if (!/\d/.test(password)) {
        feedback.push('Debe incluir al menos un número');
    } else {
        score++;
    }
    
    if (!/[@$!%*?&]/.test(password)) {
        feedback.push('Debe incluir al menos un símbolo (@$!%*?&)');
    } else {
        score++;
    }
    
    return {
        isValid: score === 5,
        score,
        feedback
    };
}

/**
 * Convierte un Neo4j Integer a JavaScript number
 * @param {*} value - Valor que puede ser Neo4j Integer
 * @returns {number} - Número JavaScript
 */
function neo4jIntegerToNumber(value) {
    if (value && typeof value.toNumber === 'function') {
        return value.toNumber();
    }
    return Number(value);
}

/**
 * Limpia y normaliza datos de usuario para respuesta
 * @param {Object} user - Objeto usuario de Neo4j
 * @returns {Object} - Usuario limpio sin datos sensibles
 */
function sanitizeUserForResponse(user) {
    const { password, hashedPassword, ...cleanUser } = user;
    
    // Convertir Neo4j integers a números normales
    if (cleanUser.age) {
        cleanUser.age = neo4jIntegerToNumber(cleanUser.age);
    }
    
    return cleanUser;
}

/**
 * Valida parámetros de paginación
 * @param {number} page - Número de página
 * @param {number} limit - Elementos por página
 * @returns {Object} - {page: number, limit: number, offset: number}
 */
function validatePagination(page = 1, limit = 10) {
    const validPage = Math.max(1, parseInt(page) || 1);
    const validLimit = Math.min(50, Math.max(1, parseInt(limit) || 10));
    const offset = (validPage - 1) * validLimit;
    
    return {
        page: validPage,
        limit: validLimit,
        offset
    };
}

module.exports = {
    isValidUniversityEmail,
    sanitizeString,
    isValidInstagramUsername,
    calculateAge,
    formatError,
    generateSlug,
    validateBirthDate,
    capitalizeWords,
    generateRandomCode,
    validatePasswordStrength,
    neo4jIntegerToNumber,
    sanitizeUserForResponse,
    validatePagination
};