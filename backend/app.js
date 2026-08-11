'use strict';

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
require('dotenv').config();

const { testConnection } = require('./config/db');

// Rutas
const authRoutes      = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const visitorsRoutes  = require('./routes/visitors');
const entriesRoutes   = require('./routes/entries');
const usersRoutes     = require('./routes/users');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ── Rutas de la API ─────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/visitors',  visitorsRoutes);
app.use('/api/entries',   entriesRoutes);
app.use('/api/users',     usersRoutes);

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
  app.listen(PORT, () => {
    console.log(`🚀  CONEQUIPOS — Sistema de Gestión de Entrada`);
    console.log(`🌐  http://localhost:${PORT}`);
  });
}

startServer();
