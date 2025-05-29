document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.fade-in').forEach((el, i) => {
        el.style.animationDelay = `${(i * 0.1) + 0.4}s`;
    });
    
    // Cargar datos del match
    loadMatchData();
    
    // Efecto de confeti 
    setTimeout(showConfetti, 1000);
});

// Función para cargar los datos del match
function loadMatchData() {
    // TODO: AQUÍ SE DEBE HACER LA CONSULTA A LA BASE DE DATOS
    // Consulta SQL sugerida:
    // SELECT u.id, u.name, u.age, u.gender, u.instagram_handle,
    //        p.musical_genre, p.entertainment, p.physical_activities, 
    //        p.hobbies, p.relationship_values, p.ideal_weekend,
    //        p.conversation_style, p.social_life, p.relationship_goals
    // FROM users u 
    // JOIN user_profiles p ON u.id = p.user_id
    // WHERE u.id = [MATCH_USER_ID]
    
    // Datos de ejemplo quemados
    const matchData = {
        id: 1,
        name: "María González",
        age: 23,
        gender: "Mujer",
        avatar: "👩",
        instagramHandle: "@maria_gonzalez23",
        profile: {
            musicalGenre: "Pop Latino, Reggaeton, Balada",
            entertainment: "Películas románticas, Series de drama, Reality shows",
            physicalActivities: "Bailar, Pilates, Caminatas",
            hobbies: "Pintura, Jardinería, Escribir, Moda",
            relationshipValues: "Honestidad, Respeto, Diversión compartida",
            idealWeekend: "Brunch con amigas, ir de compras, película en casa",
            conversationStyle: "Historias divertidas, Sueños y metas, Consejos de vida",
            socialLife: "Muy sociable, le gusta conocer gente nueva",
            relationshipGoals: "Compañía especial, Aventuras juntos, Amor verdadero"
        }
    };
    
    // Actualizar elementos del DOM con los datos del match
    updateMatchProfile(matchData);
}

// Función para actualizar el perfil del match en el DOM
function updateMatchProfile(matchData) {
    // Actualizar información básica
    document.getElementById('matchName').textContent = matchData.name;
    document.getElementById('matchAge').textContent = `${matchData.age} años`;
    document.getElementById('matchGender').textContent = matchData.gender;
    
    // Actualizar avatar si es necesario
    const avatar = document.querySelector('.profile-avatar');
    avatar.textContent = matchData.avatar;
    
    // Actualizar atributos del perfil
    document.getElementById('musicalGenre').textContent = matchData.profile.musicalGenre;
    document.getElementById('entertainment').textContent = matchData.profile.entertainment;
    document.getElementById('physicalActivities').textContent = matchData.profile.physicalActivities;
    document.getElementById('hobbies').textContent = matchData.profile.hobbies;
    document.getElementById('relationshipValues').textContent = matchData.profile.relationshipValues;
    document.getElementById('idealWeekend').textContent = matchData.profile.idealWeekend;
    document.getElementById('conversationStyle').textContent = matchData.profile.conversationStyle;
    document.getElementById('socialLife').textContent = matchData.profile.socialLife;
    document.getElementById('relationshipGoals').textContent = matchData.profile.relationshipGoals;
    
    // Actualizar información de Instagram
    document.getElementById('instagramName').textContent = matchData.name.split(' ')[0];
    const instagramLink = document.getElementById('instagramHandle');
    instagramLink.textContent = matchData.instagramHandle;
    instagramLink.href = `https://instagram.com/${matchData.instagramHandle.replace('@', '')}`;
    instagramLink.target = '_blank';
}

// Efecto de confeti (simulado con emojis)
function showConfetti() {
    const confettiEmojis = ['🎉', '💖', '🎊', '✨', '💕', '🌟'];
    const container = document.body;
    
    for (let i = 0; i < 15; i++) {
        setTimeout(() => {
            createConfettiPiece(container, confettiEmojis);
        }, i * 100);
    }
}

// Crear una pieza de confeti
function createConfettiPiece(container, emojis) {
    const confetti = document.createElement('div');
    confetti.style.position = 'fixed';
    confetti.style.top = '-50px';
    confetti.style.left = Math.random() * window.innerWidth + 'px';
    confetti.style.fontSize = '2rem';
    confetti.style.pointerEvents = 'none';
    confetti.style.zIndex = '9999';
    confetti.style.animation = 'confettiFall 3s linear forwards';
    confetti.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    
    if (!document.getElementById('confetti-style')) {
        const style = document.createElement('style');
        style.id = 'confetti-style';
        style.textContent = `
            @keyframes confettiFall {
                to {
                    transform: translateY(${window.innerHeight + 100}px) rotate(720deg);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    container.appendChild(confetti);
    
    setTimeout(() => confetti.remove(), 3000);
}

// Efecto hover 
document.querySelectorAll('.attribute-section').forEach(section => {
    section.addEventListener('mouseenter', () => {
        section.style.borderColor = '#667eea';
    });
    
    section.addEventListener('mouseleave', () => {
        section.style.borderColor = '#e9ecef';
    });
});

// Función para obtener parámetros de la URL (para futuro uso)
function getURLParameter(name) {
    // TODO: Usar esto para obtener el ID del match desde la URL
    // Ejemplo de uso: const matchId = getURLParameter('id');
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}