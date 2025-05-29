/**
 * Manejo de autenticación en el frontend
 * Funciones para registro, login y verificación de sesión
 */

// Verificar autenticación al cargar páginas protegidas
async function checkAuthOnLoad() {
    if (api.isAuthenticated()) {
        try {
            await api.verifyToken();
            console.log('✅ Usuario autenticado');
            return true;
        } catch (error) {
            console.log('❌ Token inválido, redirigiendo al login');
            api.logout();
            return false;
        }
    }
    return false;
}

// Redirigir según el estado de autenticación
async function redirectBasedOnAuth() {
    const currentPage = window.location.pathname.split('/').pop();
    const publicPages = ['index.html', 'login.html', 'register.html', ''];
    const isPublicPage = publicPages.includes(currentPage);

    if (api.isAuthenticated()) {
        try {
            await api.verifyToken();
            
            // Si está en página pública y autenticado, ir al perfil
            if (isPublicPage) {
                window.location.href = 'profile.html';
                return;
            }
        } catch (error) {
            // Token inválido, continuar con el flujo normal
            api.logout();
        }
    } else {
        // No autenticado, redirigir a login si está en página protegida
        if (!isPublicPage) {
            window.location.href = 'login.html';
            return;
        }
    }
}

// Inicializar verificación de autenticación
document.addEventListener('DOMContentLoaded', () => {
    redirectBasedOnAuth();
});

// FUNCIONES DE REGISTRO
async function handleRegistration(formData) {
    try {
        console.log('Iniciando registro...');
        
        // Mostrar loading
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            showLoading(submitBtn);
        }

        // Preparar datos del usuario
        const userData = {
            name: formData.get('name').trim(),
            email: formData.get('email').toLowerCase().trim(),
            age: parseInt(formData.get('age')),
            gender: formData.get('gender'),
            university: formData.get('university'),
            career: formData.get('career') || '',
            semester: formData.get('semester') || '',
            instagram: formData.get('instagram') || '',
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword'),
            acceptTerms: formData.get('acceptTerms') === 'on',
            acceptAge: formData.get('acceptAge') === 'on'
        };

        console.log('Datos a enviar:', { ...userData, password: '[HIDDEN]', confirmPassword: '[HIDDEN]' });

        // Registrar usuario
        const response = await api.register(userData);
        
        console.log('✅ Registro exitoso:', response);
        
        // Mostrar mensaje de éxito
        showSuccess('¡Cuenta creada exitosamente!');
        
        // Redirigir al cuestionario después de un breve delay
        setTimeout(() => {
            window.location.href = 'questionnare.html';
        }, 1500);

    } catch (error) {
        console.error('❌ Error en registro:', error);
        showError(error.message || 'Error al crear la cuenta');
        
        // Ocultar loading
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            hideLoading(submitBtn);
        }
    }
}

// FUNCIONES DE LOGIN
async function handleLogin(email, password) {
    try {
        console.log('Iniciando login...');
        
        const response = await api.login(email, password);
        
        console.log('✅ Login exitoso:', response);
        
        // Mostrar mensaje de éxito
        showSuccess('¡Bienvenido de vuelta!');
        
        // Verificar if ha completado el cuestionario
        try {
            const questionnaireResponse = await api.getQuestionnaireResponses();
            
            if (questionnaireResponse.hasCompletedQuestionnaire) {
                // Ya completó el cuestionario, ir al perfil
                setTimeout(() => {
                    window.location.href = 'profile.html';
                }, 1000);
            } else {
                // No ha completado el cuestionario, ir al cuestionario
                setTimeout(() => {
                    window.location.href = 'questionnare.html';
                }, 1000);
            }
        } catch (error) {
            // Si hay error obteniendo cuestionario, ir al perfil por defecto
            console.warn('Error verificando cuestionario:', error);
            setTimeout(() => {
                window.location.href = 'profile.html';
            }, 1000);
        }

    } catch (error) {
        console.error('❌ Error en login:', error);
        showError(error.message || 'Error al iniciar sesión');
    }
}

// Función para cerrar sesión
function handleLogout() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        api.logout();
        showSuccess('Sesión cerrada exitosamente');
    }
}

// Funciones de utilidad para UI
function showLoading(button) {
    if (!button) return;
    
    const btnText = button.querySelector('.btn-text');
    const btnLoading = button.querySelector('.btn-loading');
    
    if (btnText && btnLoading) {
        btnText.style.display = 'none';
        btnLoading.style.display = 'flex';
    } else {
        button.disabled = true;
        button.textContent = 'Procesando...';
    }
}

function hideLoading(button) {
    if (!button) return;
    
    const btnText = button.querySelector('.btn-text');
    const btnLoading = button.querySelector('.btn-loading');
    
    if (btnText && btnLoading) {
        btnText.style.display = 'block';
        btnLoading.style.display = 'none';
    } else {
        button.disabled = false;
        button.textContent = button.getAttribute('data-original-text') || 'Enviar';
    }
}

// Validación de formularios
function validateRegistrationForm(formData) {
    const errors = [];
    
    // Validar nombre
    const name = formData.get('name');
    if (!name || name.trim().length < 2) {
        errors.push('El nombre debe tener al menos 2 caracteres');
    }
    
    // Validar email
    const email = formData.get('email');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        errors.push('Email inválido');
    }
    
    // Validar edad
    const age = parseInt(formData.get('age'));
    if (!age || age < 18 || age > 35) {
        errors.push('La edad debe estar entre 18 y 35 años');
    }
    
    // Validar contraseña
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    
    if (!password || password.length < 8) {
        errors.push('La contraseña debe tener al menos 8 caracteres');
    }
    
    if (password !== confirmPassword) {
        errors.push('Las contraseñas no coinciden');
    }
    
    // Validar términos
    if (formData.get('acceptTerms') !== 'on') {
        errors.push('Debes aceptar los términos y condiciones');
    }
    
    if (formData.get('acceptAge') !== 'on') {
        errors.push('Debes confirmar que eres mayor de edad');
    }
    
    return errors;
}

// Mostrar errores de validación
function showValidationErrors(errors) {
    if (errors.length === 0) return;
    
    const errorMessage = errors.length === 1 
        ? errors[0] 
        : `Se encontraron ${errors.length} errores:\n• ${errors.join('\n• ')}`;
    
    showError(errorMessage, 7000);
}

// Inicialización específica por página
function initializeAuthPage() {
    const currentPage = window.location.pathname.split('/').pop();
    
    switch (currentPage) {
        case 'register.html':
            initializeRegisterPage();
            break;
        case 'login.html':
            initializeLoginPage();
            break;
    }
}

function initializeRegisterPage() {
    const form = document.getElementById('registerForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(form);
            const errors = validateRegistrationForm(formData);
            
            if (errors.length > 0) {
                showValidationErrors(errors);
                return;
            }
            
            await handleRegistration(formData);
        });
    }
}

function initializeLoginPage() {
    const form = document.getElementById('loginForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            
            if (!email || !password) {
                showError('Por favor completa todos los campos');
                return;
            }
            
            await handleLogin(email, password);
        });
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    initializeAuthPage();
});

// Exportar funciones para uso global
window.authUtils = {
    handleRegistration,
    handleLogin,
    handleLogout,
    checkAuthOnLoad,
    showLoading,
    hideLoading
};