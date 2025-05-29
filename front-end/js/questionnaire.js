/**
 * Manejo del cuestionario de compatibilidad
 * Conectado con el backend para guardar respuestas en Neo4j
 */

document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación
    if (!api.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    initializeQuestionnaire();
});

function initializeQuestionnaire() {
    // Configurar validación en tiempo real
    setupLiveValidation();
    
    // Configurar manejo del formulario
    setupFormSubmission();
    
    // Configurar contadores de selección
    setupSelectionCounters();
    
    console.log('✅ Cuestionario inicializado');
}

// Configurar validación en tiempo real
function setupLiveValidation() {
    // Música (máximo 3)
    const musicCheckboxes = document.querySelectorAll('input[name="music"]');
    setupCheckboxLimit(musicCheckboxes, 3, 'music-counter');
    
    // Entretenimiento (máximo 3)
    const entertainmentCheckboxes = document.querySelectorAll('input[name="entertainment"]');
    setupCheckboxLimit(entertainmentCheckboxes, 3, 'entertainment-counter');
    
    // Deportes (máximo 4)
    const sportsCheckboxes = document.querySelectorAll('input[name="sports"]');
    setupCheckboxLimit(sportsCheckboxes, 4, 'sports-counter');
    
    // Hobbies (máximo 4)
    const hobbiesCheckboxes = document.querySelectorAll('input[name="hobbies"]');
    setupCheckboxLimit(hobbiesCheckboxes, 4, 'hobbies-counter');
}

// Configurar límite de checkboxes
function setupCheckboxLimit(checkboxes, maxLimit, counterId) {
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const checked = Array.from(checkboxes).filter(cb => cb.checked);
            const counter = document.getElementById(counterId);
            
            if (counter) {
                counter.textContent = `${checked.length}/${maxLimit} seleccionados`;
                
                if (checked.length >= maxLimit) {
                    counter.classList.add('warning');
                    // Deshabilitar checkboxes no seleccionados
                    checkboxes.forEach(cb => {
                        if (!cb.checked) {
                            cb.disabled = true;
                        }
                    });
                } else {
                    counter.classList.remove('warning');
                    // Habilitar todos los checkboxes
                    checkboxes.forEach(cb => {
                        cb.disabled = false;
                    });
                }
                
                if (checked.length === 0) {
                    counter.classList.remove('warning');
                }
            }
        });
    });
}

// Configurar contadores de selección
function setupSelectionCounters() {
    // Inicializar contadores
    const counters = ['music-counter', 'entertainment-counter', 'sports-counter', 'hobbies-counter'];
    counters.forEach(counterId => {
        const counter = document.getElementById(counterId);
        if (counter && !counter.textContent.includes('/')) {
            const maxLimit = counterId.includes('music') || counterId.includes('entertainment') ? 3 : 4;
            counter.textContent = `0/${maxLimit} seleccionados`;
        }
    });
}

// Configurar envío del formulario
function setupFormSubmission() {
    // Buscar el botón de continuar
    const submitButton = document.querySelector('.btn-continuar');
    
    if (submitButton) {
        // Cambiar de enlace a botón con función
        submitButton.removeAttribute('href');
        submitButton.addEventListener('click', async (e) => {
            e.preventDefault();
            await handleQuestionnaireSubmission();
        });
    }
    
    // También buscar si hay un formulario tradicional
    const form = document.getElementById('questionnaireForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleQuestionnaireSubmission();
        });
    }
}

// Manejar envío del cuestionario
async function handleQuestionnaireSubmission() {
    try {
        console.log('Iniciando envío del cuestionario...');
        
        // Mostrar loading
        const submitButton = document.querySelector('.btn-continuar');
        if (submitButton) {
            showLoadingButton(submitButton);
        }
        
        // Recopilar respuestas
        const answers = collectQuestionnaireAnswers();
        
        // Validar respuestas
        const validation = validateAnswers(answers);
        if (!validation.isValid) {
            showError(`Error en el cuestionario:\n${validation.errors.join('\n')}`);
            hideLoadingButton(submitButton);
            return;
        }
        
        console.log('Respuestas recopiladas:', answers);
        
        // Enviar al backend
        const response = await api.submitQuestionnaire(answers);
        
        console.log('✅ Cuestionario enviado exitosamente:', response);
        
        // Mostrar mensaje de éxito
        showSuccess('¡Cuestionario completado exitosamente!');
        
        // Redirigir al perfil después de un breve delay
        setTimeout(() => {
            window.location.href = 'profile.html';
        }, 2000);
        
    } catch (error) {
        console.error('❌ Error enviando cuestionario:', error);
        showError(error.message || 'Error al guardar el cuestionario');
        
        const submitButton = document.querySelector('.btn-continuar');
        if (submitButton) {
            hideLoadingButton(submitButton);
        }
    }
}

// Recopilar respuestas del cuestionario
function collectQuestionnaireAnswers() {
    const answers = {};
    
    // Recopilar intereses múltiples
    answers.music = getCheckedValues('input[name="music"]:checked');
    answers.entertainment = getCheckedValues('input[name="entertainment"]:checked');
    answers.sports = getCheckedValues('input[name="sports"]:checked');
    answers.hobbies = getCheckedValues('input[name="hobbies"]:checked');
    
    // Recopilar preferencias de personalidad (radio buttons)
    answers.relationship_values = getSelectedValue('input[name="relationship_values"]:checked');
    answers.weekend_preference = getSelectedValue('input[name="weekend_preference"]:checked');
    answers.conversation_style = getSelectedValue('input[name="conversation_style"]:checked');
    answers.social_life = getSelectedValue('input[name="social_life"]:checked');
    answers.relationship_goal = getSelectedValue('input[name="relationship_goal"]:checked');
    
    return answers;
}

