/**
 * Manejo del formulario de registro
 * Conectado con el backend MySoulMate
 */

document.addEventListener('DOMContentLoaded', () => {
    // Verificar si ya está autenticado
    if (api.isAuthenticated()) {
        // Redirigir al perfil si ya está logueado
        window.location.href = 'profile.html';
        return;
    }

    initializeRegisterForm();
    setupPasswordStrengthChecker();
    setupFormValidation();
    
    console.log('✅ Página de registro inicializada');
});

// Inicializar formulario de registro
function initializeRegisterForm() {
    const form = document.getElementById('registerForm');
    const submitBtn = document.getElementById('submitBtn');

    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!validateForm()) {
                return;
            }

            // Mostrar loading
            showLoading(submitBtn);

            try {
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                
                console.log('Enviando datos de registro:', { ...data, password: '[HIDDEN]' });

                const response = await api.register(data);
                
                console.log('✅ Registro exitoso:', response);
                
                // Mostrar mensaje de éxito
                showSuccess('¡Cuenta creada exitosamente!');
                
                // Redirigir al cuestionario después de un breve delay
                setTimeout(() => {
                    window.location.href = 'questionnare.html';
                }, 2000);

            } catch (error) {
                console.error('❌ Error en registro:', error);
                showError(error.message || 'Error al crear la cuenta');
            } finally {
                hideLoading(submitBtn);
            }
        });
    }
}

// Configurar verificador de fortaleza de contraseña
function setupPasswordStrengthChecker() {
    const passwordInput = document.getElementById('password');
    const strengthIndicator = document.getElementById('passwordStrength');
    
    if (!passwordInput || !strengthIndicator) return;
    
    const strengthBars = strengthIndicator.querySelectorAll('.strength-bar');
    const strengthText = strengthIndicator.querySelector('.strength-text');

    passwordInput.addEventListener('input', function() {
        const password = this.value;
        const strength = calculatePasswordStrength(password);
        
        // Reset bars
        strengthBars.forEach(bar => {
            bar.className = 'strength-bar';
        });

        // Set strength bars
        for (let i = 0; i < strength.score; i++) {
            strengthBars[i].classList.add(strength.class);
        }

        if (strengthText) {
            strengthText.textContent = strength.text;
        }
    });
}

// Calcular fortaleza de contraseña
function calculatePasswordStrength(password) {
    let score = 0;

    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[@$!%*?&]/.test(password)) score++;

    const strengthLevels = [
        { score: 0, class: '', text: 'Muy débil' },
        { score: 1, class: 'weak', text: 'Débil' },
        { score: 2, class: 'weak', text: 'Débil' },
        { score: 3, class: 'medium', text: 'Media' },
        { score: 4, class: 'strong', text: 'Fuerte' },
        { score: 5, class: 'very-strong', text: 'Muy fuerte' }
    ];

    return strengthLevels[score] || strengthLevels[0];
}

// Configurar validación de formulario
function setupFormValidation() {
    // Validación en tiempo real
    const inputs = document.querySelectorAll('.form-input, .form-select');
    inputs.forEach(input => {
        input.addEventListener('blur', () => {
            validateField(input);
        });
        
        input.addEventListener('input', () => {
            // Limpiar error cuando el usuario empiece a escribir
            clearFieldError(input);
        });
    });
}

// Validar campo individual
function validateField(input) {
    const name = input.name;
    const value = input.value.trim();
    
    switch (name) {
        case 'name':
            if (!value || value.length < 2) {
                showFieldError(input, 'El nombre debe tener al menos 2 caracteres');
                return false;
            }
            break;
            
        case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!value || !emailRegex.test(value)) {
                showFieldError(input, 'Ingresa un email válido');
                return false;
            }
            
            // Validar email universitario
            const universityDomains = ['uvg.edu.gt', 'url.edu.gt', 'unis.edu.gt', 'ufm.edu', 'usac.edu.gt'];
            const emailDomain = value.split('@')[1];
            if (!universityDomains.some(domain => emailDomain === domain || emailDomain.endsWith('.' + domain))) {
                showFieldError(input, 'Debes usar tu email universitario oficial');
                return false;
            }
            break;
            
        case 'age':
            const age = parseInt(value);
            if (!age || age < 18 || age > 35) {
                showFieldError(input, 'Debes tener entre 18 y 35 años');
                return false;
            }
            break;
            
        case 'password':
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
            if (!value || value.length < 8 || !passwordRegex.test(value)) {
                showFieldError(input, 'La contraseña debe tener al menos 8 caracteres, incluyendo mayúscula, minúscula, número y símbolo');
                return false;
            }
            break;
            
        case 'confirmPassword':
            const password = document.getElementById('password').value;
            if (value !== password) {
                showFieldError(input, 'Las contraseñas no coinciden');
                return false;
            }
            break;
            
        case 'instagram':
            if (value) {
                const instagramRegex = /^[a-zA-Z0-9._]{1,30}$/;
                if (!instagramRegex.test(value) || value.startsWith('.') || value.endsWith('.') || value.includes('..')) {
                    showFieldError(input, 'Usuario de Instagram inválido');
                    return false;
                }
            }
            break;
    }
    
    clearFieldError(input);
    return true;
}

