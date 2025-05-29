/**
 * Cliente API para MySoulMate Frontend
 * Maneja todas las comunicaciones con el backend
 */

class ApiClient {
    constructor() {
        this.baseURL = 'http://localhost:3000/api';
        this.token = localStorage.getItem('authToken');
    }

    // Configurar headers para las peticiones
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (includeAuth && this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    // Manejar respuestas de la API
    async handleResponse(response) {
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || data.error || 'Error en la petición');
        }
        
        return data;
    }

    // Manejar errores de red
    handleNetworkError(error) {
        console.error('Error de API:', error);
        
        if (error.message.includes('Failed to fetch')) {
            throw new Error('No se pudo conectar al servidor. Verifica que esté ejecutándose.');
        }
        
        throw error;
    }

    // AUTENTICACIÓN
    async register(userData) {
        try {
            const response = await fetch(`${this.baseURL}/auth/register`, {
                method: 'POST',
                headers: this.getHeaders(false),
                body: JSON.stringify(userData)
            });

            const data = await this.handleResponse(response);
            
            // Guardar token
            if (data.token) {
                this.token = data.token;
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('userData', JSON.stringify(data.user));
            }
            
            return data;
        } catch (error) {
            throw this.handleNetworkError(error);
        }
    }

    async login(email, password) {
        try {
            const response = await fetch(`${this.baseURL}/auth/login`, {
                method: 'POST',
                headers: this.getHeaders(false),
                body: JSON.stringify({ email, password })
            });

            const data = await this.handleResponse(response);
            
            // Guardar token y datos de usuario
            if (data.token) {
                this.token = data.token;
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('userData', JSON.stringify(data.user));
            }
            
            return data;
        } catch (error) {
            throw this.handleNetworkError(error);
        }
    }

    async verifyToken() {
        try {
            if (!this.token) {
                throw new Error('No hay token');
            }

            const response = await fetch(`${this.baseURL}/auth/verify`, {
                method: 'GET',
                headers: this.getHeaders(true)
            });

            return await this.handleResponse(response);
        } catch (error) {
            // Si el token es inválido, limpiar storage
            this.logout();
            throw this.handleNetworkError(error);
        }
    }

    logout() {
        this.token = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = 'index.html';
    }

    // PERFIL DE USUARIO
    async getUserProfile() {
        try {
            const response = await fetch(`${this.baseURL}/users/profile`, {
                method: 'GET',
                headers: this.getHeaders(true)
            });

            return await this.handleResponse(response);
        } catch (error) {
            throw this.handleNetworkError(error);
        }
    }

    async updateUserProfile(userData) {
        try {
            const response = await fetch(`${this.baseURL}/users/profile`, {
                method: 'PUT',
                headers: this.getHeaders(true),
                body: JSON.stringify(userData)
            });

            return await this.handleResponse(response);
        } catch (error) {
            throw this.handleNetworkError(error);
        }
    }

    // CUESTIONARIO
    async submitQuestionnaire(answers) {
        try {
            console.log('Enviando cuestionario:', answers);
            
            const response = await fetch(`${this.baseURL}/questionnaire/submit`, {
                method: 'POST',
                headers: this.getHeaders(true),
                body: JSON.stringify(answers)
            });

            return await this.handleResponse(response);
        } catch (error) {
            throw this.handleNetworkError(error);
        }
    }

    async getQuestionnaireResponses() {
        try {
            const response = await fetch(`${this.baseURL}/questionnaire/responses`, {
                method: 'GET',
                headers: this.getHeaders(true)
            });

            return await this.handleResponse(response);
        } catch (error) {
            throw this.handleNetworkError(error);
        }
    }

    // MATCHES
    async getMatches(limit = 10, minCompatibility = 0.3) {
        try {
            const params = new URLSearchParams({
                limit: limit.toString(),
                minCompatibility: minCompatibility.toString()
            });

            const response = await fetch(`${this.baseURL}/matches?${params}`, {
                method: 'GET',
                headers: this.getHeaders(true)
            });

            return await this.handleResponse(response);
        } catch (error) {
            throw this.handleNetworkError(error);
        }
    }

    async getMatchById(matchId) {
        try {
            const response = await fetch(`${this.baseURL}/matches/${matchId}`, {
                method: 'GET',
                headers: this.getHeaders(true)
            });

            return await this.handleResponse(response);
        } catch (error) {
            throw this.handleNetworkError(error);
        }
    }

    async showInterest(matchId) {
        try {
            const response = await fetch(`${this.baseURL}/matches/${matchId}/interest`, {
                method: 'POST',
                headers: this.getHeaders(true)
            });

            return await this.handleResponse(response);
        } catch (error) {
            throw this.handleNetworkError(error);
        }
    }

    async getMutualMatches() {
        try {
            const response = await fetch(`${this.baseURL}/matches/mutual/list`, {
                method: 'GET',
                headers: this.getHeaders(true)
            });

            return await this.handleResponse(response);
        } catch (error) {
            throw this.handleNetworkError(error);
        }
    }

    // UTILIDADES
    isAuthenticated() {
        return !!this.token;
    }

    getCurrentUser() {
        const userData = localStorage.getItem('userData');
        return userData ? JSON.parse(userData) : null;
    }

    // Verificar estado de salud del servidor
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseURL}/health`);
            return await this.handleResponse(response);
        } catch (error) {
            throw this.handleNetworkError(error);
        }
    }
}

// Crear instancia global
const api = new ApiClient();

// Función para mostrar mensajes de error
function showError(message, duration = 5000) {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc3545;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;

    // Agregar animación CSS si no existe
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Remover después del tiempo especificado
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
}

// Función para mostrar mensajes de éxito
function showSuccess(message, duration = 3000) {
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
}