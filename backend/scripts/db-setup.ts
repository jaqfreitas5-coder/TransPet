// Cria as tabelas e insere os dados iniciais.
// Rode com: npm run db:setup   (ATENÇÃO: apaga os dados existentes)
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const schema = readFileSync(join(__dirname, "..", "db", "schema.sql"), "utf8");
  const seed = readFileSync(join(__dirname, "..", "db", "seed.sql"), "utf8");

  await pool.query(schema);
  console.log("✅ Tabelas criadas");
  await pool.query(seed);
  console.log("✅ Dados iniciais inseridos (4 categorias, 3 extras, 3 motoristas)");
  await pool.end();
}

main().catch((e) => {
  console.error("❌ Erro:", e.message);
  process.exit(1);
});
