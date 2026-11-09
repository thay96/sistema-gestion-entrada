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
        motivo,
        telefono,
        arl, eps,
        soporte_seguridad_social,
        notificacion_riesgo,
        autoriza_datos,
      } = req.body;

      const requiredFields = {
        nombre,
        documento,
        empresa,
        tipo_persona,
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
      const SI_NO = ["Si", "No"];
      const SI_NO_NA = ["Si", "No", "N/A"];
      if (!SI_NO_NA.includes(soporte_seguridad_social)) {
        return res.status(400).json({ success: false, message: 'Debe indicar si presenta soporte de seguridad social.' });
      }
      if (!SI_NO.includes(notificacion_riesgo)) {
        return res.status(400).json({ success: false, message: 'Debe indicar si se hizo la notificación de riesgo y punto de encuentro.' });
      }
      if (!SI_NO.includes(autoriza_datos)) {
        return res.status(400).json({ success: false, message: 'Debe indicar si autoriza el tratamiento de datos personales.' });
      }

      // 1. Buscar si ya existe un visitante con este documento, SIN modificar nada todavía
      const visitanteExistente = await Visitor.findByDocumento(documento.trim());

      // 2. Si existe, verificar si ya tiene un ingreso activo (Dentro)
      if (visitanteExistente) {
        const activeEntry = await Entry.findActiveByVisitorId(visitanteExistente.id);
        if (activeEntry) {
          return res.status(409).json({
            success: false,
            message: 'Esta persona ya se encuentra dentro de las instalaciones. Debe registrar su salida antes de un nuevo ingreso.',
          });
        }
      }

      // 3. Solo si NO está dentro, se actualizan/crean los datos del visitante
      const { id: visitante_id } = await Visitor.upsert({
        nombre: nombre.trim(), documento: documento.trim(), empresa: empresa.trim(),
        tipo_persona: tipo_persona.trim(), telefono: telefono ? telefono.trim() : null(),
      });

      // 4. Y se registra la nueva entrada
      const foto = req.file ? req.file.filename : null;

      const ingresoId = await Entry.create({
        visitante_id,
        tipo_persona: tipo_persona.trim(),
        motivo: motivo ? motivo.trim() : null,
        foto,
        arl: arl ? arl.trim().slice(0, 100) : null,
        eps: eps ? eps.trim().slice(0, 100) : null,
        soporte_seguridad_social,
        notificacion_riesgo,
        autoriza_datos,
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
  /** GET /api/entries/evacuation — Lista para el Botón de Evacuación */
  async getEvacuationList(req, res) {
    try {
      const records = await Entry.findAllActive();
      return res.json({
        success: true,
        generatedAt: new Date().toISOString(),
        records,
      });
    } catch (err) {
      console.error('[entriesController.getEvacuationList]', err);
      return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
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
        Motivo: r.motivo || "",
        ARL: r.arl || "",
        EPS: r.eps || "",
        "Soporte seg. social": r.soporte_seguridad_social || "",
        "Soporte seg. social": r.soporte_seguridad_social || "",
        "Notificación riesgo y punto de encuentro": r.notificacion_riesgo || "",
        "Autoriza datos personales": r.autoriza_datos || "",
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

      // 1. Consultar el estado actual del ingreso antes de eliminar
      const [rows] = await pool.execute(
        "SELECT estado FROM ingresos WHERE id = ?",
        [parseInt(id)]
      );

      if (rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Registro no encontrado." });
      }

      // 2. Bloquear la eliminación si la persona sigue dentro
      if (rows[0].estado === "Dentro") {
        return res.status(409).json({
          success: false,
          message:
            "No se puede eliminar un registro de un visitante que está dentro de las instalaciones. Debe registrar su salida primero.",
        });
      }

      // 3. Si ya salió, proceder con la eliminación normal
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
