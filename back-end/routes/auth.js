const express = require('express');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const authController = require('../controllers/authController');
const { 
  authenticateToken, 
  validateRequestBody,
  logUserActivity 
} = require('../middleware/auth');

const router = express.Router();

// Rate limiting específico para auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos por IP
  message: {
    error: 'Demasiados intentos de autenticación',
    details: 'Has excedido el límite de intentos. Intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // máximo 3 registros por IP por hora
  message: {
    error: 'Demasiados registros',
    details: 'Has excedido el límite de registros por hora. Intenta más tarde.'
  }
});

// Esquemas de validación con Joi
const registerSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .required()
    .messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 50 caracteres',
      'string.pattern.base': 'El nombre solo puede contener letras y espacios',
      'any.required': 'El nombre es obligatorio'
    }),
  
  email: Joi.string()
    .email()
    .max(100)
    .lowercase()
    .required()
    .messages({
      'string.email': 'Debe ser un email válido',
      'string.max': 'El email no puede exceder 100 caracteres',
      'any.required': 'El email es obligatorio'
    }),
  
  password: Joi.string()
    .min(8)
    .max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'La contraseña debe tener al menos 8 caracteres',
      'string.max': 'La contraseña no puede exceder 100 caracteres',
      'string.pattern.base': 'La contraseña debe contener al menos: 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial',
      'any.required': 'La contraseña es obligatoria'
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Las contraseñas no coinciden',
      'any.required': 'Confirmar contraseña es obligatorio'
    }),
  
  age: Joi.number()
    .integer()
    .min(18)
    .max(35)
    .required()
    .messages({
      'number.min': 'Debes tener al menos 18 años',
      'number.max': 'Debes tener máximo 35 años',
      'any.required': 'La edad es obligatoria'
    }),
  
  university: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.min': 'El nombre de la universidad debe tener al menos 3 caracteres',
      'string.max': 'El nombre de la universidad no puede exceder 100 caracteres',
      'any.required': 'La universidad es obligatoria'
    }),
  
  career: Joi.string()
    .max(100)
    .optional()
    .allow(''),
  
  semester: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .optional()
});

const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Debe ser un email válido',
      'any.required': 'El email es obligatorio'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'La contraseña es obligatoria'
    })
});

const updateProfileSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .optional(),
  
  age: Joi.number()
    .integer()
    .min(18)
    .max(35)
    .optional(),
  
  university: Joi.string()
    .min(3)
    .max(100)
    .optional(),
  
  career: Joi.string()
    .max(100)
    .optional()
    .allow(''),
  
  semester: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .optional(),
  
  description: Joi.string()
    .max(500)
    .optional()
    .allow(''),
  
  interests: Joi.array()
    .items(Joi.string().max(50))
    .max(20)
    .optional(),
  
  showPhoto: Joi.boolean()
    .optional()
});

const questionnaireSchema = Joi.object({
  interests: Joi.array()
    .items(Joi.object({
      name: Joi.string().required(),
      category: Joi.string().optional(),
      rating: Joi.number().min(1).max(10).optional(),
      intensity: Joi.string().valid('low', 'medium', 'high').optional()
    }))
    .min(1)
    .max(20)
    .required()
    .messages({
      'array.min': 'Debes seleccionar al menos un interés',
      'array.max': 'Máximo 20 intereses permitidos'
    }),
  
  personalityTraits: Joi.object({
    extroversion: Joi.number().min(1).max(10).optional(),
    agreeableness: Joi.number().min(1).max(10).optional(),
    conscientiousness: Joi.number().min(1).max(10).optional(),
    neuroticism: Joi.number().min(1).max(10).optional(),
    openness: Joi.number().min(1).max(10).optional()
  }).optional(),
  
  preferences: Joi.object({
    ageRange: Joi.object({
      min: Joi.number().min(18).max(35),
      max: Joi.number().min(18).max(35)
    }).optional(),
    maxDistance: Joi.number().min(1).max(100).optional(),
    lookingFor: Joi.string().valid('friendship', 'dating', 'serious', 'any').optional()
  }).optional()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'La contraseña actual es obligatoria'
    }),
  
  newPassword: Joi.string()
    .min(8)
    .max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'La nueva contraseña debe tener al menos 8 caracteres',
      'string.pattern.base': 'La nueva contraseña debe contener al menos: 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial',
      'any.required': 'La nueva contraseña es obligatoria'
    }),
  
  confirmNewPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Las contraseñas nuevas no coinciden',
      'any.required': 'Confirmar nueva contraseña es obligatorio'
    })
});

const deleteAccountSchema = Joi.object({
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'La contraseña es obligatoria para eliminar la cuenta'
    }),
  
  confirmDeletion: Joi.string()
    .valid('DELETE_MY_ACCOUNT')
    .required()
    .messages({
      'any.only': 'Debes escribir exactamente "DELETE_MY_ACCOUNT" para confirmar',
      'any.required': 'La confirmación es obligatoria'
    })
});

// RUTAS PÚBLICAS (no requieren autenticación)

// POST /api/auth/register - Registrar nuevo usuario
router.post('/register', 
  registerLimiter,
  validateRequestBody(registerSchema),
  logUserActivity('register_attempt'),
  authController.register
);

// POST /api/auth/login - Iniciar sesión
router.post('/login', 
  authLimiter,
  validateRequestBody(loginSchema),
  logUserActivity('login_attempt'),
  authController.login
);

// RUTAS PROTEGIDAS (requieren autenticación)

// GET /api/auth/profile - Obtener perfil del usuario autenticado
router.get('/profile', 
  authenticateToken,
  logUserActivity('view_profile'),
  authController.getProfile
);

// PUT /api/auth/profile - Actualizar perfil del usuario
router.put('/profile', 
  authenticateToken,
  validateRequestBody(updateProfileSchema),
  logUserActivity('update_profile'),
  authController.updateProfile
);

// POST /api/auth/questionnaire - Completar cuestionario inicial
router.post('/questionnaire', 
  authenticateToken,
  validateRequestBody(questionnaireSchema),
  logUserActivity('complete_questionnaire'),
  authController.completeQuestionnaire
);

// PUT /api/auth/change-password - Cambiar contraseña
router.put('/change-password', 
  authenticateToken,
  authLimiter,
  validateRequestBody(changePasswordSchema),
  logUserActivity('change_password'),
  authController.changePassword
);

// POST /api/auth/logout - Cerrar sesión
router.post('/logout', 
  authenticateToken,
  logUserActivity('logout'),
  authController.logout
);

// DELETE /api/auth/account - Eliminar cuenta
router.delete('/account', 
  authenticateToken,
  authLimiter,
  validateRequestBody(deleteAccountSchema),
  logUserActivity('delete_account'),
  authController.deleteAccount
);

// GET /api/auth/verify-token - Verificar si el token es válido
router.get('/verify-token', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Token válido',
    user: {
      id: req.user.userId,
      name: req.user.userData.name,
      email: req.user.userData.email,
      profileComplete: req.user.userData.profileComplete
    }
  });
});

// Middleware de manejo de errores específico para auth
router.use((err, req, res, next) => {
  console.error('Error en rutas de auth:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Datos inválidos',
      details: err.message
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token inválido',
      details: 'El token de autenticación no es válido'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expirado',
      details: 'Tu sesión ha expirado, inicia sesión nuevamente'
    });
  }

  res.status(500).json({
    error: 'Error interno del servidor',
    details: 'Ha ocurrido un error inesperado'
  });
});

module.exports = router;