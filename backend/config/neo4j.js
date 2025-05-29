const neo4j = require('neo4j-driver');
require('dotenv').config();

class Neo4jConnection {
    constructor() {
        this.driver = null;
        this.session = null;
    }

    async connect() {
        try {
            this.driver = neo4j.driver(
                process.env.NEO4J_URI,
                neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD),
                {
                    // Configuraciones adicionales para Aura
                    connectionTimeout: 30000,
                    maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 horas
                    maxConnectionPoolSize: 50,
                    connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutos
                }
            );

            // Verificar conexión
            await this.driver.verifyConnectivity();
            console.log('✅ Conectado exitosamente a Neo4j Aura');
            
            return this.driver;
        } catch (error) {
            console.error('❌ Error conectando a Neo4j:', error);
            throw error;
        }
    }

    getSession() {
        if (!this.driver) {
            throw new Error('Driver no inicializado. Llama connect() primero.');
        }
        return this.driver.session();
    }

    async close() {
        if (this.driver) {
            await this.driver.close();
            console.log('🔒 Conexión a Neo4j cerrada');
        }
    }

    // Método para ejecutar consultas
    async runQuery(query, parameters = {}) {
        const session = this.getSession();
        try {
            const result = await session.run(query, parameters);
            return result;
        } catch (error) {
            console.error('Error ejecutando consulta:', error);
            throw error;
        } finally {
            await session.close();
        }
    }

    // Método para verificar si un usuario existe
    async userExists(email) {
        const query = `
            MATCH (u:User {email: $email})
            RETURN u
        `;
        
        const result = await this.runQuery(query, { email });
        return result.records.length > 0;
    }

    // Método para crear un usuario
    async createUser(userData) {
        const query = `
            CREATE (u:User {
                id: $id,
                name: $name,
                email: $email,
                password: $password,
                age: $age,
                gender: $gender,
                university: $university,
                career: $career,
                semester: $semester,
                instagram: $instagram,
                createdAt: datetime(),
                isActive: true
            })
            RETURN u
        `;
        
        const result = await this.runQuery(query, userData);
        return result.records[0]?.get('u').properties;
    }

    // Método para obtener usuario por email
    async getUserByEmail(email) {
        const query = `
            MATCH (u:User {email: $email})
            RETURN u
        `;
        
        const result = await this.runQuery(query, { email });
        if (result.records.length === 0) {
            return null;
        }
        
        return result.records[0].get('u').properties;
    }

    // Método para obtener usuario por ID
    async getUserById(userId) {
        const query = `
            MATCH (u:User {id: $userId})
            RETURN u
        `;
        
        const result = await this.runQuery(query, { userId });
        if (result.records.length === 0) {
            return null;
        }
        
        return result.records[0].get('u').properties;
    }

    // Método para guardar respuestas del cuestionario
    async saveQuestionnaire(userId, answers) {
        const session = this.getSession();
        
        try {
            await session.writeTransaction(async (tx) => {
                // Primero, crear o actualizar el perfil del usuario
                await tx.run(`
                    MATCH (u:User {id: $userId})
                    MERGE (u)-[:HAS_PROFILE]->(p:Profile)
                    SET p.completedAt = datetime(),
                        p.lastUpdated = datetime()
                    RETURN p
                `, { userId });

                // Crear relaciones con los intereses musicales
                if (answers.music && answers.music.length > 0) {
                    for (const musicGenre of answers.music) {
                        await tx.run(`
                            MATCH (u:User {id: $userId})
                            MERGE (m:Interest {name: $musicGenre, category: 'music'})
                            MERGE (u)-[:LIKES]->(m)
                        `, { userId, musicGenre });
                    }
                }

                // Crear relaciones con entretenimiento
                if (answers.entertainment && answers.entertainment.length > 0) {
                    for (const entertainment of answers.entertainment) {
                        await tx.run(`
                            MATCH (u:User {id: $userId})
                            MERGE (e:Interest {name: $entertainment, category: 'entertainment'})
                            MERGE (u)-[:LIKES]->(e)
                        `, { userId, entertainment });
                    }
                }

                // Crear relaciones con deportes/actividades
                if (answers.sports && answers.sports.length > 0) {
                    for (const sport of answers.sports) {
                        await tx.run(`
                            MATCH (u:User {id: $userId})
                            MERGE (s:Interest {name: $sport, category: 'sports'})
                            MERGE (u)-[:LIKES]->(s)
                        `, { userId, sport });
                    }
                }

                // Crear relaciones con hobbies
                if (answers.hobbies && answers.hobbies.length > 0) {
                    for (const hobby of answers.hobbies) {
                        await tx.run(`
                            MATCH (u:User {id: $userId})
                            MERGE (h:Interest {name: $hobby, category: 'hobbies'})
                            MERGE (u)-[:LIKES]->(h)
                        `, { userId, hobby });
                    }
                }

                // Guardar valores y preferencias de personalidad
                const personalityData = {
                    userId,
                    relationshipValues: answers.relationship_values || '',
                    weekendPreference: answers.weekend_preference || '',
                    conversationStyle: answers.conversation_style || '',
                    socialLife: answers.social_life || '',
                    relationshipGoal: answers.relationship_goal || ''
                };

                await tx.run(`
                    MATCH (u:User {id: $userId})-[:HAS_PROFILE]->(p:Profile)
                    SET p.relationshipValues = $relationshipValues,
                        p.weekendPreference = $weekendPreference,
                        p.conversationStyle = $conversationStyle,
                        p.socialLife = $socialLife,
                        p.relationshipGoal = $relationshipGoal
                `, personalityData);
            });

            console.log(`✅ Cuestionario guardado para usuario ${userId}`);
            return true;
        } catch (error) {
            console.error('Error guardando cuestionario:', error);
            throw error;
        } finally {
            await session.close();
        }
    }
}

// Crear instancia singleton
const neo4jConnection = new Neo4jConnection();

module.exports = neo4jConnection;