// Validar formulario completo
function validateForm() {
    let isValid = true;
    const form = document.getElementById('registerForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Limpiar errores previos
    clearFormErrors();

    // Validar nombre
    if (!data.name || data.name.trim().length < 2) {
        showFieldError(document.getElementById('name'), 'El nombre debe tener al menos 2 caracteres');
        isValid = false;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) {
        showFieldError(document.getElementById('email'), 'Ingresa un email válido');
        isValid = false;
    } else {
        // Validar email universitario
        const universityDomains = ['uvg.edu.gt', 'url.edu.gt', 'unis.edu.gt', 'ufm.edu', 'usac.edu.gt'];
        const emailDomain = data.email.split('@')[1];
        if (!universityDomains.some(domain => emailDomain === domain || emailDomain.endsWith('.' + domain))) {
            showFieldError(document.getElementById('email'), 'Debes usar tu email universitario oficial');
            isValid = false;
        }
    }

    // Validar edad
    const age = parseInt(data.age);
    if (!age || age < 18 || age > 35) {
        showFieldError(document.getElementById('age'), 'Debes tener entre 18 y 35 años');
        isValid = false;
    }

    // Validar género
    if (!data.gender) {
        showFieldError(document.getElementById('gender'), 'Selecciona tu género');
        isValid = false;
    }

    // Validar universidad
    if (!data.university) {
        showFieldError(document.getElementById('university'), 'Selecciona tu universidad');
        isValid = false;
    }

    // Validar contraseña
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!data.password || data.password.length < 8 || !passwordRegex.test(data.password)) {
        showFieldError(document.getElementById('password'), 'La contraseña debe tener al menos 8 caracteres, incluyendo mayúscula, minúscula, número y símbolo');
        isValid = false;
    }

    // Validar confirmación de contraseña
    if (data.password !== data.confirmPassword) {
        showFieldError(document.getElementById('confirmPassword'), 'Las contraseñas no coinciden');
        isValid = false;
    }

    // Validar Instagram (opcional)
    if (data.instagram && data.instagram.trim()) {
        const instagramRegex = /^[a-zA-Z0-9._]{1,30}$/;
        const instagram = data.instagram.trim();
        
        if (!instagramRegex.test(instagram) || instagram.startsWith('.') || instagram.endsWith('.') || instagram.includes('..')) {
            showFieldError(document.getElementById('instagram'), 'Usuario de Instagram inválido');
            isValid = false;
        }
    }

    // Validar términos
    if (!document.getElementById('acceptTerms').checked) {
        showError('Debes aceptar los términos y condiciones');
        isValid = false;
    }

    // Validar confirmación de edad
    if (!document.getElementById('acceptAge').checked) {
        showError('Debes confirmar que eres mayor de edad');
        isValid = false;
    }

    return isValid;
}

// Funciones de utilidad para mostrar/ocultar errores
function clearFormErrors() {
    const errorElements = document.querySelectorAll('.input-error');
    errorElements.forEach(element => {
        element.textContent = '';
    });
    
    const inputs = document.querySelectorAll('.form-input.error, .form-select.error');
    inputs.forEach(input => {
        input.classList.remove('error');
    });
}

function showFieldError(input, message) {
    const errorElement = input.parentElement.querySelector('.input-error');
    if (errorElement) {
        errorElement.textContent = message;
    }
    input.classList.add('error');
}

function clearFieldError(input) {
    const errorElement = input.parentElement.querySelector('.input-error');
    if (errorElement) {
        errorElement.textContent = '';
    }
    input.classList.remove('error');
}

// Función para alternar visibilidad de contraseña
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.parentElement.querySelector('.password-toggle-icon');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.textContent = '🙈';
    } else {
        input.type = 'password';
        icon.textContent = '👁️';
    }
}

// Funciones para mostrar loading
function showLoading(button) {
    if (!button) return;
    
    const btnText = button.querySelector('.btn-text');
    const btnLoading = button.querySelector('.btn-loading');
    
    if (btnText && btnLoading) {
        btnText.style.display = 'none';
        btnLoading.style.display = 'flex';
    }
    button.disabled = true;
}

function hideLoading(button) {
    if (!button) return;
    
    const btnText = button.querySelector('.btn-text');
    const btnLoading = button.querySelector('.btn-loading');
    
    if (btnText && btnLoading) {
        btnText.style.display = 'block';
        btnLoading.style.display = 'none';
    }
    button.disabled = false;
}

// Hacer la función togglePassword disponible globalmente
window.togglePassword = togglePassword;