// Repositório: todo o SQL da tabela "usuarios" fica aqui
import { PoolClient } from "pg";
import { db } from "../db";

export type Usuario = {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  senha_hash: string;
  criado_em: Date;
};

export async function buscarPorEmail(email: string): Promise<Usuario | undefined> {
  const { rows } = await db.query("SELECT * FROM usuarios WHERE email = $1", [email]);
  return rows[0];
}

export async function buscarPorId(id: number): Promise<Usuario | undefined> {
  const { rows } = await db.query("SELECT * FROM usuarios WHERE id = $1", [id]);
  return rows[0];
}

// "client" permite rodar dentro de uma transação (cadastro tutor + pet juntos)
export async function criar(
  client: PoolClient,
  dados: { nome: string; email: string; telefone: string; senhaHash: string }
): Promise<Usuario> {
  const { rows } = await client.query(
    `INSERT INTO usuarios (nome, email, telefone, senha_hash)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [dados.nome, dados.email, dados.telefone, dados.senhaHash]
  );
  return rows[0];
}
