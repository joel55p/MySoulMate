require('dotenv').config();
const { connectNeo4j, closeNeo4j, runQuery } = require('../back-end/config/database');

// Intereses predefinidos por categorías
const PREDEFINED_INTERESTS = {
  academics: [
    'Matemáticas', 'Física', 'Química', 'Biología', 'Historia', 'Literatura',
    'Filosofía', 'Psicología', 'Economía', 'Derecho', 'Medicina', 'Ingeniería',
    'Arquitectura', 'Diseño Gráfico', 'Comunicación', 'Periodismo'
  ],
  technology: [
    'Programación', 'Inteligencia Artificial', 'Desarrollo Web', 'Videojuegos',
    'Robótica', 'Ciberseguridad', 'Blockchain', 'Machine Learning',
    'Desarrollo Mobile', 'DevOps', 'UI/UX Design'
  ],
  arts: [
    'Música', 'Pintura', 'Fotografía', 'Teatro', 'Danza', 'Escritura',
    'Cine', 'Escultura', 'Arte Digital', 'Animación'
  ],
  sports: [
    'Fútbol', 'Baloncesto', 'Tenis', 'Natación', 'Voleibol', 'Ciclismo',
    'Running', 'Yoga', 'Gym', 'Escalada', 'Surf', 'Skate'
  ],
  hobbies: [
    'Lectura', 'Cocina', 'Jardinería', 'Viajes', 'Camping', 'Senderismo',
    'Anime', 'Series', 'Podcasts', 'Coleccionismo', 'Board Games'
  ],
  lifestyle: [
    'Vida Saludable', 'Meditación', 'Sostenibilidad', 'Voluntariado',
    'Entrepreneurship', 'Networking', 'Desarrollo Personal'
  ]
};

// Universidades de Guatemala
const UNIVERSITIES = [
  'Universidad del Valle de Guatemala',
  'Universidad Rafael Landívar',
  'Universidad del Istmo',
  'Universidad Francisco Marroquín',
  'Universidad de San Carlos de Guatemala',
  'Universidad Galileo',
  'Universidad Mariano Gálvez',
  'Universidad Panamericana'
];

