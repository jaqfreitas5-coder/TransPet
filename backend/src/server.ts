// Ponto de entrada: sobe o servidor
import "dotenv/config";
import { app } from "./app";

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
  console.error("❌ Faltam variáveis no .env (DATABASE_URL e JWT_SECRET). Copie o .env.example.");
  process.exit(1);
}

const PORT = Number(process.env.PORT) || 3333;

app.listen(PORT, () => {
  console.log(`🚀 API TransPet rodando em http://localhost:${PORT}`);
});
