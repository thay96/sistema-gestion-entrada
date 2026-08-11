"use strict";

const Visitor = require("../models/Visitor");
const Entry = require("../models/Entry");
const XLSX = require("xlsx");
const moment = require("moment");
const { pool } = require("../config/db");

/**
 * Controlador de Ingresos (Entradas y Salidas).
 */
const entriesController = {
  /** POST /api/entries — Registra una nueva entrada */
  async registerEntry(req, res) {
    try {
      const {
        nombre,
        documento,
        empresa,
        tipo_persona,
        persona_visita,
        motivo,
        telefono,
        correo,
      } = req.body;

      const requiredFields = {
        nombre,
        documento,
        empresa,
        tipo_persona,
        correo,
      };
      for (const [field, value] of Object.entries(requiredFields)) {
        if (!value || !value.toString().trim()) {
          return res
            .status(400)
            .json({
              success: false,
              message: `El campo "${field}" es obligatorio.`,
            });
        }
      }

      const { id: visitante_id } = await Visitor.upsert({
        nombre: nombre.trim(),
        documento: documento.trim(),
        empresa: empresa.trim(),
        tipo_persona: tipo_persona.trim(),
        telefono: telefono ? telefono.trim() : null,
        correo: correo.trim(),
      });

      const ingresoId = await Entry.create({
        visitante_id,
        persona_visita: persona_visita ? persona_visita.trim() : null,
        motivo: motivo ? motivo.trim() : null,
      });

      return res
        .status(201)
        .json({
          success: true,
          message: "Entrada registrada exitosamente.",
          ingresoId,
        });
    } catch (err) {
      console.error("[entriesController.registerEntry]", err);
      return res
        .status(500)
        .json({ success: false, message: "Error interno del servidor." });
    }
  },

  /** PUT /api/entries/:id/exit — Registra la salida */
  async registerExit(req, res) {
    try {
      const { id } = req.params;
      if (!id || isNaN(id)) {
        return res
          .status(400)
          .json({ success: false, message: "ID de ingreso inválido." });
      }
      const updated = await Entry.registerExit(parseInt(id));
      if (!updated) {
        return res
          .status(404)
          .json({
            success: false,
            message: "Registro no encontrado o ya marcado como salida.",
          });
      }
      return res.json({
        success: true,
        message: "Salida registrada exitosamente.",
      });
    } catch (err) {
      console.error("[entriesController.registerExit]", err);
      return res
        .status(500)
        .json({ success: false, message: "Error interno del servidor." });
    }
  },

  /** GET /api/entries/active — Lista todos los que están "Dentro" ahora mismo */
  async getActive(req, res) {
    try {
      const records = await Entry.findAllActive();
      return res.json({ success: true, records });
    } catch (err) {
      console.error("[entriesController.getActive]", err);
      return res
        .status(500)
        .json({ success: false, message: "Error interno del servidor." });
    }
  },

  /** GET /api/entries/history — Historial con filtros */
  async getHistory(req, res) {
    try {
      const { q, fechaDesde, fechaHasta } = req.query;
      const records = await Entry.getHistory({
        query: q,
        fechaDesde,
        fechaHasta,
      });
      return res.json({ success: true, records });
    } catch (err) {
      console.error("[entriesController.getHistory]", err);
      return res
        .status(500)
        .json({ success: false, message: "Error interno del servidor." });
    }
  },

  /** GET /api/entries/export — Exportar a Excel */
  async exportToExcel(req, res) {
    try {
      const { q, fechaDesde, fechaHasta } = req.query;
      const records = await Entry.getHistory({
        query: q,
        fechaDesde,
        fechaHasta,
      });

      const data = records.map((r) => ({
        ID: r.id,
        Documento: r.documento,
        Nombre: r.nombre,
        Empresa: r.empresa,
        Tipo: r.tipo_persona,
        "Persona Visita": r.persona_visita || "",
        Motivo: r.motivo || "",
        "Hora Entrada": r.hora_entrada
          ? moment(r.hora_entrada).format("DD/MM/YYYY HH:mm:ss")
          : "",
        "Hora Salida": r.hora_salida
          ? moment(r.hora_salida).format("DD/MM/YYYY HH:mm:ss")
          : "",
        Estado: r.estado,
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data);
      const colWidths = Object.keys(data[0] || {}).map((key) => ({
        wch: Math.max(
          key.length,
          ...data.map((r) => String(r[key] || "").length),
        ),
      }));
      worksheet["!cols"] = colWidths;
      XLSX.utils.book_append_sheet(workbook, worksheet, "Historial");

      const filename = `historial_${moment().format("YYYY-MM-DD_HH-mm")}.xlsx`;
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      return res.send(buffer);
    } catch (err) {
      console.error("[entriesController.exportToExcel]", err);
      return res
        .status(500)
        .json({
          success: false,
          message: "Error al generar el archivo Excel.",
        });
    }
  },

  /** DELETE /api/entries/:id — Eliminar registro (solo Admin) */
  async deleteEntry(req, res) {
    try {
      const { id } = req.params;
      if (!id || isNaN(id)) {
        return res
          .status(400)
          .json({ success: false, message: "ID de ingreso inválido." });
      }
      const [result] = await pool.execute("DELETE FROM ingresos WHERE id = ?", [
        parseInt(id),
      ]);
      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Registro no encontrado." });
      }
      return res.json({
        success: true,
        message: "Registro eliminado exitosamente.",
      });
    } catch (err) {
      console.error("[entriesController.deleteEntry]", err);
      return res
        .status(500)
        .json({ success: false, message: "Error al eliminar el registro." });
    }
  },
};

module.exports = entriesController;
