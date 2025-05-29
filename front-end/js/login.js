/**
 * Manejo del formulario de login
 * Conectado con el backend MySoulMate
 */

document.addEventListener('DOMContentLoaded', () => {
    // Verificar si ya está autenticado
    if (api.isAuthenticated()) {
        // Redirigir al perfil si ya está logueado
        window.location.href = 'profile.html';
        return;
    }

    // Configurar el formulario de login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }

    console.log('✅ Página de login inicializada');
});

async function handleLoginSubmit(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    // Validación básica
    if (!email || !password) {
        showError('Por favor completa todos los campos');
        return;
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('Por favor ingresa un email válido');
        return;
    }
    
    const submitButton = document.querySelector('form button[type="submit"]');
    
    try {
        // Mostrar loading
        if (submitButton) {
            showLoadingState(submitButton);
        }
        
        console.log('Intentando login con:', email);
        
        // Realizar login
        const response = await api.login(email, password);
        
        console.log('✅ Login exitoso:', response);
        
        // Mostrar mensaje de éxito
        showSuccess('¡Bienvenido de vuelta!');
        
        // Verificar si ha completado el cuestionario
        try {
            const questionnaireResponse = await api.getQuestionnaireResponses();
            
            if (questionnaireResponse.hasCompletedQuestionnaire) {
                // Ya completó el cuestionario, ir al perfil
                setTimeout(() => {
                    window.location.href = 'profile.html';
                }, 1500);
            } else {
                // No ha completado el cuestionario, ir al cuestionario
                showSuccess('¡Ahora completa tu cuestionario para encontrar matches!');
                setTimeout(() => {
                    window.location.href = 'questionnare.html';
                }, 2000);
            }
        } catch (questionnaireError) {
            // Si hay error verificando cuestionario, ir al perfil por defecto
            console.warn('Error verificando cuestionario:', questionnaireError);
            setTimeout(() => {
                window.location.href = 'profile.html';
            }, 1500);
        }
        
    } catch (error) {
        console.error('❌ Error en login:', error);
        
        // Mostrar error específico
        let errorMessage = 'Error al iniciar sesión';
        
        if (error.message.includes('Credenciales inválidas') || 
            error.message.includes('Email o contraseña incorrectos')) {
            errorMessage = 'Email o contraseña incorrectos';
        } else if (error.message.includes('Cuenta desactivada')) {
            errorMessage = 'Tu cuenta ha sido desactivada. Contacta a soporte.';
        } else if (error.message.includes('conectar al servidor')) {
            errorMessage = 'No se pudo conectar al servidor. Intenta más tarde.';
        } else {
            errorMessage = error.message || 'Error al iniciar sesión';
        }
        
        showError(errorMessage);
        
    } finally {
        // Ocultar loading
        if (submitButton) {
            hideLoadingState(submitButton);
        }
    }
}

// Mostrar estado de carga en el botón
function showLoadingState(button) {
    button.disabled = true;
    button.style.opacity = '0.7';
    button.style.cursor = 'not-allowed';
    
    const originalText = button.textContent;
    button.setAttribute('data-original-text', originalText);
    button.textContent = 'Iniciando sesión...';
}

// Ocultar estado de carga del botón
function hideLoadingState(button) {
    button.disabled = false;
    button.style.opacity = '1';
    button.style.cursor = 'pointer';
    
    const originalText = button.getAttribute('data-original-text');
    if (originalText) {
        button.textContent = originalText;
    }
}

// Función para manejar "Enter" en los campos
document.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        const form = document.getElementById('loginForm');
        if (form && document.activeElement && form.contains(document.activeElement)) {
            form.dispatchEvent(new Event('submit'));
        }
    }
});

// Funciones auxiliares (en caso de que no estén definidas globalmente)
if (typeof showError === 'undefined') {
    window.showError = function(message, duration = 5000) {
        console.error(message);
        alert('Error: ' + message); // Fallback
    };
}

if (typeof showSuccess === 'undefined') {
    window.showSuccess = function(message, duration = 3000) {
        console.log(message);
        alert('Éxito: ' + message); // Fallback
    };
}