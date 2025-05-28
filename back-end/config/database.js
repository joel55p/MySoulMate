const neo4j = require('neo4j-driver');

let driver;

// Configuración de conexión a Neo4j
const connectNeo4j = async () => {
  try {
    const uri = process.env.NEO4J_URI;
    const username = process.env.NEO4J_USERNAME; // Corregido: era NEO4J_USER
    const password = process.env.NEO4J_PASSWORD;

    console.log('🔗 Conectando a Neo4j...');
    console.log('URI:', uri);
    console.log('Username:', username);
    // No mostrar la contraseña en logs por seguridad
    
    if (!uri || !username || !password) {
      throw new Error('Faltan credenciales de Neo4j. Verifica las variables de entorno.');
    }

    driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 30000,
      connectionTimeout: 20000,
      maxTransactionRetryTime: 30000
      // No necesitamos configuración adicional de encriptación
      // porque ya está en la URI: neo4j+s://
    });

    // Verificar conexión
    console.log('⏳ Verificando conexión...');
    const serverInfo = await driver.getServerInfo();
    console.log('✅ Conectado a Neo4j:', serverInfo.address);
    console.log('📊 Versión Neo4j:', serverInfo.version);

    // Crear restricciones y índices si no existen
    await createConstraintsAndIndexes();

    return driver;
  } catch (error) {
    console.error('❌ Error al conectar con Neo4j:', error.message);
    
    // Ayuda de troubleshooting
    if (error.code === 'ServiceUnavailable') {
      console.error('💡 Posibles soluciones:');
      console.error('   - Verifica que la instancia de Neo4j Aura esté activa');
      console.error('   - Revisa las credenciales en el archivo .env');
      console.error('   - Verifica la conectividad a internet');
    }
    
    throw error;
  }
};

// Crear restricciones e índices
const createConstraintsAndIndexes = async () => {
  const session = getSession();
  
  try {
    console.log('🔧 Creando restricciones e índices...');

    // Restricciones para usuarios
    await session.run(`
      CREATE CONSTRAINT user_email_unique IF NOT EXISTS
      FOR (u:User) REQUIRE u.email IS UNIQUE
    `);

    await session.run(`
      CREATE CONSTRAINT user_id_unique IF NOT EXISTS
      FOR (u:User) REQUIRE u.id IS UNIQUE
    `);

    // Restricciones para intereses
    await session.run(`
      CREATE CONSTRAINT interest_name_unique IF NOT EXISTS
      FOR (i:Interest) REQUIRE i.name IS UNIQUE
    `);

    // Restricciones para matches
    await session.run(`
      CREATE CONSTRAINT match_id_unique IF NOT EXISTS
      FOR (m:Match) REQUIRE m.id IS UNIQUE
    `);

    // Índices para búsquedas frecuentes
    await session.run(`
      CREATE INDEX user_age_index IF NOT EXISTS
      FOR (u:User) ON (u.age)
    `);

    await session.run(`
      CREATE INDEX user_university_index IF NOT EXISTS
      FOR (u:User) ON (u.university)
    `);

    await session.run(`
      CREATE INDEX user_active_index IF NOT EXISTS
      FOR (u:User) ON (u.isActive)
    `);

    await session.run(`
      CREATE INDEX user_profile_complete_index IF NOT EXISTS
      FOR (u:User) ON (u.profileComplete)
    `);

    await session.run(`
      CREATE INDEX match_timestamp_index IF NOT EXISTS
      FOR (m:Match) ON (m.createdAt)
    `);

    await session.run(`
      CREATE INDEX interest_category_index IF NOT EXISTS
      FOR (i:Interest) ON (i.category)
    `);

    console.log('✅ Restricciones e índices de Neo4j creados/verificados');
  } catch (error) {
    console.error('❌ Error al crear restricciones e índices:', error);
    throw error;
  } finally {
    await session.close();
  }
};

// Obtener sesión de Neo4j
const getSession = () => {
  if (!driver) {
    throw new Error('Driver de Neo4j no inicializado');
  }
  return driver.session();
};

// Ejecutar consulta con manejo de errores
const runQuery = async (query, parameters = {}) => {
  const session = getSession();
  
  try {
    console.log('🔍 Ejecutando query:', query.substring(0, 100) + '...');
    const result = await session.run(query, parameters);
    return result;
  } catch (error) {
    console.error('❌ Error ejecutando consulta Neo4j:', error);
    console.error('Query:', query);
    console.error('Parámetros:', parameters);
    throw error;
  } finally {
    await session.close();
  }
};

// Ejecutar transacción
const runTransaction = async (transactionFunction) => {
  const session = getSession();
  
  try {
    const result = await session.executeWrite(transactionFunction);
    return result;
  } catch (error) {
    console.error('❌ Error ejecutando transacción Neo4j:', error);
    throw error;
  } finally {
    await session.close();
  }
};

