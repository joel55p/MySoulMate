const express = require('express');
const { body, validationResult } = require('express-validator');
const neo4jConnection = require('../config/neo4j');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Obtener perfil del usuario actual
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;

        // Consulta para obtener usuario con sus intereses y perfil
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
        const user = record.get('u').properties;
        const profile = record.get('p') ? record.get('p').properties : null;
        const interests = record.get('interests').filter(i => i.name); // Filtrar vacíos

        // Organizar intereses por categoría
        const organizedInterests = {
            music: interests.filter(i => i.category === 'music').map(i => i.name),
            entertainment: interests.filter(i => i.category === 'entertainment').map(i => i.name),
            sports: interests.filter(i => i.category === 'sports').map(i => i.name),
            hobbies: interests.filter(i => i.category === 'hobbies').map(i => i.name)
        };

        // Remover contraseña de la respuesta
        const { password, ...userWithoutPassword } = user;

        res.json({
            user: userWithoutPassword,
            profile: profile,
            interests: organizedInterests,
            hasCompletedQuestionnaire: profile ? true : false
        });

    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
});

// Actualizar información básica del usuario
router.put('/profile', authMiddleware, [
    body('name')
        .optional()
        .isLength({ min: 2, max: 50 })
        .withMessage('El nombre debe tener entre 2 y 50 caracteres'),
    
    body('career')
        .optional()
        .isLength({ max: 100 })
        .withMessage('La carrera no puede tener más de 100 caracteres'),
    
    body('semester')
        .optional()
        .isLength({ max: 20 })
        .withMessage('El semestre no puede tener más de 20 caracteres'),
    
    body('instagram')
        .optional()
        .matches(/^[a-zA-Z0-9._]{1,30}$/)
        .withMessage('Usuario de Instagram inválido')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Datos inválidos',
                details: errors.array()
            });
        }

        const userId = req.userId;
        const { name, career, semester, instagram } = req.body;

        // Construir query de actualización dinámicamente
        const updates = [];
        const params = { userId };

        if (name !== undefined) {
            updates.push('u.name = $name');
            params.name = name.trim();
        }
        if (career !== undefined) {
            updates.push('u.career = $career');
            params.career = career.trim();
        }
        if (semester !== undefined) {
            updates.push('u.semester = $semester');
            params.semester = semester.trim();
        }
        if (instagram !== undefined) {
            updates.push('u.instagram = $instagram');
            params.instagram = instagram.trim();
        }

        if (updates.length === 0) {
            return res.status(400).json({
                error: 'No hay datos para actualizar'
            });
        }

        // Agregar timestamp de actualización
        updates.push('u.updatedAt = datetime()');

        const query = `
            MATCH (u:User {id: $userId})
            SET ${updates.join(', ')}
            RETURN u
        `;

        const result = await neo4jConnection.runQuery(query, params);

        if (result.records.length === 0) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        const updatedUser = result.records[0].get('u').properties;
        const { password, ...userWithoutPassword } = updatedUser;

        res.json({
            message: 'Perfil actualizado exitosamente',
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('Error actualizando perfil:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
});

module.exports = router;