async function initializeDatabase() {
  console.log('🚀 MySoulMate - Inicialización de Base de Datos');
  console.log('==============================================');
  
  try {
    // Conectar a Neo4j
    console.log('1️⃣ Conectando a Neo4j...');
    await connectNeo4j();
    
    // Limpiar datos existentes (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      console.log('\n2️⃣ Limpiando datos existentes (modo desarrollo)...');
      await runQuery('MATCH (n) DETACH DELETE n');
      console.log('🗑️ Base de datos limpiada');
    }
    
    // Crear intereses predefinidos
    console.log('\n3️⃣ Creando intereses predefinidos...');
    let totalInterests = 0;
    
    for (const [category, interests] of Object.entries(PREDEFINED_INTERESTS)) {
      console.log(`   📂 Categoría: ${category}`);
      
      for (const interest of interests) {
        await runQuery(`
          MERGE (i:Interest {name: $name})
          ON CREATE SET i.category = $category, i.createdAt = datetime()
        `, { name: interest, category });
        
        totalInterests++;
      }
    }
    
    console.log(`✅ ${totalInterests} intereses creados`);
    
    // Crear nodos de universidades
    console.log('\n4️⃣ Creando universidades...');
    for (const university of UNIVERSITIES) {
      await runQuery(`
        MERGE (u:University {name: $name})
        ON CREATE SET u.createdAt = datetime()
      `, { name: university });
    }
    console.log(`✅ ${UNIVERSITIES.length} universidades creadas`);
    
    // Crear usuarios de ejemplo (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      console.log('\n5️⃣ Creando usuarios de ejemplo...');
      
      const sampleUsers = [
        {
          id: 'user-1',
          name: 'Ana García',
          email: 'ana.garcia@uvg.edu.gt',
          age: 20,
          university: 'Universidad del Valle de Guatemala',
          career: 'Ingeniería en Sistemas',
          semester: 4,
          interests: ['Programación', 'Música', 'Lectura', 'Yoga']
        },
        {
          id: 'user-2',
          name: 'Carlos López',
          email: 'carlos.lopez@url.edu.gt',
          age: 22,
          university: 'Universidad Rafael Landívar',
          career: 'Psicología',
          semester: 6,
          interests: ['Psicología', 'Fotografía', 'Senderismo', 'Cine']
        },
        {
          id: 'user-3',
          name: 'María Rodríguez',
          email: 'maria.rodriguez@unis.edu.gt',
          age: 21,
          university: 'Universidad del Istmo',
          career: 'Diseño Gráfico',
          semester: 5,
          interests: ['Diseño Gráfico', 'Arte Digital', 'Fotografía', 'Viajes']
        }
      ];
      
      for (const user of sampleUsers) {
        // Crear usuario
        await runQuery(`
          CREATE (u:User {
            id: $id,
            name: $name,
            email: $email,
            age: $age,
            university: $university,
            career: $career,
            semester: $semester,
            hashedPassword: $hashedPassword,
            profileComplete: true,
            isActive: true,
            showPhoto: true,
            createdAt: datetime(),
            updatedAt: datetime()
          })
        `, {
          ...user,
          hashedPassword: '$2b$12$dummyHashForDevelopment' // Hash dummy para desarrollo
        });
        
        // Conectar con intereses
        for (const interestName of user.interests) {
          await runQuery(`
            MATCH (u:User {id: $userId})
            MATCH (i:Interest {name: $interestName})
            CREATE (u)-[:LIKES {rating: 5, createdAt: datetime()}]->(i)
          `, { userId: user.id, interestName });
        }
      }
      
      console.log(`✅ ${sampleUsers.length} usuarios de ejemplo creados`);
    }
    
    // Verificar la inicialización
    console.log('\n6️⃣ Verificando inicialización...');
    const stats = await runQuery(`
      MATCH (u:User) 
      OPTIONAL MATCH (i:Interest)
      OPTIONAL MATCH (uni:University)
      RETURN 
        count(DISTINCT u) as totalUsers,
        count(DISTINCT i) as totalInterests,
        count(DISTINCT uni) as totalUniversities
    `);
    
    if (stats.records.length > 0) {
      const record = stats.records[0];
      console.log('📊 Estadísticas finales:');
      console.log(`   👥 Usuarios: ${record.get('totalUsers').toNumber()}`);
      console.log(`   ❤️ Intereses: ${record.get('totalInterests').toNumber()}`);
      console.log(`   🎓 Universidades: ${record.get('totalUniversities').toNumber()}`);
    }
    
    console.log('\n🎉 ¡Inicialización completada exitosamente!');
    console.log('✅ La base de datos está lista para MySoulMate');
    
  } catch (error) {
    console.error('\n❌ Error durante la inicialización:');
    console.error('Mensaje:', error.message);
    if (error.code) {
      console.error('Código:', error.code);
    }
    process.exit(1);
  } finally {
    await closeNeo4j();
  }
}

// Función para mostrar ayuda
function showHelp() {
  console.log('MySoulMate - Inicialización de Base de Datos');
  console.log('');
  console.log('Uso:');
  console.log('  npm run init-db              # Inicializar base de datos');
  console.log('  npm run init-db -- --help    # Mostrar esta ayuda');
  console.log('  npm run init-db -- --clean   # Limpiar y reinicializar');
  console.log('');
  console.log('Variables de entorno requeridas:');
  console.log('  NEO4J_URI      # URI de conexión a Neo4j');
  console.log('  NEO4J_USERNAME # Usuario de Neo4j');
  console.log('  NEO4J_PASSWORD # Contraseña de Neo4j');
}

// Ejecutar según argumentos
const args = process.argv.slice(2);

if (args.includes('--help')) {
  showHelp();
} else {
  initializeDatabase();
}