// Cerrar conexión
const closeNeo4j = async () => {
  if (driver) {
    await driver.close();
    console.log('✅ Conexión a Neo4j cerrada');
  }
};

// Función helper para formatear resultados de Neo4j
const formatNeo4jRecord = (record) => {
  const result = {};
  record.keys.forEach((key, index) => {
    const value = record.get(key);
    if (neo4j.isNode(value)) {
      result[key] = {
        id: value.identity.toString(),
        labels: value.labels,
        properties: value.properties
      };
    } else if (neo4j.isRelationship(value)) {
      result[key] = {
        id: value.identity.toString(),
        type: value.type,
        properties: value.properties,
        start: value.start.toString(),
        end: value.end.toString()
      };
    } else if (neo4j.isInteger(value)) {
      result[key] = value.toNumber();
    } else {
      result[key] = value;
    }
  });
  return result;
};

// Función helper para procesar múltiples registros
const formatNeo4jResults = (result) => {
  return result.records.map(formatNeo4jRecord);
};

// Función para verificar conexión (útil para health checks)
const verifyConnection = async () => {
  try {
    const session = getSession();
    await session.run('RETURN 1 as test');
    await session.close();
    return true;
  } catch (error) {
    console.error('❌ Error verificando conexión:', error);
    return false;
  }
};

// Función para obtener estadísticas de la base de datos
const getDatabaseStats = async () => {
  try {
    const session = getSession();
    const result = await session.run(`
      MATCH (u:User) 
      OPTIONAL MATCH (i:Interest)
      OPTIONAL MATCH (m:Match)
      RETURN 
        count(DISTINCT u) as totalUsers,
        count(DISTINCT i) as totalInterests,
        count(DISTINCT m) as totalMatches
    `);
    
    await session.close();
    
    if (result.records.length > 0) {
      const record = result.records[0];
      return {
        totalUsers: record.get('totalUsers').toNumber(),
        totalInterests: record.get('totalInterests').toNumber(),
        totalMatches: record.get('totalMatches').toNumber()
      };
    }
    
    return { totalUsers: 0, totalInterests: 0, totalMatches: 0 };
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    return { totalUsers: 0, totalInterests: 0, totalMatches: 0 };
  }
};

// Consultas predefinidas comunes
const commonQueries = {
  // Crear usuario
  createUser: `
    CREATE (u:User {
      id: $id,
      name: $name,
      email: $email,
      age: $age,
      university: $university,
      description: $description,
      hashedPassword: $hashedPassword,
      profileComplete: false,
      showPhoto: false,
      isActive: true,
      createdAt: datetime(),
      updatedAt: datetime()
    })
    RETURN u
  `,

  // Encontrar usuario por email
  findUserByEmail: `
    MATCH (u:User {email: $email, isActive: true})
    RETURN u
  `,

  // Crear interés
  createInterest: `
    MERGE (i:Interest {name: $name})
    ON CREATE SET i.category = $category, i.createdAt = datetime()
    RETURN i
  `,

  // Crear relación usuario-interés
  createUserInterest: `
    MATCH (u:User {id: $userId})
    MATCH (i:Interest {name: $interestName})
    MERGE (u)-[r:LIKES {rating: $rating, createdAt: datetime()}]->(i)
    RETURN r
  `,

  // Crear match entre usuarios
  createMatch: `
    MATCH (u1:User {id: $userId1})
    MATCH (u2:User {id: $userId2})
    CREATE (m:Match {
      id: $matchId,
      user1Id: $userId1,
      user2Id: $userId2,
      compatibility: $compatibility,
      createdAt: datetime(),
      status: 'active'
    })
    CREATE (u1)-[:MATCHED_WITH]->(m)<-[:MATCHED_WITH]-(u2)
    SET u1.showPhoto = true, u2.showPhoto = true
    RETURN m
  `,

  // Buscar usuarios compatibles
  findCompatibleUsers: `
    MATCH (u:User {id: $userId})-[:LIKES]->(interest:Interest)<-[:LIKES]-(other:User)
    WHERE u.id <> other.id
    AND other.isActive = true
    AND other.profileComplete = true
    AND NOT EXISTS((u)-[:MATCHED_WITH]-()-[:MATCHED_WITH]-(other))
    AND NOT EXISTS((u)-[:DISLIKE]-(other))
    WITH other, COUNT(interest) as sharedInterests, collect(interest.name) as commonInterests
    WHERE sharedInterests >= $minSharedInterests
    RETURN other, sharedInterests, commonInterests
    ORDER BY sharedInterests DESC
    LIMIT $limit
  `
};

module.exports = {
  connectNeo4j,
  closeNeo4j,
  getSession,
  runQuery,
  runTransaction,
  formatNeo4jRecord,
  formatNeo4jResults,
  verifyConnection,
  getDatabaseStats,
  commonQueries
};