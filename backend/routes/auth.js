const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

const neo4jConnection = require('../config/neo4j');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Validaciones para registro
const registerValidation = [
    body('name')
        .isLength({ min: 2, max: 50 })
        .withMessage('El nombre debe tener entre 2 y 50 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .withMessage('El nombre solo puede contener letras y espacios'),
    
    body('email')
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail()
        .custom(async (email) => {
            // Verificar que sea email universitario
            const validDomains = ['uvg.edu.gt', 'url.edu.gt', 'unis.edu.gt', 'ufm.edu', 'usac.edu.gt'];
            const domain = email.split('@')[1];
            
            const isValidUniversity = validDomains.some(validDomain => 
                domain === validDomain || domain.endsWith('.' + validDomain)
            );
            
            if (!isValidUniversity) {
                throw new Error('Debes usar tu email universitario oficial');
            }
            
            // Verificar que el email no exista
            const exists = await neo4jConnection.userExists(email);
            if (exists) {
                throw new Error('Este email ya está registrado');
            }
        }),
    
    body('age')
        .isInt({ min: 18, max: 35 })
        .withMessage('La edad debe estar entre 18 y 35 años'),
    
    body('gender')
        .isIn(['Hombre', 'Mujer'])
        .withMessage('Género inválido'),
    
    body('university')
        .notEmpty()
        .withMessage('Selecciona tu universidad'),
    
    body('password')
        .isLength({ min: 8 })
        .withMessage('La contraseña debe tener al menos 8 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('La contraseña debe contener al menos: 1 minúscula, 1 mayúscula, 1 número y 1 símbolo'),
    
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Las contraseñas no coinciden');
            }
            return true;
        }),
    
    body('instagram')
        .optional()
        .matches(/^[a-zA-Z0-9._]{1,30}$/)
        .withMessage('Usuario de Instagram inválido'),
    
    body('acceptTerms')
        .equals('true')
        .withMessage('Debes aceptar los términos y condiciones'),
    
    body('acceptAge')
        .equals('true')
        .withMessage('Debes confirmar que eres mayor de edad')
];

// Validaciones para login
const loginValidation = [
    body('email')
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail(),
    
    body('password')
        .notEmpty()
        .withMessage('La contraseña es requerida')
];

// Ruta de registro
router.post('/register', registerValidation, async (req, res) => {
    try {
        // Verificar errores de validación
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Datos inválidos',
                details: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg
                }))
            });
        }

        const {
            name,
            email,
            age,
            gender,
            university,
            career,
            semester,
            instagram,
            password
        } = req.body;

        // Hashear contraseña
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Crear usuario en Neo4j
        const userId = uuidv4();
        const userData = {
            id: userId,
            name: name.trim(),
            email: email.toLowerCase(),
            password: hashedPassword,
            age: parseInt(age),
            gender,
            university,
            career: career || '',
            semester: semester || '',
            instagram: instagram || ''
        };

        const user = await neo4jConnection.createUser(userData);

        // Generar JWT
        const token = jwt.sign(
            { 
                userId: user.id,
                email: user.email 
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Respuesta sin contraseña
        const { password: _, ...userResponse } = user;

        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            token,
            user: userResponse
        });

        console.log(`✅ Usuario registrado: ${email}`);

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Ruta de login
router.post('/login', loginValidation, async (req, res) => {
    try {
        // Verificar errores de validación
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Datos inválidos',
                details: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg
                }))
            });
        }

        const { email, password } = req.body;

        // Buscar usuario
        const user = await neo4jConnection.getUserByEmail(email.toLowerCase());
        if (!user) {
            return res.status(401).json({
                error: 'Credenciales inválidas',
                message: 'Email o contraseña incorrectos'
            });
        }

        // Verificar contraseña
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Credenciales inválidas',
                message: 'Email o contraseña incorrectos'
            });
        }

        // Verificar que la cuenta esté activa
        if (!user.isActive) {
            return res.status(401).json({
                error: 'Cuenta desactivada',
                message: 'Tu cuenta ha sido desactivada. Contacta soporte.'
            });
        }

        // Generar JWT
        const token = jwt.sign(
            { 
                userId: user.id,
                email: user.email 
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Respuesta sin contraseña
        const { password: _, ...userResponse } = user;

        res.json({
            message: 'Login exitoso',
            token,
            user: userResponse
        });

        console.log(`✅ Login exitoso: ${email}`);

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Ruta para verificar token
router.get('/verify', authMiddleware, async (req, res) => {
    try {
        // Si llegamos aquí, el token es válido (verificado por authMiddleware)
        const user = await neo4jConnection.getUserById(req.userId);
        
        if (!user) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        const { password: _, ...userResponse } = user;

        res.json({
            message: 'Token válido',
            user: userResponse
        });

    } catch (error) {
        console.error('Error verificando token:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
});

// Ruta para logout (opcional, para invalidar token del lado cliente)
router.post('/logout', authMiddleware, (req, res) => {
    // En un sistema stateless con JWT, el logout es principalmente del lado cliente
    // Aquí podrías implementar una blacklist de tokens si fuera necesario
    
    res.json({
        message: 'Logout exitoso'
    });
});

// Ruta para cambiar contraseña
router.put('/change-password', authMiddleware, [
    body('currentPassword')
        .notEmpty()
        .withMessage('La contraseña actual es requerida'),
    
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('La nueva contraseña debe tener al menos 8 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('La nueva contraseña debe contener al menos: 1 minúscula, 1 mayúscula, 1 número y 1 símbolo'),
    
    body('confirmNewPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Las contraseñas no coinciden');
            }
            return true;
        })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Datos inválidos',
                details: errors.array()
            });
        }

        const { currentPassword, newPassword } = req.body;
        const userId = req.userId;

        // Obtener usuario actual
        const user = await neo4jConnection.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Verificar contraseña actual
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Contraseña actual incorrecta'
            });
        }

        // Hashear nueva contraseña
        const hashedNewPassword = await bcrypt.hash(newPassword, 12);

        // Actualizar contraseña en Neo4j
        await neo4jConnection.runQuery(`
            MATCH (u:User {id: $userId})
            SET u.password = $newPassword, u.lastPasswordChange = datetime()
            RETURN u
        `, { userId, newPassword: hashedNewPassword });

        res.json({
            message: 'Contraseña cambiada exitosamente'
        });

    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;