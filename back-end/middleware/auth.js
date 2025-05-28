const jwt = require('jsonwebtoken');
const { runQuery } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'mysoulmate_secret_key_2024';

// Middleware principal de autenticación
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Token de acceso requerido',
        details: 'Debes estar autenticado para acceder a este recurso'
      });
    }

    // Verificar y decodificar el token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verificar que el usuario aún existe y está activo
    const userQuery = `
      MATCH (u:User {id: $userId, isActive: true})
      RETURN u
    `;

    const result = await runQuery(userQuery, { userId: decoded.userId });
    
    if (result.records.length === 0) {
      return res.status(401).json({ 
        error: 'Usuario no válido',
        details: 'Tu sesión ha expirado o tu cuenta ha sido desactivada'
      });
    }

    // Agregar información del usuario al request
    req.user = {
      userId: decoded.userId,
      userData: result.records[0].get('u').properties
    };

    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Token inválido',
        details: 'El token de acceso no es válido'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado',
        details: 'Tu sesión ha expirado, por favor inicia sesión nuevamente'
      });
    }

    console.error('Error en middleware de auth:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: 'No se pudo verificar la autenticación'
    });
  }
};

// Middleware para verificar que el perfil esté completo
const requireCompleteProfile = (req, res, next) => {
  try {
    const userData = req.user.userData;

    if (!userData.profileComplete) {
      return res.status(403).json({ 
        error: 'Perfil incompleto',
        details: 'Debes completar tu perfil antes de acceder a esta funcionalidad',
        nextStep: 'questionnaire'
      });
    }

    next();

  } catch (error) {
    console.error('Error verificando perfil completo:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor'
    });
  }
};

// Middleware para verificar email universitario
const requireUniversityEmail = (req, res, next) => {
  try {
    const userData = req.user.userData;

    if (!userData.emailVerified) {
      return res.status(403).json({ 
        error: 'Email no verificado',
        details: 'Debes verificar tu email universitario para continuar',
        nextStep: 'email_verification'
      });
    }

    next();

  } catch (error) {
    console.error('Error verificando email:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor'
    });
  }
};

// Middleware opcional para autenticación (no falla si no hay token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    const userQuery = `
      MATCH (u:User {id: $userId, isActive: true})
      RETURN u
    `;

    const result = await runQuery(userQuery, { userId: decoded.userId });
    
    if (result.records.length > 0) {
      req.user = {
        userId: decoded.userId,
        userData: result.records[0].get('u').properties
      };
    } else {
      req.user = null;
    }

    next();

  } catch (error) {
    // En caso de error, simplemente continúa sin usuario
    req.user = null;
    next();
  }
};

// Middleware para verificar roles específicos (futuro uso)
const requireRole = (roles) => {
  return (req, res, next) => {
    try {
      const userData = req.user.userData;

      if (!userData.role || !roles.includes(userData.role)) {
        return res.status(403).json({ 
          error: 'Permisos insuficientes',
          details: 'No tienes los permisos necesarios para acceder a este recurso'
        });
      }

      next();

    } catch (error) {
      console.error('Error verificando roles:', error);
      return res.status(500).json({ 
        error: 'Error interno del servidor'
      });
    }
  };
};

// Middleware para verificar límites de uso por usuario
const checkUserLimits = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Verificar límites diarios (ejemplo: máximo 50 likes por día)
    const dailyLikesQuery = `
      MATCH (u:User {id: $userId})-[r:LIKES_USER]->(target:User)
      WHERE date(r.createdAt) = date($today)
      RETURN count(r) as dailyLikes
    `;

    const result = await runQuery(dailyLikesQuery, { userId, today });
    const dailyLikes = result.records[0].get('dailyLikes').toNumber();

    if (dailyLikes >= 50) {
      return res.status(429).json({ 
        error: 'Límite diario alcanzado',
        details: 'Has alcanzado el límite de 50 interacciones por día',
        resetTime: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
      });
    }

    // Agregar información de límites al request
    req.userLimits = {
      dailyLikes,
      remainingLikes: 50 - dailyLikes
    };

    next();

  } catch (error) {
    console.error('Error verificando límites de usuario:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor'
    });
  }
};

// Middleware para logging de actividad del usuario
const logUserActivity = (action) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      
      if (userId) {
        // Log de actividad (esto podría ir a una base de datos de logs separada)
        const logQuery = `
          MATCH (u:User {id: $userId})
          CREATE (u)-[:PERFORMED_ACTION {
            action: $action,
            timestamp: datetime(),
            ip: $ip,
            userAgent: $userAgent,
            endpoint: $endpoint
          }]->(:ActivityLog)
        `;

        // Ejecutar de forma asíncrona sin bloquear
        runQuery(logQuery, {
          userId,
          action,
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent') || 'Unknown',
          endpoint: `${req.method} ${req.originalUrl}`
        }).catch(err => {
          console.error('Error logging user activity:', err);
        });
      }

      next();

    } catch (error) {
      // No fallar por errores de logging
      console.error('Error en logging middleware:', error);
      next();
    }
  };
};

// Middleware para validar la estructura del cuerpo de la petición
const validateRequestBody = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body, { 
        abortEarly: false,
        stripUnknown: true 
      });

      if (error) {
        const errorDetails = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context.value
        }));

        return res.status(400).json({
          error: 'Datos de entrada inválidos',
          details: errorDetails
        });
      }

      // Reemplazar req.body con los datos validados y limpiados
      req.body = value;
      next();

    } catch (error) {
      console.error('Error en validación:', error);
      return res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  };
};

// Middleware para verificar si el usuario puede acceder a un recurso específico
const canAccessResource = (resourceType) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const resourceId = req.params.id || req.params.userId;

      // Verificaciones específicas según el tipo de recurso
      switch (resourceType) {
        case 'own_profile':
          if (userId !== resourceId) {
            return res.status(403).json({
              error: 'Acceso denegado',
              details: 'Solo puedes acceder a tu propio perfil'
            });
          }
          break;

        case 'conversation':
          // Verificar si el usuario es parte de la conversación
          const conversationQuery = `
            MATCH (u:User {id: $userId})-[:PARTICIPATES_IN]->(c:Conversation {id: $conversationId})
            RETURN c
          `;
          const convResult = await runQuery(conversationQuery, { 
            userId, 
            conversationId: resourceId 
          });
          
          if (convResult.records.length === 0) {
            return res.status(403).json({
              error: 'Acceso denegado',
              details: 'No tienes permisos para acceder a esta conversación'
            });
          }
          break;

        case 'match':
          // Verificar si el usuario es parte del match
          const matchQuery = `
            MATCH (u:User {id: $userId})-[:MATCHED_WITH]-(m:Match {id: $matchId})
            RETURN m
          `;
          const matchResult = await runQuery(matchQuery, { 
            userId, 
            matchId: resourceId 
          });
          
          if (matchResult.records.length === 0) {
            return res.status(403).json({
              error: 'Acceso denegado',
              details: 'No tienes permisos para acceder a este match'
            });
          }
          break;

        default:
          break;
      }

      next();

    } catch (error) {
      console.error('Error verificando acceso a recurso:', error);
      return res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  };
};

module.exports = {
  authenticateToken,
  requireCompleteProfile,
  requireUniversityEmail,
  optionalAuth,
  requireRole,
  checkUserLimits,
  logUserActivity,
  validateRequestBody,
  canAccessResource
};