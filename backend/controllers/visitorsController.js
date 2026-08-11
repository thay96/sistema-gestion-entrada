'use strict';

const Visitor = require('../models/Visitor');
const Entry   = require('../models/Entry');

/**
 * Controlador de Visitantes.
 * Gestiona las peticiones HTTP relacionadas a visitantes frecuentes.
 */
const visitorsController = {

  /**
   * GET /api/visitors/lookup?documento=:doc
   * Busca un visitante por documento para auto-completar el formulario.
   */
  async lookup(req, res) {
    try {
      const { documento } = req.query;

      if (!documento || documento.trim().length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Ingrese al menos 3 caracteres del documento.',
        });
      }

      const visitor = await Visitor.findByDocumento(documento.trim());

      if (!visitor) {
        return res.json({ success: true, found: false, visitor: null });
      }

      return res.json({ success: true, found: true, visitor });
    } catch (err) {
      console.error('[visitorsController.lookup]', err);
      return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
  },

  /**
   * GET /api/visitors/search?q=:query
   * Búsqueda general por nombre o documento (para pantalla de salida).
   */
  async search(req, res) {
    try {
      const { q } = req.query;

      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Ingrese al menos 2 caracteres para buscar.',
        });
      }

      const results = await Entry.findActiveByQuery(q.trim());
      return res.json({ success: true, results });
    } catch (err) {
      console.error('[visitorsController.search]', err);
      return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
  },
};

module.exports = visitorsController;
