// Funciones para manejar los botones de navegación
function handleRegister() {
    animateButton(event.target);
    setTimeout(() => {
        alert('🎉 ¡Excelente elección!\n\nRedirigiendo a la página de registro...\n¡Pronto podrás encontrar tu alma gemela universitaria!');
        // Aquí puedes cambiar por la URL real de tu página de registro
        // window.location.href = 'register.html';
    }, 300);
}

function handleLogin() {
    animateButton(event.target);
    setTimeout(() => {
        alert('👋 ¡Bienvenido de vuelta!\n\nRedirigiendo a la página de inicio de sesión...\n¡Esperamos que encuentres a alguien especial hoy!');
        // Aquí puedes cambiar por la URL real de tu página de login
        // window.location.href = 'login.html';
    }, 300);
}

// Animación para los botones cuando se hace clic
function animateButton(button) {
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
        button.style.transform = '';
    }, 150);
}

// Función para volver al inicio cuando se hace clic en el logo
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Efectos de parallax en el scroll
function addScrollEffects() {
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('.main-content');
        
        parallaxElements.forEach(element => {
            const speed = 0.5;
            element.style.backgroundPositionY = -(scrolled * speed) + 'px';
        });
    });
}

// Animación de entrada escalonada para las tarjetas de características
function observeElements() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1
    });

    // Observa todas las tarjetas de características
    document.querySelectorAll('.feature-card').forEach(card => {
        observer.observe(card);
    });
}

// Efecto de typing/máquina de escribir en el título principal
function typeWriter() {
    const title = document.querySelector('.hero-title');
    const text = title.textContent;
    title.textContent = '';
    title.style.borderRight = '2px solid white';
    
    let i = 0;
    const timer = setInterval(() => {
        title.textContent += text.charAt(i);
        i++;
        if (i > text.length) {
            clearInterval(timer);
            title.style.borderRight = 'none';
        }
    }, 100);
}

// Función para crear efectos de partículas al hacer clic
function createClickEffect(e) {
    const colors = ['#667eea', '#764ba2', '#ff6b6b', '#4ecdc4'];
    
    for (let i = 0; i < 6; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.left = e.clientX + 'px';
        particle.style.top = e.clientY + 'px';
        particle.style.width = '6px';
        particle.style.height = '6px';
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        particle.style.borderRadius = '50%';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '1000';
        
        document.body.appendChild(particle);
        
        const angle = (Math.PI * 2 * i) / 6;
        const velocity = 100;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;
        
        let x = e.clientX;
        let y = e.clientY;
        let opacity = 1;
        
        const animate = () => {
            x += vx * 0.02;
            y += vy * 0.02;
            opacity -= 0.02;
            
            particle.style.left = x + 'px';
            particle.style.top = y + 'px';
            particle.style.opacity = opacity;
            
            if (opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                document.body.removeChild(particle);
            }
        };
        
        animate();
    }
}

// Función para agregar efectos interactivos adicionales
function addInteractiveEffects() {
    const logo = document.querySelector('.logo');
    
    // Efecto de partículas al hacer clic en el logo
    logo.addEventListener('click', (e) => {
        createClickEffect(e);
    });

    // Efecto hover mejorado en las tarjetas
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1)';
        });
    });
}

// Smooth scroll para navegación interna
function addSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Función para agregar efectos de carga progresiva
function addProgressiveLoading() {
    // Simula la carga de contenido con retraso
    const elementsToLoad = document.querySelectorAll('.feature-card, .cta-section');
    
    elementsToLoad.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            element.style.transition = 'all 0.8s ease-out';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, 200 + (index * 150));
    });
}

// Función para detectar si el usuario está en dispositivo móvil
function isMobileDevice() {
    return window.innerWidth <= 768;
}

// Función para optimizar rendimiento en móviles
function optimizeForMobile() {
    if (isMobileDevice()) {
        // Reduce las animaciones en móviles para mejor rendimiento
        const style = document.createElement('style');
        style.textContent = `
            .feature-card:hover {
                transform: translateY(-5px) !important;
            }
            .logo {
                animation: none !important;
            }
        `;
        document.head.appendChild(style);
    }
}

// Función de inicialización principal
function initializeApp() {
    // Agregar todos los efectos y funcionalidades
    addScrollEffects();
    observeElements();
    addInteractiveEffects();
    addSmoothScroll();
    addProgressiveLoading();
    optimizeForMobile();
    
    // Mensaje de bienvenida en consola (opcional)
    console.log('🎉 My Soulmate App - Desarrollado por Claude');
    console.log('💕 ¡Encuentra tu alma gemela universitaria!');
}

// Event listener para cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    
    // Opcional: Activar efecto de typing después de un breve delay
    // setTimeout(() => {
    //     typeWriter();
    // }, 1000);
});

// Event listener para cambios en el tamaño de ventana
window.addEventListener('resize', () => {
    optimizeForMobile();
});

// Funciones adicionales para futuras características

// Función para cambiar tema (día/noche) - para futuras implementaciones
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
}

// Función para guardar preferencias del usuario
function saveUserPreferences(preferences) {
    localStorage.setItem('userPreferences', JSON.stringify(preferences));
}

// Función para cargar preferencias del usuario
function loadUserPreferences() {
    const preferences = localStorage.getItem('userPreferences');
    return preferences ? JSON.parse(preferences) : null;
}

// Función para mostrar notificaciones toast (para futuras implementaciones)
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        border-radius: 5px;
        z-index: 10000;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
}