// Repositório: SQL das tabelas "corridas", "corrida_extras" e "motoristas"
import { PoolClient } from "pg";
import { db } from "../db";

export type Status =
  | "SOLICITADA" | "MOTORISTA_CONFIRMADO" | "A_CAMINHO" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA";

export type CorridaRow = {
  id: number;
  usuario_id: number;
  pet_id: number;
  categoria_id: number;
  motorista_id: number | null;
  origem: string;
  destino: string;
  distancia_km: number;
  agendada_para: Date | null;
  tempo_estimado_min: number;
  valor: number;
  status: Status;
  status_alterado_em: Date;
  criado_em: Date;
};

const COLUNAS = `id, usuario_id, pet_id, categoria_id, motorista_id, origem, destino,
  distancia_km::float, agendada_para, tempo_estimado_min, valor::float, status,
  status_alterado_em, criado_em`;

export async function criar(
  client: PoolClient,
  c: {
    usuarioId: number; petId: number; categoriaId: number; origem: string; destino: string;
    distanciaKm: number; agendadaPara: Date | null; tempoEstimadoMin: number; valor: number;
  }
): Promise<CorridaRow> {
  const { rows } = await client.query(
    `INSERT INTO corridas (usuario_id, pet_id, categoria_id, origem, destino, distancia_km,
                           agendada_para, tempo_estimado_min, valor)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING ${COLUNAS}`,
    [c.usuarioId, c.petId, c.categoriaId, c.origem, c.destino, c.distanciaKm,
     c.agendadaPara, c.tempoEstimadoMin, c.valor]
  );
  return rows[0];
}

export async function adicionarExtras(client: PoolClient, corridaId: number, extrasIds: number[]) {
  for (const extraId of extrasIds) {
    await client.query("INSERT INTO corrida_extras (corrida_id, extra_id) VALUES ($1, $2)", [corridaId, extraId]);
  }
}

export async function buscarDoUsuario(id: number, usuarioId: number): Promise<CorridaRow | undefined> {
  const { rows } = await db.query(
    `SELECT ${COLUNAS} FROM corridas WHERE id = $1 AND usuario_id = $2`,
    [id, usuarioId]
  );
  return rows[0];
}

export async function atualizarStatus(
  id: number, status: Status, alteradoEm: Date, motoristaId: number | null
) {
  await db.query(
    `UPDATE corridas
        SET status = $2, status_alterado_em = $3, motorista_id = $4, atualizado_em = NOW()
      WHERE id = $1`,
    [id, status, alteradoEm, motoristaId]
  );
}

// Motorista fictício da categoria (sorteado)
export async function sortearMotorista(categoriaId: number): Promise<number | null> {
  const { rows } = await db.query(
    "SELECT id FROM motoristas WHERE categoria_id = $1 ORDER BY random() LIMIT 1",
    [categoriaId]
  );
  return rows[0]?.id ?? null;
}

// Junta tudo que a tela precisa: pet, categoria, motorista e extras
export async function detalhes(id: number) {
  const { rows } = await db.query(
    `SELECT p.id AS pet_id, p.nome AS pet_nome, p.especie, p.porte,
            c.id AS cat_id, c.nome AS cat_nome,
            m.id AS mot_id, m.nome AS mot_nome, m.foto_url AS mot_foto,
            m.veiculo_modelo, m.veiculo_placa
       FROM corridas co
       JOIN pets p        ON p.id = co.pet_id
       JOIN categorias c  ON c.id = co.categoria_id
       LEFT JOIN motoristas m ON m.id = co.motorista_id
      WHERE co.id = $1`,
    [id]
  );
  const { rows: extras } = await db.query(
    `SELECT e.id, e.nome, e.preco::float
       FROM corrida_extras ce JOIN extras e ON e.id = ce.extra_id
      WHERE ce.corrida_id = $1 ORDER BY e.id`,
    [id]
  );
  return { ...rows[0], extras };
}

// ---------- Histórico (JA08) ----------
export async function listarDoUsuario(usuarioId: number): Promise<CorridaRow[]> {
  const { rows } = await db.query(
    `SELECT ${COLUNAS} FROM corridas WHERE usuario_id = $1 ORDER BY criado_em DESC, id DESC`,
    [usuarioId]
  );
  return rows;
}

// ---------- Avaliação (JA07) ----------
export type Avaliacao = { id: number; estrelas: number; comentario: string | null; criado_em: Date };

export async function buscarAvaliacao(corridaId: number): Promise<Avaliacao | undefined> {
  const { rows } = await db.query(
    "SELECT id, estrelas, comentario, criado_em FROM avaliacoes WHERE corrida_id = $1",
    [corridaId]
  );
  return rows[0];
}

export async function criarAvaliacao(corridaId: number, estrelas: number, comentario: string | null) {
  const { rows } = await db.query(
    `INSERT INTO avaliacoes (corrida_id, estrelas, comentario)
     VALUES ($1, $2, $3) RETURNING id, estrelas, comentario, criado_em`,
    [corridaId, estrelas, comentario]
  );
  return rows[0] as Avaliacao;
}

// Média de estrelas da motorista (mostrada junto com os dados dela)
export async function mediaMotorista(motoristaId: number) {
  const { rows } = await db.query(
    `SELECT ROUND(AVG(a.estrelas)::numeric, 1)::float AS media, COUNT(*)::int AS total
       FROM avaliacoes a JOIN corridas c ON c.id = a.corrida_id
      WHERE c.motorista_id = $1`,
    [motoristaId]
  );
  return rows[0] as { media: number | null; total: number };
}