// Obtener valores seleccionados de checkboxes
function getCheckedValues(selector) {
    const elements = document.querySelectorAll(selector);
    return Array.from(elements).map(el => el.value);
}

// Obtener valor seleccionado de radio button
function getSelectedValue(selector) {
    const element = document.querySelector(selector);
    return element ? element.value : '';
}

// Validar respuestas del cuestionario
function validateAnswers(answers) {
    const errors = [];
    
    // Validar música (1-3 selecciones)
    if (!answers.music || answers.music.length === 0) {
        errors.push('Debes seleccionar al menos 1 género musical');
    } else if (answers.music.length > 3) {
        errors.push('Máximo 3 géneros musicales permitidos');
    }
    
    // Validar entretenimiento (1-3 selecciones)
    if (!answers.entertainment || answers.entertainment.length === 0) {
        errors.push('Debes seleccionar al menos 1 tipo de entretenimiento');
    } else if (answers.entertainment.length > 3) {
        errors.push('Máximo 3 tipos de entretenimiento permitidos');
    }
    
    // Validar deportes (1-4 selecciones)
    if (!answers.sports || answers.sports.length === 0) {
        errors.push('Debes seleccionar al menos 1 actividad deportiva');
    } else if (answers.sports.length > 4) {
        errors.push('Máximo 4 actividades deportivas permitidas');
    }
    
    // Validar hobbies (1-4 selecciones)
    if (!answers.hobbies || answers.hobbies.length === 0) {
        errors.push('Debes seleccionar al menos 1 hobby');
    } else if (answers.hobbies.length > 4) {
        errors.push('Máximo 4 hobbies permitidos');
    }
    
    // Validar preguntas de personalidad
    const personalityFields = [
        { field: 'relationship_values', name: 'valores en una relación' },
        { field: 'weekend_preference', name: 'preferencia de fin de semana' },
        { field: 'conversation_style', name: 'estilo de conversación' },
        { field: 'social_life', name: 'descripción de vida social' },
        { field: 'relationship_goal', name: 'objetivo en una relación' }
    ];
    
    personalityFields.forEach(({ field, name }) => {
        if (!answers[field] || answers[field].trim() === '') {
            errors.push(`Debes seleccionar tu ${name}`);
        }
    });
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

// Funciones de UI para botones
function showLoadingButton(button) {
    if (!button) return;
    
    button.disabled = true;
    button.style.opacity = '0.7';
    button.style.cursor = 'not-allowed';
    
    const originalText = button.textContent;
    button.setAttribute('data-original-text', originalText);
    button.textContent = 'Guardando...';
}

function hideLoadingButton(button) {
    if (!button) return;
    
    button.disabled = false;
    button.style.opacity = '1';
    button.style.cursor = 'pointer';
    
    const originalText = button.getAttribute('data-original-text');
    if (originalText) {
        button.textContent = originalText;
    }
}

// Función para precargar cuestionario si ya existe
async function loadExistingQuestionnaire() {
    try {
        const response = await api.getQuestionnaireResponses();
        
        if (response.hasCompletedQuestionnaire) {
            console.log('Usuario ya completó el cuestionario:', response);
            
            // Precargar respuestas en el formulario
            fillFormWithExistingAnswers(response);
            
            // Cambiar el botón de "Continuar" a "Actualizar"
            const submitButton = document.querySelector('.btn-continuar');
            if (submitButton) {
                submitButton.textContent = 'Actualizar Respuestas';
            }
        }
    } catch (error) {
        console.log('Usuario no ha completado el cuestionario aún');
    }
}

// Llenar formulario con respuestas existentes
function fillFormWithExistingAnswers(responses) {
    // Llenar intereses
    if (responses.interests) {
        fillCheckboxes('music', responses.interests.music);
        fillCheckboxes('entertainment', responses.interests.entertainment);
        fillCheckboxes('sports', responses.interests.sports);
        fillCheckboxes('hobbies', responses.interests.hobbies);
    }
    
    // Llenar preferencias de personalidad
    if (responses.profile) {
        fillRadioButton('relationship_values', responses.profile.relationshipValues);
        fillRadioButton('weekend_preference', responses.profile.weekendPreference);
        fillRadioButton('conversation_style', responses.profile.conversationStyle);
        fillRadioButton('social_life', responses.profile.socialLife);
        fillRadioButton('relationship_goal', responses.profile.relationshipGoal);
    }
}

function fillCheckboxes(name, values) {
    if (!values || !Array.isArray(values)) return;
    
    values.forEach(value => {
        const checkbox = document.querySelector(`input[name="${name}"][value="${value}"]`);
        if (checkbox) {
            checkbox.checked = true;
            checkbox.dispatchEvent(new Event('change')); // Trigger validation
        }
    });
}

function fillRadioButton(name, value) {
    if (!value) return;
    
    const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (radio) {
        radio.checked = true;
    }
}

// Inicializar precarga cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Dar tiempo para que se inicialice el cuestionario
    setTimeout(() => {
        loadExistingQuestionnaire();
    }, 500);
});