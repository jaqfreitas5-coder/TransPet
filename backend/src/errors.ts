// Tratamento de erros centralizado
import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

// Erro "esperado" da aplicação (ex.: e-mail já cadastrado)
export class AppError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Middleware que transforma qualquer erro numa resposta JSON padronizada
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      erro: "Dados inválidos",
      campos: err.issues.map((i) => ({ campo: i.path.join("."), mensagem: i.message })),
    });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ erro: err.message });
  }
  // JSON mal formatado no corpo da requisição
  if ((err as { type?: string }).type === "entity.parse.failed") {
    return res.status(400).json({ erro: "JSON inválido no corpo da requisição" });
  }
  console.error(err);
  return res.status(500).json({ erro: "Erro interno do servidor" });
}
