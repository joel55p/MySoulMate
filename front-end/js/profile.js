// animación escalonada de aparición
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.fade-in').forEach((el, i) => {
        el.style.animationDelay = `${i * 0.1}s`;
    });
    
    // Cargar conexiones al inicializar la página
    loadConnections();
});

// botones de interés/no-interés
function handleInterested(event) {
    const btn = event.currentTarget;
    btn.classList.add('btn-loading');
    btn.innerHTML = '💖 Procesando…';
    setTimeout(() => {
        alert('¡Match potencial registrado!');
        btn.classList.remove('btn-loading');
        btn.innerHTML = '✅ Estoy interesado';
        
        // Recargar conexiones después de mostrar interés
        loadConnections();
    }, 1500);
}

function handleNotInterested(event) {
    const btn = event.currentTarget;
    btn.classList.add('btn-loading');
    btn.innerHTML = '❌ Procesando…';
    setTimeout(() => {
        alert('Perfil descartado, mostrando siguiente…');
        btn.classList.remove('btn-loading');
        btn.innerHTML = '❌ No estoy interesado';
    }, 1000);
}

// efecto hover en las secciones
document.querySelectorAll('.attribute-section').forEach(sec => {
    sec.addEventListener('mouseenter', () => sec.style.borderColor = '#667eea');
    sec.addEventListener('mouseleave', () => sec.style.borderColor = '#e9ecef');
});

// === FUNCIONES DE CONEXIONES ===

// Mostrar modal de conexiones
function toggleConnections() {
    const modal = document.getElementById('connectionsModal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Cerrar modal de conexiones
function closeConnections() {
    const modal = document.getElementById('connectionsModal');
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
}

// Cargar lista de conexiones
function loadConnections() {
    // TODO: AQUÍ SE DEBE HACER LA CONSULTA A LA BASE DE DATOS
    // Consulta SQL sugerida:
    // SELECT u.id, u.name, u.age, u.gender, m.match_percentage, m.status, m.created_at
    // FROM matches m 
    // JOIN users u ON (u.id = m.user2_id OR u.id = m.user1_id) 
    // WHERE (m.user1_id = [CURRENT_USER_ID] OR m.user2_id = [CURRENT_USER_ID])
    // AND u.id != [CURRENT_USER_ID]
    // AND m.status IN ('match', 'pending')
    // ORDER BY m.created_at DESC
    
    // Datos de ejemplo - REEMPLAZAR con datos reales de la BD
    const mockConnections = [
        {
            id: 1,
            name: "María González",
            age: 23,
            gender: "Mujer",
            matchPercentage: 92,
            status: "match",
            avatar: "👩",
            createdAt: "2024-01-15"
        },
        {
            id: 2,
            name: "Andrea López",
            age: 21,
            gender: "Mujer", 
            matchPercentage: 88,
            status: "match",
            avatar: "👱‍♀️",
            createdAt: "2024-01-14"
        },
        {
            id: 3,
            name: "Sofia Martínez",
            age: 25,
            gender: "Mujer",
            matchPercentage: 85,
            status: "pending",
            avatar: "👸",
            createdAt: "2024-01-13"
        }
    ];
    
    renderConnections(mockConnections);
}

// Renderizar lista de conexiones
function renderConnections(connections) {
    const connectionsList = document.getElementById('connectionsList');
    
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
        <div class="connection-item" onclick="viewConnectionProfile(${connection.id})">
            <div class="connection-avatar">${connection.avatar}</div>
            <div class="connection-info">
                <div class="connection-name">${connection.name}</div>
                <div class="connection-details">${connection.age} años • ${connection.gender}</div>
            </div>
            <div class="connection-status ${connection.status === 'match' ? 'status-match' : 'status-pending'}">
                ${connection.status === 'match' ? ' 🔗 Match' : '⏳ Pendiente'}
            </div>
        </div>
    `).join('');
}

// Ver perfil de una conexión
function viewConnectionProfile(connectionId) {
    // TODO: AQUÍ SE DEBE HACER LA CONSULTA PARA OBTENER EL PERFIL COMPLETO
    // Consulta SQL sugerida:
    // SELECT * FROM users WHERE id = [connectionId]
    
    console.log(`Ver perfil de conexión ID: ${connectionId}`);
    // Redirigir a la página de perfil de la conexión
    // window.location.href = `profile.html?id=${connectionId}`;
    
    // Por ahora solo mostrar alerta
    alert(`Viendo perfil de conexión ID: ${connectionId}`);
}