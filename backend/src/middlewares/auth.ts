// Protege rotas: só deixa passar quem enviar um token válido
// O app envia o cabeçalho:  Authorization: Bearer <token>
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

// Acrescenta "usuarioId" no tipo Request do Express
declare global {
  namespace Express {
    interface Request {
      usuarioId?: number;
    }
  }
}

export function autenticar(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ erro: "Token não enviado" });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as unknown as { sub: string };
    req.usuarioId = Number(payload.sub);
    next();
  } catch {
    return res.status(401).json({ erro: "Token inválido ou expirado" });
  }
}
