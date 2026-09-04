'use strict';

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const http     = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const { testConnection } = require('./config/db');

// Rutas
const authRoutes      = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const visitorsRoutes  = require('./routes/visitors');
const entriesRoutes   = require('./routes/entries');
const usersRoutes     = require('./routes/users');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*' }, // Permite conexiones desde cualquier PC de la red local
});
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Servir las fotos de visitantes
app.use('/uploads/fotos', express.static(path.join(__dirname, 'uploads', 'fotos')));

// ── Rutas de la API ─────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/visitors',  visitorsRoutes);
app.use('/api/entries',   entriesRoutes);
app.use('/api/users',     usersRoutes);

// ── Socket.IO: comunicación en tiempo real con el agente lector de cédulas ──
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado por Socket.IO:', socket.id);

  // Cuando el agente lector envía los datos de una cédula escaneada,
  // se retransmiten a todos los navegadores conectados (broadcast).
  socket.on('cedula-escaneada', (datos) => {
    console.log('🪪 Cédula recibida del agente:', datos.documento);
    io.emit('cedula-detectada', datos);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
});

// ── Fallback SPA ────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ── Manejo global de errores ────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Error no controlado:', err);
  res.status(500).json({ success: false, message: 'Error interno del servidor.' });
});

// ── Inicializar servidor ────────────────────────────────────
async function startServer() {
  await testConnection();
  server.listen(PORT, () => {
    console.log(`✅  CONEQUIPOS — Sistema de Gestión de Entrada`);
    console.log(`🌐  http://localhost:${PORT}`);
  });
}

startServer();