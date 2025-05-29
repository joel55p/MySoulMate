const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 5000;

// Middleware básico
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../front-end')));

// Array simple para simular base de datos (temporal)
let users = [];

// Ruta de registro
app.post('/api/auth/register', (req, res) => {
    console.log('📝 Registro recibido:', req.body);
    
    const { name, email, password } = req.body;
    
    // Validación básica
    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            error: 'Todos los campos son requeridos'
        });
    }
    
    // Verificar si el usuario ya existe
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        return res.status(409).json({
            success: false,
            error: 'El usuario ya existe'
        });
    }
    
    // Crear usuario
    const newUser = {
        id: users.length + 1,
        name,
        email,
        password, // En producción esto debe estar hasheado
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    
    console.log('✅ Usuario creado:', { id: newUser.id, name, email });
    
    res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email
        }
    });
});

// Ruta de login
app.post('/api/auth/login', (req, res) => {
    console.log('🔐 Login recibido:', req.body);
    
    const { email, password } = req.body;
    
    // Validación básica
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            error: 'Email y contraseña son requeridos'
        });
    }
    
    // Buscar usuario
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
        return res.status(401).json({
            success: false,
            error: 'Credenciales inválidas'
        });
    }
    
    console.log('✅ Login exitoso:', { id: user.id, email });
    
    res.json({
        success: true,
        message: 'Login exitoso',
        user: {
            id: user.id,
            name: user.name,
            email: user.email
        },
        redirectTo: '/questionnaire.html'
    });
});

// Ruta para ver todos los usuarios (para debug)
app.get('/api/users', (req, res) => {
    res.json({
        success: true,
        users: users.map(u => ({ id: u.id, name: u.name, email: u.email }))
    });
});

// Servir archivos del frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../front-end/index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log('🚀 Servidor MySoulMate iniciado');
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api`);
    console.log('💖 ¡Listo para conectar corazones!');
});