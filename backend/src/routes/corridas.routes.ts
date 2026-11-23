// Rotas de corridas — todas precisam de token
//   POST  /corridas/estimativa     -> valor e tempo de cada categoria (JA03/JA04)
//   POST  /corridas                -> confirma e cria a corrida (JA05)
//   GET   /corridas/:id            -> status, motorista e "chegada em X min" (JA05/JA06)
//   POST  /corridas/:id/avancar    -> avança o status manualmente (demonstração)
//   POST  /corridas/:id/cancelar   -> cancela antes da viagem começar
//   POST  /corridas/:id/avaliacao  -> estrelas + comentário opcional (JA07)
//   GET   /corridas                -> histórico do tutor (JA08)
import { Router } from "express";
import { z } from "zod";
import { autenticar } from "../middlewares/auth";
import { idParam } from "../schemas";
import * as estimativaService from "../services/estimativa.service";
import * as corridasService from "../services/corridas.service";

export const corridasRoutes = Router();

corridasRoutes.use(autenticar);

const estimativaSchema = z.object({
  petId: z.number().int().positive("Selecione um pet"),
  origem: z.string().trim().min(3, "Informe o endereço de partida"),
  destino: z.string().trim().min(3, "Informe o endereço de destino"),
  extras: z.array(z.number().int().positive()).default([]),
});

const corridaSchema = estimativaSchema.extend({
  categoriaId: z.number().int().positive("Selecione uma categoria"),
  // data/hora no formato ISO, ex.: "2026-11-25T14:30:00-03:00". Vazio = corrida imediata
  agendadaPara: z.coerce.date("Data de agendamento inválida").optional(),
});

const avaliacaoSchema = z.object({
  estrelas: z.number().int().min(1, "Mínimo 1 estrela").max(5, "Máximo 5 estrelas"),
  comentario: z.string().max(500, "Comentário muito longo (máx. 500)").optional(),
});

corridasRoutes.get("/", async (req, res) => {
  res.json(await corridasService.historico(req.usuarioId!));
});

corridasRoutes.post("/estimativa", async (req, res) => {
  const dados = estimativaSchema.parse(req.body);
  res.json(await estimativaService.estimar(req.usuarioId!, dados));
});

corridasRoutes.post("/", async (req, res) => {
  const dados = corridaSchema.parse(req.body);
  res.status(201).json(await corridasService.solicitar(req.usuarioId!, dados));
});

corridasRoutes.get("/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  res.json(await corridasService.buscar(id, req.usuarioId!));
});

corridasRoutes.post("/:id/avancar", async (req, res) => {
  const id = idParam.parse(req.params.id);
  res.json(await corridasService.avancar(id, req.usuarioId!));
});

corridasRoutes.post("/:id/cancelar", async (req, res) => {
  const id = idParam.parse(req.params.id);
  res.json(await corridasService.cancelar(id, req.usuarioId!));
});

corridasRoutes.post("/:id/avaliacao", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const { estrelas, comentario } = avaliacaoSchema.parse(req.body);
  res.status(201).json(await corridasService.avaliar(id, req.usuarioId!, estrelas, comentario));
});
