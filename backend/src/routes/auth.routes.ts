// Rotas de cadastro e login (JA01)
//   POST /auth/cadastro   -> cria tutor (+ pet opcional) e devolve token
//   POST /auth/login      -> devolve token
//   GET  /auth/me         -> dados do tutor logado + pets (precisa de token)
import { Router } from "express";
import { z } from "zod";
import { autenticar } from "../middlewares/auth";
import * as authService from "../services/auth.service";
import { petSchema } from "../schemas";

export const authRoutes = Router();

// Validações (regras vindas do layout e do mapeamento)

const cadastroSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo"),
  email: z.email("E-mail inválido").transform((e) => e.toLowerCase()),
  telefone: z.string().regex(/^\d{10,11}$/, "Telefone com DDD, só números (10 ou 11 dígitos)"),
  senha: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
  pet: petSchema.optional(),
});

const loginSchema = z.object({
  email: z.email("E-mail inválido").transform((e) => e.toLowerCase()),
  senha: z.string().min(1, "Informe a senha"),
});

authRoutes.post("/cadastro", async (req, res) => {
  const dados = cadastroSchema.parse(req.body);
  const resultado = await authService.cadastrar(dados);
  res.status(201).json(resultado);
});

authRoutes.post("/login", async (req, res) => {
  const { email, senha } = loginSchema.parse(req.body);
  res.json(await authService.login(email, senha));
});

authRoutes.get("/me", autenticar, async (req, res) => {
  res.json(await authService.meusDados(req.usuarioId!));
});

