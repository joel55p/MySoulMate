const express = require('express');
const { query, validationResult } = require('express-validator');
const neo4jConnection = require('../config/neo4j');
const { authMiddleware } = require('../middleware/auth');
const recommendationService = require('../services/recommendation');

const router = express.Router();

// Obtener matches recomendados para el usuario
router.get('/', authMiddleware, [
    query('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('El límite debe ser entre 1 y 50'),
    
    query('minCompatibility')
        .optional()
        .isFloat({ min: 0, max: 1 })
        .withMessage('La compatibilidad mínima debe estar entre 0 y 1')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Parámetros inválidos',
                details: errors.array()
            });
        }

        const userId = req.userId;
        const limit = parseInt(req.query.limit) || 10;
        const minCompatibility = parseFloat(req.query.minCompatibility) || 0.3;

        // Verificar que el usuario ha completado el cuestionario
        const userProfile = await recommendationService.getUserProfile(userId);
        if (!userProfile || !userProfile.profile) {
            return res.status(400).json({
                error: 'Cuestionario incompleto',
                message: 'Debes completar el cuestionario para ver matches'
            });
        }

        // Obtener matches
        const matches = await recommendationService.findMatches(userId, limit);

        // Filtrar por compatibilidad mínima
        const filteredMatches = matches.filter(match => 
            match.compatibilityScore >= minCompatibility
        );

        // Formatear respuesta (sin información sensible)
        const formattedMatches = filteredMatches.map(match => ({
            id: match.id,
            name: match.name,
            age: match.age,
            gender: match.gender,
            university: match.university,
            career: match.career,
            semester: match.semester,
            instagram: match.instagram,
            compatibilityPercentage: match.compatibilityPercentage,
            compatibilityScore: match.compatibilityScore,
            interests: match.interests,
            profile: {
                relationshipValues: match.profile.relationshipValues,
                weekendPreference: match.profile.weekendPreference,
                conversationStyle: match.profile.conversationStyle,
                socialLife: match.profile.socialLife,
                relationshipGoal: match.profile.relationshipGoal
            }
        }));

        res.json({
            matches: formattedMatches,
            total: formattedMatches.length,
            hasCompletedQuestionnaire: true,
            requestParams: {
                limit,
                minCompatibility
            }
        });

        console.log(`✅ Matches enviados para usuario ${userId}: ${formattedMatches.length} resultados`);

    } catch (error) {
        console.error('Error obteniendo matches:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Obtener un match específico por ID
router.get('/:matchId', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const matchId = req.params.matchId;

        // Obtener información del match específico
        const matchProfile = await recommendationService.getUserProfile(matchId);
        if (!matchProfile || !matchProfile.profile) {
            return res.status(404).json({
                error: 'Match no encontrado'
            });
        }

        // Verificar que no sea el mismo usuario
        if (matchId === userId) {
            return res.status(400).json({
                error: 'No puedes verte a ti mismo como match'
            });
        }

        // Calcular compatibilidad específica
        const currentUser = await recommendationService.getUserProfile(userId);
        const compatibilityScore = recommendationService.calculateCompatibilityScore(
            currentUser, 
            matchProfile
        );

        // Formatear respuesta
        const formattedMatch = {
            id: matchProfile.id,
            name: matchProfile.name,
            age: matchProfile.age,
            gender: matchProfile.gender,
            university: matchProfile.university,
            career: matchProfile.career,
            semester: matchProfile.semester,
            instagram: matchProfile.instagram,
            compatibilityPercentage: Math.round(compatibilityScore * 100),
            compatibilityScore: compatibilityScore,
            interests: matchProfile.interests,
            profile: {
                relationshipValues: matchProfile.profile.relationshipValues,
                weekendPreference: matchProfile.profile.weekendPreference,
                conversationStyle: matchProfile.profile.conversationStyle,
                socialLife: matchProfile.profile.socialLife,
                relationshipGoal: matchProfile.profile.relationshipGoal
            }
        };

        res.json({
            match: formattedMatch
        });

    } catch (error) {
        console.error('Error obteniendo match específico:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
});

// Marcar interés en un match
router.post('/:matchId/interest', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const matchId = req.params.matchId;

        // Verificar que el match existe
        const matchUser = await neo4jConnection.getUserById(matchId);
        if (!matchUser) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        // Verificar que no sea el mismo usuario
        if (matchId === userId) {
            return res.status(400).json({
                error: 'No puedes marcarte interés a ti mismo'
            });
        }

        // Crear o actualizar relación de interés
        const query = `
            MATCH (u1:User {id: $userId}), (u2:User {id: $matchId})
            MERGE (u1)-[r:INTERESTED_IN]->(u2)
            ON CREATE SET r.createdAt = datetime()
            ON MATCH SET r.updatedAt = datetime()
            RETURN r
        `;

        await neo4jConnection.runQuery(query, { userId, matchId });

        // Verificar si hay match mutuo
        const mutualQuery = `
            MATCH (u1:User {id: $userId})-[:INTERESTED_IN]->(u2:User {id: $matchId})
            MATCH (u2)-[:INTERESTED_IN]->(u1)
            RETURN u1, u2
        `;

        const mutualResult = await neo4jConnection.runQuery(mutualQuery, { userId, matchId });
        const isMutualMatch = mutualResult.records.length > 0;

        if (isMutualMatch) {
            // Crear relación de match mutuo
            await neo4jConnection.runQuery(`
                MATCH (u1:User {id: $userId}), (u2:User {id: $matchId})
                MERGE (u1)-[r:MATCHED_WITH]->(u2)
                ON CREATE SET r.createdAt = datetime()
                MERGE (u2)-[r2:MATCHED_WITH]->(u1)  
                ON CREATE SET r2.createdAt = datetime()
                RETURN r, r2
            `, { userId, matchId });
        }

        res.json({
            message: 'Interés registrado',
            isMutualMatch,
            matchId
        });

        console.log(`${isMutualMatch ? '💖 MATCH MUTUO' : '👍 Interés registrado'}: ${userId} -> ${matchId}`);

    } catch (error) {
        console.error('Error registrando interés:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
});

// Obtener matches mutuos del usuario
router.get('/mutual/list', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;

        const query = `
            MATCH (u:User {id: $userId})-[:MATCHED_WITH]->(match:User)
            OPTIONAL MATCH (match)-[:LIKES]->(i:Interest)
            RETURN match, 
                   COLLECT({name: i.name, category: i.category}) as interests
            ORDER BY match.name
        `;

        const result = await neo4jConnection.runQuery(query, { userId });

        const mutualMatches = result.records.map(record => {
            const match = record.get('match').properties;
            const interests = record.get('interests').filter(i => i.name);

            return {
                id: match.id,
                name: match.name,
                age: match.age,
                gender: match.gender,
                university: match.university,
                career: match.career,
                instagram: match.instagram,
                interests: recommendationService.organizeInterests(interests)
            };
        });

        res.json({
            mutualMatches,
            total: mutualMatches.length
        });

    } catch (error) {
        console.error('Error obteniendo matches mutuos:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
});

// Obtener estadísticas del algoritmo
router.get('/stats/recommendation', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const stats = await recommendationService.getRecommendationStats(userId);
        
        res.json({
            stats,
            algorithm: 'Cosine Similarity with Weighted Features',
            weights: recommendationService.weights
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
});

module.exports = router;