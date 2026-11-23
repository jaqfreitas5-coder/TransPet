// Configuração do Express: middlewares e rotas
import express from "express";
import cors from "cors";
import path from "node:path";
import { healthRoutes } from "./routes/health.routes";
import { authRoutes } from "./routes/auth.routes";
import { petsRoutes } from "./routes/pets.routes";
import { catalogoRoutes } from "./routes/catalogo.routes";
import { corridasRoutes } from "./routes/corridas.routes";
import { errorHandler } from "./errors";

export const app = express();

app.use(cors());          // permite que o app (frontend) chame a API
app.use(express.json());  // permite receber JSON no corpo das requisições

// Frontend do protótipo (pasta /frontend na raiz do repositório): http://localhost:3333/demo/
app.use("/demo", express.static(path.resolve(__dirname, "..", "..", "frontend")));
app.get("/", (_req, res) => res.redirect("/demo/"));

app.use("/health", healthRoutes);
app.use("/auth", authRoutes);
app.use("/pets", petsRoutes);
app.use("/", catalogoRoutes);          // /categorias e /extras
app.use("/corridas", corridasRoutes);

// Rota não encontrada
app.use((_req, res) => {
  res.status(404).json({ erro: "Rota não encontrada" });
});

// Erros (sempre por último)
app.use(errorHandler);
