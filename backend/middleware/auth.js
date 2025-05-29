const jwt = require('jsonwebtoken');
const neo4jConnection = require('../config/neo4j');

// Middleware para verificar JWT
const authMiddleware = async (req, res, next) => {
    try {
        // Obtener token del header
        const authHeader = req.header('Authorization');
        
        if (!authHeader) {
            return res.status(401).json({
                error: 'Token no proporcionado',
                message: 'Debes estar autenticado para acceder a este recurso'
            });
        }

        // Verificar formato: "Bearer TOKEN"
        const token = authHeader.startsWith('Bearer ') 
            ? authHeader.slice(7) 
            : authHeader;

        if (!token) {
            return res.status(401).json({
                error: 'Token inválido',
                message: 'Formato de token incorrecto'
            });
        }

        // Verificar y decodificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verificar que el usuario existe y está activo
        const user = await neo4jConnection.getUserById(decoded.userId);
        if (!user || !user.isActive) {
            return res.status(401).json({
                error: 'Usuario inválido',
                message: 'El usuario no existe o está desactivado'
            });
        }

        // Agregar información del usuario al request
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        req.user = user;

        next();

    } catch (error) {
        console.error('Error en authMiddleware:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Token inválido',
                message: 'El token proporcionado no es válido'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expirado',
                message: 'Tu sesión ha expirado, inicia sesión nuevamente'
            });
        }

        res.status(500).json({
            error: 'Error interno del servidor',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    authMiddleware
};