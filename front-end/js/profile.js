/**
 * Manejo del perfil de usuario con matches reales desde Neo4j
 */

let currentUser = null;
let currentMatches = [];
let currentMatchIndex = 0;

document.addEventListener('DOMContentLoaded', async () => {
    // Verificar autenticación
    if (!api.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    try {
        await initializeProfile();
    } catch (error) {
        console.error('Error inicializando perfil:', error);
        showError('Error cargando el perfil');
    }
});

// Inicializar perfil
async function initializeProfile() {
    console.log('Inicializando perfil...');
    
    try {
        // Cargar datos del usuario
        await loadUserProfile();
        
        // Cargar matches
        await loadMatches();
        
        // Cargar conexiones
        await loadConnections();
        
        // Configurar event listeners
        setupEventListeners();
        
        console.log('✅ Perfil inicializado correctamente');
        
    } catch (error) {
        console.error('Error en inicialización:', error);
        
        if (error.message.includes('Cuestionario incompleto')) {
            showError('Debes completar el cuestionario primero');
            setTimeout(() => {
                window.location.href = 'questionnare.html';
            }, 2000);
        } else {
            showError('Error cargando el perfil: ' + error.message);
        }
    }
}

// Cargar perfil del usuario
async function loadUserProfile() {
    try {
        const response = await api.getUserProfile();
        currentUser = response.user;
        
        console.log('Usuario cargado:', currentUser);
        
        // Actualizar datos en la interfaz
        updateUserInterface(response);
        
    } catch (error) {
        console.error('Error cargando perfil de usuario:', error);
        throw error;
    }
}

// Actualizar interfaz con datos del usuario
function updateUserInterface(profileData) {
    // Actualizar información básica
    const profileName = document.getElementById('profileName');
    const profileAge = document.getElementById('profileAge');
    const profileGender = document.getElementById('profileGender');
    
    if (profileName) profileName.textContent = profileData.user.name;
    if (profileAge) profileAge.textContent = `${profileData.user.age} años`;
    if (profileGender) profileGender.textContent = profileData.user.gender;
    
    // Actualizar avatar
    const avatar = document.querySelector('.profile-avatar');
    if (avatar) {
        avatar.textContent = getAvatarByGender(profileData.user.gender);
    }
    
    // Si tiene intereses completados, mostrarlos
    if (profileData.interests && profileData.hasCompletedQuestionnaire) {
        updateInterestsDisplay(profileData.interests);
    }
}

// Actualizar display de intereses
function updateInterestsDisplay(interests) {
    // Música
    const musicElement = document.getElementById('musicalGenre');
    if (musicElement && interests.music.length > 0) {
        musicElement.textContent = interests.music.join(', ');
    }
    
    // Entretenimiento
    const entertainmentElement = document.getElementById('entertainment');
    if (entertainmentElement && interests.entertainment.length > 0) {
        entertainmentElement.textContent = interests.entertainment.join(', ');
    }
    
    // Deportes
    const sportsElement = document.getElementById('physicalActivities');
    if (sportsElement && interests.sports.length > 0) {
        sportsElement.textContent = interests.sports.join(', ');
    }
    
    // Hobbies
    const hobbiesElement = document.getElementById('hobbies');
    if (hobbiesElement && interests.hobbies.length > 0) {
        hobbiesElement.textContent = interests.hobbies.join(', ');
    }
}

// Cargar matches desde el backend
async function loadMatches() {
    try {
        console.log('Cargando matches...');
        
        const response = await api.getMatches(10, 0.3); // 10 matches, 30% compatibilidad mínima
        currentMatches = response.matches || [];
        currentMatchIndex = 0;
        
        console.log(`✅ Cargados ${currentMatches.length} matches`);
        
        if (currentMatches.length > 0) {
            displayCurrentMatch();
        } else {
            displayNoMatches();
        }
        
    } catch (error) {
        console.error('Error cargando matches:', error);
        
        if (error.message.includes('Cuestionario incompleto')) {
            displayIncompleteQuestionnaire();
        } else {
            displayNoMatches();
        }
    }
}

// Mostrar match actual
function displayCurrentMatch() {
    if (currentMatchIndex >= currentMatches.length) {
        displayNoMoreMatches();
        return;
    }
    
    const match = currentMatches[currentMatchIndex];
    console.log('Mostrando match:', match);
    
    // Actualizar información básica
    const profileName = document.getElementById('profileName');
    const profileAge = document.getElementById('profileAge');
    const profileGender = document.getElementById('profileGender');
    
    if (profileName) profileName.textContent = match.name;
    if (profileAge) profileAge.textContent = `${match.age} años`;
    if (profileGender) profileGender.textContent = match.gender;
    
    // Actualizar compatibilidad
    const compatibilityElement = document.querySelector('.compatibility-score');
    if (compatibilityElement) {
        compatibilityElement.textContent = `${match.compatibilityPercentage}% compatibilidad`;
    } else {
        // Crear elemento de compatibilidad si no existe
        const profileDetails = document.querySelector('.profile-details');
        if (profileDetails) {
            const compatibilityDiv = document.createElement('div');
            compatibilityDiv.className = 'compatibility-score';
            compatibilityDiv.style.cssText = `
                background: linear-gradient(45deg, #667eea, #764ba2);
                color: white;
                padding: 8px 15px;
                border-radius: 20px;
                font-weight: bold;
                margin-top: 10px;
                text-align: center;
                font-size: 0.9rem;
            `;
            compatibilityDiv.textContent = `${match.compatibilityPercentage}% compatibilidad`;
            profileDetails.appendChild(compatibilityDiv);
        }
    }
    
    // Actualizar avatar
    const avatar = document.querySelector('.profile-avatar');
    if (avatar) {
        avatar.textContent = getAvatarByGender(match.gender);
    }
    
    // Actualizar intereses del match
    if (match.interests) {
        updateInterestsDisplay(match.interests);
    }
    
    // Actualizar información de perfil
    if (match.profile) {
        updateProfileDisplay(match.profile);
    }
    
    // Mostrar botones de acción
    showActionButtons();
}

// Actualizar display de perfil de personalidad
function updateProfileDisplay(profile) {
    const profileElements = {
        'relationshipValues': profile.relationshipValues,
        'idealWeekend': profile.weekendPreference,
        'conversationStyle': profile.conversationStyle,
        'socialLife': profile.socialLife,
        'relationshipGoals': profile.relationshipGoal
    };
    
    Object.entries(profileElements).forEach(([elementId, value]) => {
        const element = document.getElementById(elementId);
        if (element && value) {
            element.textContent = value;
        }
    });
}

// Mostrar botones de acción
function showActionButtons() {
    const actionButtons = document.querySelector('.action-buttons');
    if (actionButtons) {
        actionButtons.style.display = 'flex';
    }
}

// Mostrar mensaje de no hay matches
function displayNoMatches() {
    const profileContent = document.querySelector('.profile-content');
    if (profileContent) {
        profileContent.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <div style="font-size: 3rem; margin-bottom: 20px; opacity: 0.5;">😔</div>
                <h3 style="color: #333; margin-bottom: 10px;">No hay matches disponibles</h3>
                <p style="color: #666; margin-bottom: 20px;">
                    Aún no hemos encontrado personas compatibles contigo.
                    Esto puede deberse a:
                </p>
                <ul style="text-align: left; max-width: 400px; margin: 0 auto; color: #666;">
                    <li>Pocos usuarios en la plataforma con intereses similares</li>
                    <li>Criterios de compatibilidad muy específicos</li>
                    <li>Necesitas completar tu cuestionario</li>
                </ul>
                <button onclick="window.location.reload()" 
                        style="margin-top: 30px; padding: 12px 24px; background: linear-gradient(45deg, #667eea, #764ba2); 
                               color: white; border: none; border-radius: 8px; cursor: pointer;">
                    Recargar matches
                </button>
            </div>
        `;
    }
    
    // Ocultar botones de acción
    const actionButtons = document.querySelector('.action-buttons');
    if (actionButtons) {
        actionButtons.style.display = 'none';
    }
}

// Mostrar mensaje de cuestionario incompleto
function displayIncompleteQuestionnaire() {
    const profileContent = document.querySelector('.profile-content');
    if (profileContent) {
        profileContent.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <div style="font-size: 3rem; margin-bottom: 20px;">📝</div>
                <h3 style="color: #333; margin-bottom: 20px;">Completa tu cuestionario</h3>
                <p style="color: #666; margin-bottom: 30px;">
                    Para encontrar matches perfectos, necesitas completar el cuestionario de compatibilidad.
                </p>
                <button onclick="window.location.href='questionnare.html'" 
                        style="padding: 15px 30px; background: linear-gradient(45deg, #667eea, #764ba2); 
                               color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1.1rem;">
                    Completar Cuestionario
                </button>
            </div>
        `;
    }
}

// Mostrar mensaje de no más matches
function displayNoMoreMatches() {
    const profileContent = document.querySelector('.profile-content');
    if (profileContent) {
        profileContent.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <div style="font-size: 3rem; margin-bottom: 20px;">🎉</div>
                <h3 style="color: #333; margin-bottom: 20px;">Has visto todos los matches disponibles</h3>
                <p style="color: #666; margin-bottom: 30px;">
                    Ya has revisado todas las personas compatibles. 
                    ¡Revisa tus conexiones o vuelve más tarde para ver nuevos matches!
                </p>
                <button onclick="toggleConnections()" 
                        style="padding: 15px 30px; background: linear-gradient(45deg, #667eea, #764ba2); 
                               color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1.1rem;">
                    Ver Mis Conexiones
                </button>
            </div>
        `;
    }
    
    // Ocultar botones de acción
    const actionButtons = document.querySelector('.action-buttons');
    if (actionButtons) {
        actionButtons.style.display = 'none';
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Botón de interés
    const interestedBtn = document.querySelector('.btn-interested');
    if (interestedBtn) {
        interestedBtn.addEventListener('click', handleInterested);
    }
    
    // Botón de no interés
    const notInterestedBtn = document.querySelector('.btn-not-interested');
    if (notInterestedBtn) {
        notInterestedBtn.addEventListener('click', handleNotInterested);
    }
}

// Manejar interés en un match
async function handleInterested(event) {
    if (currentMatchIndex >= currentMatches.length) return;
    
    const btn = event.currentTarget;
    const match = currentMatches[currentMatchIndex];
    
    try {
        btn.classList.add('btn-loading');
        btn.innerHTML = '💖 Procesando…';
        btn.disabled = true;
        
        console.log(`Marcando interés en match: ${match.id}`);
        
        const response = await api.showInterest(match.id);
        
        if (response.isMutualMatch) {
            // ¡Es un match mutuo!
            showSuccess('¡MATCH! 💖 ¡Es mutuo!');
            
            // Redirigir a la página de match después de un delay
            setTimeout(() => {
                window.location.href = `match.html?id=${match.id}`;
            }, 2000);
            
        } else {
            // Solo interés registrado
            showSuccess('¡Interés registrado! 👍');
            
            // Mostrar siguiente match
            currentMatchIndex++;
            setTimeout(() => {
                displayCurrentMatch();
            }, 1500);
        }
        
    } catch (error) {
        console.error('Error registrando interés:', error);
        showError('Error registrando interés: ' + error.message);
        
        btn.classList.remove('btn-loading');
        btn.innerHTML = '✅ Estoy interesado';
        btn.disabled = false;
    }
}

// Manejar no interés
async function handleNotInterested(event) {
    if (currentMatchIndex >= currentMatches.length) return;
    
    const btn = event.currentTarget;
    const match = currentMatches[currentMatchIndex];
    
    btn.classList.add('btn-loading');
    btn.innerHTML = '❌ Procesando…';
    btn.disabled = true;
    
    // Simular procesamiento
    setTimeout(() => {
        console.log(`No interés en match: ${match.id}`);
        showSuccess('Perfil descartado');
        
        // Mostrar siguiente match
        currentMatchIndex++;
        displayCurrentMatch();
    }, 1000);
}

// Cargar conexiones
async function loadConnections() {
    try {
        const response = await api.getMutualMatches();
        renderConnections(response.mutualMatches || []);
    } catch (error) {
        console.error('Error cargando conexiones:', error);
    }
}

// Renderizar conexiones
function renderConnections(connections) {
    const connectionsList = document.getElementById('connectionsList');
    if (!connectionsList) return;
    
    if (connections.length === 0) {
        connectionsList.innerHTML = `
            <div class="empty-connections">
                <div class="empty-connections-icon">💔</div>
                <div class="empty-connections-text">No tienes conexiones aún</div>
                <div class="empty-connections-subtext">¡Sigue explorando perfiles para encontrar tu match perfecto!</div>
            </div>
        `;
        return;
    }
    
    connectionsList.innerHTML = connections.map(connection => `
        <div class="connection-item" onclick="viewConnectionProfile('${connection.id}')">
            <div class="connection-avatar">${getAvatarByGender(connection.gender)}</div>
            <div class="connection-info">
                <div class="connection-name">${connection.name}</div>
                <div class="connection-details">${connection.age} años • ${connection.gender}</div>
                <div class="connection-university">${connection.university}</div>
            </div>
            <div class="connection-status status-match">
                🔗 Match
            </div>
        </div>
    `).join('');
}

// Ver perfil de conexión
function viewConnectionProfile(connectionId) {
    window.location.href = `match.html?id=${connectionId}`;
}

// Función para obtener avatar basado en género
function getAvatarByGender(gender) {
    if (gender && gender.toLowerCase().includes('mujer')) {
        return '👩';
    } else if (gender && gender.toLowerCase().includes('hombre')) {
        return '👨';
    } else {
        return '👤'; // Avatar genérico
    }
}

// Mostrar modal de conexiones
function toggleConnections() {
    const modal = document.getElementById('connectionsModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

// Cerrar modal de conexiones
function closeConnections() {
    const modal = document.getElementById('connectionsModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }
}

// Función de utilidad para mostrar elementos con animación
function fadeInElements() {
    document.querySelectorAll('.fade-in').forEach((el, i) => {
        el.style.animationDelay = `${i * 0.1}s`;
        el.classList.add('visible');
    });
}

// Inicializar animaciones
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(fadeInElements, 500);
});

// Función para recargar matches
async function reloadMatches() {
    currentMatchIndex = 0;
    await loadMatches();
}

// Exportar funciones para uso global
window.profileUtils = {
    toggleConnections,
    closeConnections,
    reloadMatches,
    viewConnectionProfile
};