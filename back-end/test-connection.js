// test-connection.js
require('dotenv').config();
const { connectNeo4j, closeNeo4j, runQuery, getDatabaseStats } = require('./config/database');

async function testConnection() {
  console.log('🚀 MySoulMate - Test de Conexión Neo4j');
  console.log('=====================================');
  
  try {
    // 1. Intentar conectar
    console.log('1️⃣ Conectando a Neo4j...');
    await connectNeo4j();
    
    // 2. Ejecutar query simple
    console.log('\n2️⃣ Ejecutando query de prueba...');
    const testResult = await runQuery('RETURN "¡Conexión exitosa!" as message, datetime() as timestamp');
    
    if (testResult.records.length > 0) {
      const record = testResult.records[0];
      console.log('✅ Respuesta de Neo4j:', record.get('message'));
      console.log('🕐 Timestamp:', record.get('timestamp').toString());
    }
    
    // 3. Obtener estadísticas de la base de datos
    console.log('\n3️⃣ Obteniendo estadísticas de la base de datos...');
    const stats = await getDatabaseStats();
    console.log('📊 Estadísticas actuales:');
    console.log('   - Usuarios:', stats.totalUsers);
    console.log('   - Intereses:', stats.totalInterests);
    console.log('   - Matches:', stats.totalMatches);
    
    // 4. Crear un usuario de prueba (opcional)
    console.log('\n4️⃣ Creando usuario de prueba...');
    const testUser = {
      id: 'test-user-' + Date.now(),
      name: 'Usuario Test',
      email: 'test@uvg.edu.gt',
      age: 22,
      university: 'Universidad del Valle de Guatemala',
      hashedPassword: 'fake-hash-for-testing'
    };
    
    const createUserQuery = `
      CREATE (u:User {
        id: $id,
        name: $name,
        email: $email,
        age: $age,
        university: $university,
        hashedPassword: $hashedPassword,
        profileComplete: false,
        isActive: true,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      RETURN u
    `;
    
    const userResult = await runQuery(createUserQuery, testUser);
    
    if (userResult.records.length > 0) {
      const createdUser = userResult.records[0].get('u').properties;
      console.log('✅ Usuario creado:', createdUser.name);
      console.log('📧 Email:', createdUser.email);
      
      // Eliminar el usuario de prueba
      console.log('\n5️⃣ Limpiando usuario de prueba...');
      await runQuery('MATCH (u:User {id: $id}) DELETE u', { id: testUser.id });
      console.log('🗑️ Usuario de prueba eliminado');
    }
    
    console.log('\n🎉 ¡Todas las pruebas pasaron exitosamente!');
    console.log('✅ Neo4j está configurado correctamente para MySoulMate');
    
  } catch (error) {
    console.error('\n❌ Error en las pruebas:');
    console.error('Mensaje:', error.message);
    
    if (error.code) {
      console.error('Código:', error.code);
    }
    
    // Diagnósticos específicos
    if (error.code === 'ServiceUnavailable') {
      console.error('\n🔧 Diagnóstico:');
      console.error('- La instancia de Neo4j no está disponible');
      console.error('- Verifica que la instancia de Neo4j Aura esté activa');
      console.error('- Revisa las credenciales en el archivo .env');
    } else if (error.code === 'Neo.ClientError.Security.Unauthorized') {
      console.error('\n🔧 Diagnóstico:');
      console.error('- Credenciales incorrectas');
      console.error('- Verifica NEO4J_USERNAME y NEO4J_PASSWORD en .env');
    }
    
    process.exit(1);
  } finally {
    // Cerrar conexión
    console.log('\n🔌 Cerrando conexión...');
    await closeNeo4j();
  }
}

// Ejecutar las pruebas
testConnection();