const neo4jConnection = require('../config/neo4j');


class RecommendationService {
    constructor() {
        // Pesos para diferentes aspectos de compatibilidad
        this.weights = {
            interests: 0.4,        
            personality: 0.35,     
            demographics: 0.15,    
            university: 0.10       
        };
        
        // Categorías de intereses y sus pesos relativos
        this.interestWeights = {
            music: 0.25,
            entertainment: 0.25,
            sports: 0.25,
            hobbies: 0.25
        };
    }

    /**
     * Encuentra matches para un usuario específico
     * @param {string} userId - ID del usuario
     * @param {number} limit - Máximo número de matches a retornar
     * @returns {Array} Lista de matches ordenados por compatibilidad
     */
    async findMatches(userId, limit = 10) {
        try {
            // 1. Obtener perfil del usuario actual
            const currentUser = await this.getUserProfile(userId);
            if (!currentUser) {
                throw new Error('Usuario no encontrado');
            }

            // 2. Obtener todos los posibles matches
            const candidates = await this.getPotentialMatches(userId, currentUser);

            // 3. Calcular similitud para cada candidato
            const scoredMatches = candidates.map(candidate => {
                const score = this.calculateCompatibilityScore(currentUser, candidate);
                return {
                    ...candidate,
                    compatibilityScore: score,
                    compatibilityPercentage: Math.round(score * 100)
                };
            });

            // 4. Ordenar por puntuación y limitar resultados
            const topMatches = scoredMatches
                .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
                .slice(0, limit);

            console.log(`✅ Encontrados ${topMatches.length} matches para usuario ${userId}`);
            return topMatches;

        } catch (error) {
            console.error('Error en findMatches:', error);
            throw error;
        }
    }

    /**
     * Obtiene el perfil completo de un usuario
     */
    async getUserProfile(userId) {
        const query = `
            MATCH (u:User {id: $userId})
            OPTIONAL MATCH (u)-[:HAS_PROFILE]->(p:Profile)
            OPTIONAL MATCH (u)-[:LIKES]->(i:Interest)
            RETURN u, p, 
                   COLLECT({name: i.name, category: i.category}) as interests
        `;

        const result = await neo4jConnection.runQuery(query, { userId });
        
        if (result.records.length === 0) {
            return null;
        }

        const record = result.records[0];
        const user = record.get('u').properties;
        const profile = record.get('p') ? record.get('p').properties : null;
        const interests = record.get('interests').filter(i => i.name);

        return {
            ...user,
            profile,
            interests: this.organizeInterests(interests)
        };
    }

    /**
     * Obtiene candidatos potenciales para matches
     */
    async getPotentialMatches(userId, currentUser) {
        // Filtros básicos: género opuesto, edad similar, ha completado cuestionario
        const ageMin = Math.max(18, currentUser.age - 5);
        const ageMax = Math.min(35, currentUser.age + 5);
        
        const query = `
            MATCH (candidate:User)-[:HAS_PROFILE]->(p:Profile)
            WHERE candidate.id <> $userId
              AND candidate.isActive = true
              AND candidate.gender <> $currentGender
              AND candidate.age >= $ageMin 
              AND candidate.age <= $ageMax
            WITH candidate, p
            OPTIONAL MATCH (candidate)-[:LIKES]->(i:Interest)
            RETURN candidate, p,
                   COLLECT({name: i.name, category: i.category}) as interests
            LIMIT 100
        `;

        const result = await neo4jConnection.runQuery(query, {
            userId,
            currentGender: currentUser.gender,
            ageMin,
            ageMax
        });

        return result.records.map(record => {
            const candidate = record.get('candidate').properties;
            const profile = record.get('p').properties;
            const interests = record.get('interests').filter(i => i.name);

            return {
                ...candidate,
                profile,
                interests: this.organizeInterests(interests)
            };
        });
    }

