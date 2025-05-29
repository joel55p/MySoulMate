// animación escalonada de aparición
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.fade-in').forEach((el, i) => {
        el.style.animationDelay = `${i * 0.1}s`;
    });
});

// botones de interés/no-interés
function handleInterested(event) {
    const btn = event.currentTarget;
    btn.classList.add('btn-loading');
    btn.innerHTML = '💖 Procesando…';
    setTimeout(() => {
        alert('¡Match potencial registrado!');
        btn.classList.remove('btn-loading');
        btn.innerHTML = '💖 Estoy interesado';
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