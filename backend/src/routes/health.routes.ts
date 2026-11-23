// Rota de verificação: confirma que a API e o banco estão funcionando
import { Router } from "express";
import { db } from "../db";

export const healthRoutes = Router();

healthRoutes.get("/", async (_req, res) => {
  try {
    const { rows } = await db.query("SELECT COUNT(*)::int AS total FROM categorias");
    res.json({ status: "ok", banco: "conectado", categorias: rows[0].total });
  } catch (e) {
    res.status(500).json({ status: "erro", banco: "desconectado", detalhe: (e as Error).message });
  }
});
