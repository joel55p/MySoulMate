const express = require('express');
const { body, validationResult } = require('express-validator');
const neo4jConnection = require('../config/neo4j');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Validaciones para el cuestionario
const questionnaireValidation = [
    body('music')
        .isArray({ min: 1, max: 3 })
        .withMessage('Debes seleccionar entre 1 y 3 géneros musicales'),
    
    body('entertainment')
        .isArray({ min: 1, max: 3 })
        .withMessage('Debes seleccionar entre 1 y 3 tipos de entretenimiento'),
    
    body('sports')
        .isArray({ min: 1, max: 4 })
        .withMessage('Debes seleccionar entre 1 y 4 actividades deportivas'),
    
    body('hobbies')
        .isArray({ min: 1, max: 4 })
        .withMessage('Debes seleccionar entre 1 y 4 hobbies'),
    
    body('relationship_values')
        .notEmpty()
        .withMessage('Debes seleccionar qué valoras en una relación'),
    
    body('weekend_preference')
        .notEmpty()
        .withMessage('Debes seleccionar tu preferencia de fin de semana'),
    
    body('conversation_style')
        .notEmpty()
        .withMessage('Debes seleccionar tu estilo de conversación'),
    
    body('social_life')
        .notEmpty()
        .withMessage('Debes describir tu vida social'),
    
    body('relationship_goal')
        .notEmpty()
        .withMessage('Debes especificar qué buscas en una relación')
];

// Guardar respuestas del cuestionario
router.post('/submit', authMiddleware, questionnaireValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Datos del cuestionario inválidos',
                details: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg
                }))
            });
        }

        const userId = req.userId;
        const answers = req.body;

        // Verificar que el usuario existe
        const user = await neo4jConnection.getUserById(userId);
        if (!user) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        // Guardar respuestas en Neo4j
        await neo4jConnection.saveQuestionnaire(userId, answers);

        res.json({
            message: 'Cuestionario guardado exitosamente',
            timestamp: new Date().toISOString()
        });

        console.log(`✅ Cuestionario completado por usuario: ${userId}`);

    } catch (error) {
        console.error('Error guardando cuestionario:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Obtener respuestas del cuestionario del usuario
router.get('/responses', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;

        const query = `
            MATCH (u:User {id: $userId})
            OPTIONAL MATCH (u)-[:HAS_PROFILE]->(p:Profile)
            OPTIONAL MATCH (u)-[:LIKES]->(i:Interest)
            RETURN u, p,
                   COLLECT({name: i.name, category: i.category}) as interests
        `;

        const result = await neo4jConnection.runQuery(query, { userId });

        if (result.records.length === 0) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        const record = result.records[0];
        const profile = record.get('p') ? record.get('p').properties : null;
        const interests = record.get('interests').filter(i => i.name);

        if (!profile) {
            return res.json({
                hasCompletedQuestionnaire: false,
                message: 'El usuario no ha completado el cuestionario'
            });
        }

        // Organizar intereses por categoría
        const organizedInterests = {
            music: interests.filter(i => i.category === 'music').map(i => i.name),
            entertainment: interests.filter(i => i.category === 'entertainment').map(i => i.name),
            sports: interests.filter(i => i.category === 'sports').map(i => i.name),
            hobbies: interests.filter(i => i.category === 'hobbies').map(i => i.name)
        };

        res.json({
            hasCompletedQuestionnaire: true,
            interests: organizedInterests,
            profile: {
                relationshipValues: profile.relationshipValues,
                weekendPreference: profile.weekendPreference,
                conversationStyle: profile.conversationStyle,
                socialLife: profile.socialLife,
                relationshipGoal: profile.relationshipGoal
            },
            completedAt: profile.completedAt,
            lastUpdated: profile.lastUpdated
        });

    } catch (error) {
        console.error('Error obteniendo respuestas del cuestionario:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
});

// Actualizar respuestas del cuestionario
router.put('/update', authMiddleware, questionnaireValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Datos del cuestionario inválidos',
                details: errors.array()
            });
        }

        const userId = req.userId;
        const answers = req.body;

        // Verificar que el usuario ya tiene un cuestionario
        const query = `
            MATCH (u:User {id: $userId})-[:HAS_PROFILE]->(p:Profile)
            RETURN p
        `;

        const result = await neo4jConnection.runQuery(query, { userId });

        if (result.records.length === 0) {
            return res.status(404).json({
                error: 'No se encontró un cuestionario previo para actualizar'
            });
        }

        // Primero, eliminar intereses existentes
        await neo4jConnection.runQuery(`
            MATCH (u:User {id: $userId})-[r:LIKES]->(i:Interest)
            DELETE r
        `, { userId });

        // Guardar nuevas respuestas
        await neo4jConnection.saveQuestionnaire(userId, answers);

        res.json({
            message: 'Cuestionario actualizado exitosamente',
            timestamp: new Date().toISOString()
        });

        console.log(`✅ Cuestionario actualizado por usuario: ${userId}`);

    } catch (error) {
        console.error('Error actualizando cuestionario:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;