// Rotas de pets (JA02) — todas precisam de token
//   GET    /pets       -> lista os pets do tutor (tela "Meus pets")
//   GET    /pets/:id   -> detalhes de um pet
//   POST   /pets       -> cadastra um pet novo
//   PUT    /pets/:id   -> edita um pet
//   DELETE /pets/:id   -> remove um pet (se não tiver corridas)
import { Router } from "express";
import { autenticar } from "../middlewares/auth";
import { idParam, petSchema } from "../schemas";
import * as petsService from "../services/pets.service";

export const petsRoutes = Router();

petsRoutes.use(autenticar); // protege todas as rotas abaixo

petsRoutes.get("/", async (req, res) => {
  res.json(await petsService.listar(req.usuarioId!));
});

petsRoutes.get("/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  res.json(await petsService.buscar(id, req.usuarioId!));
});

petsRoutes.post("/", async (req, res) => {
  const dados = petSchema.parse(req.body);
  res.status(201).json(await petsService.criar(req.usuarioId!, dados));
});

petsRoutes.put("/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const dados = petSchema.parse(req.body);
  res.json(await petsService.atualizar(id, req.usuarioId!, dados));
});

petsRoutes.delete("/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  await petsService.remover(id, req.usuarioId!);
  res.status(204).send();
});
