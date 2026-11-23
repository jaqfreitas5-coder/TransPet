// Repositório: todo o SQL da tabela "pets" fica aqui
import { PoolClient } from "pg";
import { db } from "../db";

export type Especie = "CACHORRO" | "GATO" | "SILVESTRE";
export type Porte = "PEQUENO" | "MEDIO" | "GRANDE";

export type NovoPet = {
  nome: string;
  especie: Especie;
  raca?: string | null;
  porte: Porte;
  idade?: number | null;
  observacoes?: string | null;
  fotoUrl?: string | null;
};

export async function criar(client: PoolClient | typeof db, usuarioId: number, pet: NovoPet) {
  const { rows } = await client.query(
    `INSERT INTO pets (usuario_id, nome, especie, raca, porte, idade, observacoes, foto_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [usuarioId, pet.nome, pet.especie, pet.raca ?? null, pet.porte, pet.idade ?? null,
     pet.observacoes ?? null, pet.fotoUrl ?? null]
  );
  return rows[0];
}

export async function listarDoUsuario(usuarioId: number) {
  const { rows } = await db.query(
    "SELECT * FROM pets WHERE usuario_id = $1 ORDER BY criado_em",
    [usuarioId]
  );
  return rows;
}

// Busca só se o pet for do usuário (um tutor não vê pet de outro)
export async function buscarDoUsuario(id: number, usuarioId: number) {
  const { rows } = await db.query(
    "SELECT * FROM pets WHERE id = $1 AND usuario_id = $2",
    [id, usuarioId]
  );
  return rows[0];
}

export async function atualizar(id: number, pet: NovoPet) {
  const { rows } = await db.query(
    `UPDATE pets
        SET nome = $2, especie = $3, raca = $4, porte = $5, idade = $6, observacoes = $7, foto_url = $8
      WHERE id = $1
      RETURNING *`,
    [id, pet.nome, pet.especie, pet.raca ?? null, pet.porte, pet.idade ?? null,
     pet.observacoes ?? null, pet.fotoUrl ?? null]
  );
  return rows[0];
}

export async function contarCorridas(id: number): Promise<number> {
  const { rows } = await db.query("SELECT COUNT(*)::int AS total FROM corridas WHERE pet_id = $1", [id]);
  return rows[0].total;
}

export async function remover(id: number) {
  await db.query("DELETE FROM pets WHERE id = $1", [id]);
}
