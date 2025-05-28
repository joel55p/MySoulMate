const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Importar configuraciones
const { connectNeo4j, closeNeo4j } = require('./config/database');

// Importar rutas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const questionnaireRoutes = require('./routes/questionnaire');
const matchRoutes = require('./routes/matches');
const conversationRoutes = require('./routes/conversations');

// Importar middleware
const authMiddleware = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// Configuración de rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de 100 requests por IP por ventana de tiempo
  message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.'
});

// Middlewares globales
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/questionnaire', authMiddleware, questionnaireRoutes);
app.use('/api/matches', authMiddleware, matchRoutes);
app.use('/api/conversations', authMiddleware, conversationRoutes);

// Ruta de health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'MySoulMate API'
  });
});

// Servir la aplicación frontend para todas las rutas no API
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Manejo de WebSockets para chat en tiempo real
io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);

  // Unirse a una conversación
  socket.on('join_conversation', (conversationId) => {
    socket.join(conversationId);
    console.log(`Usuario ${socket.id} se unió a la conversación ${conversationId}`);
  });

  // Enviar mensaje
  socket.on('send_message', (data) => {
    // Emitir el mensaje a todos los usuarios en la conversación
    socket.to(data.conversationId).emit('receive_message', {
      message: data.message,
      senderId: data.senderId,
      timestamp: new Date().toISOString()
    });
  });

  // Notificar nuevo match
  socket.on('new_match', (data) => {
    socket.to(data.userId).emit('match_notification', {
      matchId: data.matchId,
      matchedUser: data.matchedUser
    });
  });

  socket.on('disconnect', () => {
    console.log('Usuario desconectado:', socket.id);
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: 'Algo salió mal en el servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Error interno del servidor'
  });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Función para inicializar la aplicación
async function startServer() {
  try {
    // Conectar a Neo4j
    await connectNeo4j();
    console.log('✅ Conectado a Neo4j');

    // Iniciar servidor
    server.listen(PORT, () => {
      console.log(`🚀 Servidor MySoulMate ejecutándose en puerto ${PORT}`);
      console.log(`🌐 Frontend: http://localhost:${PORT}`);
      console.log(`📡 API: http://localhost:${PORT}/api`);
      console.log(`💖 ¡MySoulMate está listo para conectar corazones universitarios!`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

// Manejo de cierre gracioso
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando servidor MySoulMate...');
  try {
    await closeNeo4j();
    console.log('✅ Conexión a Neo4j cerrada');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al cerrar conexiones:', error);
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Iniciar la aplicación
startServer();

module.exports = { app, io };