    /**
     * Calcula la puntuación de compatibilidad entre dos usuarios
     */
    calculateCompatibilityScore(user1, user2) {
        let totalScore = 0;

        // 1. Similitud de intereses (40%)
        const interestScore = this.calculateInterestSimilarity(user1.interests, user2.interests);
        totalScore += interestScore * this.weights.interests;

        // 2. Compatibilidad de personalidad (35%)
        const personalityScore = this.calculatePersonalitySimilarity(user1.profile, user2.profile);
        totalScore += personalityScore * this.weights.personality;

        // 3. Factores demográficos (15%)
        const demoScore = this.calculateDemographicSimilarity(user1, user2);
        totalScore += demoScore * this.weights.demographics;

        // 4. Bonus por misma universidad (10%)
        const universityScore = user1.university === user2.university ? 1 : 0;
        totalScore += universityScore * this.weights.university;

        return Math.min(1, totalScore); // Máximo 1.0
    }

    /**
     * Calcula similitud basada en intereses comunes
     */
    calculateInterestSimilarity(interests1, interests2) {
        let totalSimilarity = 0;

        Object.keys(this.interestWeights).forEach(category => {
            const list1 = interests1[category] || [];
            const list2 = interests2[category] || [];
            
            if (list1.length === 0 || list2.length === 0) {
                return; // Sin datos para comparar
            }

            // Calcular intersección
            const intersection = list1.filter(item => list2.includes(item));
            const union = [...new Set([...list1, ...list2])];
            
            // Índice de Jaccard: intersección / unión
            const jaccardIndex = intersection.length / union.length;
            
            totalSimilarity += jaccardIndex * this.interestWeights[category];
        });

        return totalSimilarity;
    }

    /**
     * Calcula compatibilidad de personalidad
     */
    calculatePersonalitySimilarity(profile1, profile2) {
        if (!profile1 || !profile2) return 0;

        let matches = 0;
        let total = 0;

        const personalityFields = [
            'relationshipValues',
            'weekendPreference', 
            'conversationStyle',
            'socialLife',
            'relationshipGoal'
        ];

        personalityFields.forEach(field => {
            if (profile1[field] && profile2[field]) {
                total++;
                if (profile1[field] === profile2[field]) {
                    matches++;
                }
            }
        });

        return total > 0 ? matches / total : 0;
    }

    /**
     * Calcula similitud demográfica (edad)
     */
    calculateDemographicSimilarity(user1, user2) {
        const ageDiff = Math.abs(user1.age - user2.age);
        
        // Puntuación basada en diferencia de edad
        if (ageDiff <= 1) return 1.0;
        if (ageDiff <= 2) return 0.8;
        if (ageDiff <= 3) return 0.6;
        if (ageDiff <= 4) return 0.4;
        if (ageDiff <= 5) return 0.2;
        return 0;
    }

    /**
     * Organiza intereses por categoría
     */
    organizeInterests(interests) {
        return {
            music: interests.filter(i => i.category === 'music').map(i => i.name),
            entertainment: interests.filter(i => i.category === 'entertainment').map(i => i.name),
            sports: interests.filter(i => i.category === 'sports').map(i => i.name),
            hobbies: interests.filter(i => i.category === 'hobbies').map(i => i.name)
        };
    }

    /**
     * Obtiene estadísticas del algoritmo de recomendación
     */
    async getRecommendationStats(userId) {
        try {
            const user = await this.getUserProfile(userId);
            const candidates = await this.getPotentialMatches(userId, user);
            
            return {
                totalCandidates: candidates.length,
                userHasProfile: !!user.profile,
                userInterestsCount: Object.values(user.interests).flat().length,
                averageCompatibility: candidates.length > 0 
                    ? candidates.reduce((sum, candidate) => {
                        return sum + this.calculateCompatibilityScore(user, candidate);
                    }, 0) / candidates.length 
                    : 0
            };
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            throw error;
        }
    }
}

module.exports = new RecommendationService();