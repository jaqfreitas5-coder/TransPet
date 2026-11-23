// Rotas do catálogo (JA04) — públicas, não precisam de token
//   GET /categorias  -> categorias de transporte
//   GET /extras      -> música ambiente, mantas, petiscos
import { Router } from "express";
import * as catalogoRepo from "../repositories/catalogo.repository";

export const catalogoRoutes = Router();

catalogoRoutes.get("/categorias", async (_req, res) => {
  res.json(await catalogoRepo.listarCategorias());
});

catalogoRoutes.get("/extras", async (_req, res) => {
  res.json(await catalogoRepo.listarExtras());
});
