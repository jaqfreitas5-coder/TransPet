// Repositório: SQL das tabelas "categorias" e "extras" (dados fixos do catálogo)
import { db } from "../db";

export type Categoria = {
  id: number;
  nome: string;
  descricao: string;
  preco_base: number;
  preco_por_km: number;
  ilustrativa: boolean;
  ativa: boolean;
};

export type Extra = { id: number; nome: string; preco: number };

// NUMERIC vem do PostgreSQL como texto; "::float" converte para número
export async function listarCategorias(): Promise<Categoria[]> {
  const { rows } = await db.query(
    `SELECT id, nome, descricao, preco_base::float, preco_por_km::float, ilustrativa, ativa
       FROM categorias WHERE ativa ORDER BY id`
  );
  return rows;
}

export async function listarExtras(): Promise<Extra[]> {
  const { rows } = await db.query("SELECT id, nome, preco::float FROM extras ORDER BY id");
  return rows;
}

export async function buscarExtrasPorIds(ids: number[]): Promise<Extra[]> {
  if (ids.length === 0) return [];
  const { rows } = await db.query(
    "SELECT id, nome, preco::float FROM extras WHERE id = ANY($1::int[]) ORDER BY id",
    [ids]
  );
  return rows;
}
