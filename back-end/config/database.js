const neo4j = require('neo4j-driver');

let driver;
let session;

// Configuración de conexión a Neo4j
const connectNeo4j = async () => {
  try {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const user = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'password';

    driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 30000,
      connectionTimeout: 20000,
      maxTransactionRetryTime: 30000
    });

    // Verificar conexión
    const serverInfo = await driver.getServerInfo();
    console.log('Conectado a Neo4j:', serverInfo.address);

    // Crear restricciones y índices si no existen
    await createConstraintsAndIndexes();

    return driver;
  } catch (error) {
    console.error('Error al conectar con Neo4j:', error);
    throw error;
  }
};

// Crear restricciones e índices
const createConstraintsAndIndexes = async () => {
  const session = getSession();
  
  try {
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
      CREATE INDEX match_timestamp_index IF NOT EXISTS
      FOR ()-[r:MATCH]-() ON (r.timestamp)
    `);

    console.log('✅ Restricciones e índices de Neo4j creados/verificados');
  } catch (error) {
    console.error('Error al crear restricciones e índices:', error);
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
    const result = await session.run(query, parameters);
    return result;
  } catch (error) {
    console.error('Error ejecutando consulta Neo4j:', error);
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
    console.error('Error ejecutando transacción Neo4j:', error);
    throw error;
  } finally {
    await session.close();
  }
};

// Cerrar conexión
const closeNeo4j = async () => {
  if (session) {
    await session.close();
  }
  if (driver) {
    await driver.close();
  }
  console.log('Conexión a Neo4j cerrada');
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
      createdAt: datetime(),
      updatedAt: datetime()
    })
    RETURN u
  `,

  // Encontrar usuario por email
  findUserByEmail: `
    MATCH (u:User {email: $email})
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
    MERGE (u)-[r:LIKES]->(i)
    ON CREATE SET r.rating = $rating, r.createdAt = datetime()
    ON MATCH SET r.rating = $rating, r.updatedAt = datetime()
    RETURN r
  `,

  // Crear match entre usuarios
  createMatch: `
    MATCH (u1:User {id: $userId1})
    MATCH (u2:User {id: $userId2})
    CREATE (u1)-[m:MATCH {
      compatibility: $compatibility,
      timestamp: datetime(),
      status: 'active'
    }]->(u2)
    SET u1.showPhoto = true, u2.showPhoto = true
    RETURN m
  `,

  // Buscar usuarios compatibles
  findCompatibleUsers: `
    MATCH (u:User {id: $userId})-[:LIKES]->(interest:Interest)<-[:LIKES]-(other:User)
    WHERE u.id <> other.id
    AND NOT EXISTS((u)-[:MATCH]-(other))
    AND NOT EXISTS((u)-[:DISLIKE]-(other))
    WITH other, COUNT(interest) as sharedInterests
    WHERE sharedInterests >= $minSharedInterests
    RETURN other, sharedInterests
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
  commonQueries
};