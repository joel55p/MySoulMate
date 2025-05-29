const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const neo4jConnection = require('./config/neo4j');

// Importar rutas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const questionnaireRoutes = require('./routes/questionnaire');
const matchRoutes = require('./routes/matches');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de seguridad
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por IP por ventana de tiempo
    message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.'
});
app.use(limiter);

// CORS
app.use(cors({
    origin: ['http://localhost:3001', 'http://127.0.0.1:5500', 'http://localhost:5500'],
    credentials: true
}));

// Parser de JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware para logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Rutas principales
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/questionnaire', questionnaireRoutes);
app.use('/api/matches', matchRoutes);

// Ruta de health check
app.get('/api/health', async (req, res) => {
    try {
        // Verificar conexión a Neo4j
        const session = neo4jConnection.getSession();
        await session.run('RETURN 1');
        await session.close();
        
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            database: 'Neo4j Connected',
            version: process.env.API_VERSION || 'v1'
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            database: 'Neo4j Disconnected',
            error: error.message
        });
    }
});

// Middleware para manejar rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Ruta no encontrada',
        message: `La ruta ${req.method} ${req.originalUrl} no existe`
    });
});

// Middleware global de manejo de errores
app.use((error, req, res, next) => {
    console.error('Error global:', error);
    
    res.status(error.status || 500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'Error interno del servidor' 
            : error.message,
        timestamp: new Date().toISOString()
    });
});

// Función para inicializar el servidor
async function startServer() {
    try {
        // Conectar a Neo4j
        await neo4jConnection.connect();
        
        // Verificar que existen los índices necesarios
        await createIndexes();
        
        // Iniciar servidor
        app.listen(PORT, () => {
            console.log(`
🚀 Servidor MySoulMate iniciado
📍 Puerto: ${PORT}
🌍 Entorno: ${process.env.NODE_ENV || 'development'}
🔗 Health Check: http://localhost:${PORT}/api/health
📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3001'}
            `);
        });
        
    } catch (error) {
        console.error('❌ Error iniciando servidor:', error);
        process.exit(1);
    }
}

// Función para crear índices en Neo4j
async function createIndexes() {
    try {
        const indexes = [
            'CREATE INDEX user_email_idx IF NOT EXISTS FOR (u:User) ON (u.email)',
            'CREATE INDEX user_id_idx IF NOT EXISTS FOR (u:User) ON (u.id)',
            'CREATE INDEX interest_name_idx IF NOT EXISTS FOR (i:Interest) ON (i.name)',
            'CREATE INDEX interest_category_idx IF NOT EXISTS FOR (i:Interest) ON (i.category)'
        ];
        
        for (const indexQuery of indexes) {
            await neo4jConnection.runQuery(indexQuery);
        }
        
        console.log('✅ Índices de Neo4j verificados/creados');
    } catch (error) {
        console.error('⚠️ Error creando índices:', error);
        // No es crítico, continuar
    }
}

// Manejo de cierre graceful
process.on('SIGTERM', async () => {
    console.log('🛑 Recibida señal SIGTERM, cerrando servidor...');
    await neo4jConnection.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🛑 Recibida señal SIGINT, cerrando servidor...');
    await neo4jConnection.close();
    process.exit(0);
});

// Iniciar servidor
startServer();

module.exports = app;