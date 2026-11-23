// Regras de negócio das corridas (JA03, JA05, JA06)
import { db } from "../db";
import { AppError } from "../errors";
import * as catalogoRepo from "../repositories/catalogo.repository";
import * as corridasRepo from "../repositories/corridas.repository";
import * as petsRepo from "../repositories/pets.repository";
import * as preco from "./preco.service";
import * as sim from "./simulacao.service";

type NovaCorrida = {
  petId: number;
  categoriaId: number;
  origem: string;
  destino: string;
  extras: number[];
  agendadaPara?: Date;
};

export async function solicitar(usuarioId: number, dados: NovaCorrida) {
  const pet = await petsRepo.buscarDoUsuario(dados.petId, usuarioId);
  if (!pet) throw new AppError(404, "Pet não encontrado");

  const categorias = await catalogoRepo.listarCategorias();
  const categoria = preco.garantirCategoriaDisponivel(
    categorias.find((c) => c.id === dados.categoriaId), pet
  );

  const extras = await catalogoRepo.buscarExtrasPorIds(dados.extras);
  if (extras.length !== new Set(dados.extras).size) {
    throw new AppError(400, "Algum extra informado não existe");
  }

  if (dados.agendadaPara && dados.agendadaPara.getTime() < Date.now() + 5 * 60 * 1000) {
    throw new AppError(400, "O agendamento deve ser pelo menos 5 minutos no futuro");
  }

  // Mesmo cálculo da estimativa, refeito no servidor (o app não decide o preço)
  const distanciaKm = preco.simularDistanciaKm(dados.origem, dados.destino);
  const { valorTotal } = preco.calcularValor(categoria, distanciaKm, extras);

  const client = await db.connect();
  let id: number;
  try {
    await client.query("BEGIN");
    const corrida = await corridasRepo.criar(client, {
      usuarioId, petId: pet.id, categoriaId: categoria.id,
      origem: dados.origem, destino: dados.destino, distanciaKm,
      agendadaPara: dados.agendadaPara ?? null,
      tempoEstimadoMin: preco.estimarTempoMin(distanciaKm),
      valor: valorTotal,
    });
    await corridasRepo.adicionarExtras(client, corrida.id, [...new Set(dados.extras)]);
    await client.query("COMMIT");
    id = corrida.id;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  return buscar(id, usuarioId);
}

async function carregar(id: number, usuarioId: number) {
  const corrida = await corridasRepo.buscarDoUsuario(id, usuarioId);
  if (!corrida) throw new AppError(404, "Corrida não encontrada");
  return corrida;
}

// Monta a resposta completa que as telas usam
async function montar(c: corridasRepo.CorridaRow) {
  const d = await corridasRepo.detalhes(c.id);
  const avaliacao = await corridasRepo.buscarAvaliacao(c.id);
  const media = d.mot_id ? await corridasRepo.mediaMotorista(d.mot_id) : null;
  return {
    id: c.id,
    status: c.status,
    statusTexto: sim.TEXTO_STATUS[c.status],
    etapas: sim.ORDEM.map((s) => ({
      status: s,
      texto: sim.TEXTO_STATUS[s],
      concluida: c.status !== "CANCELADA" && sim.ORDEM.indexOf(s) <= sim.ORDEM.indexOf(c.status),
    })),
    etaMinutos: sim.etaMinutos(c),
    origem: c.origem,
    destino: c.destino,
    distanciaKm: c.distancia_km,
    tempoEstimadoMin: c.tempo_estimado_min,
    agendadaPara: c.agendada_para,
    valor: c.valor,
    pet: { id: d.pet_id, nome: d.pet_nome, especie: d.especie, porte: d.porte },
    categoria: { id: d.cat_id, nome: d.cat_nome },
    motorista: d.mot_id
      ? { id: d.mot_id, nome: d.mot_nome, fotoUrl: d.mot_foto,
          veiculo: d.veiculo_modelo, placa: d.veiculo_placa,
          mediaEstrelas: media?.media ?? null, totalAvaliacoes: media?.total ?? 0 }
      : null,
    extras: d.extras,
    avaliacao: avaliacao ?? null,
    podeAvaliar: c.status === "CONCLUIDA" && !avaliacao,
    criadoEm: c.criado_em,
  };
}

export async function buscar(id: number, usuarioId: number) {
  const corrida = await sim.sincronizar(await carregar(id, usuarioId));
  return montar(corrida);
}

export async function avancar(id: number, usuarioId: number) {
  const corrida = await sim.sincronizar(await carregar(id, usuarioId));
  if (corrida.status === "CONCLUIDA" || corrida.status === "CANCELADA") {
    throw new AppError(409, "Esta corrida já foi encerrada");
  }
  return montar(await sim.avancarManual(corrida));
}

export async function cancelar(id: number, usuarioId: number) {
  const corrida = await sim.sincronizar(await carregar(id, usuarioId));
  if (!["SOLICITADA", "MOTORISTA_CONFIRMADO", "A_CAMINHO"].includes(corrida.status)) {
    throw new AppError(409, "Não é possível cancelar: a viagem já começou ou foi encerrada");
  }
  await corridasRepo.atualizarStatus(corrida.id, "CANCELADA", new Date(), corrida.motorista_id);
  corrida.status = "CANCELADA";
  return montar(corrida);
}

// ---------- Histórico (JA08) ----------
export async function historico(usuarioId: number) {
  const corridas = await corridasRepo.listarDoUsuario(usuarioId);
  const lista = [];
  for (const c of corridas) {
    await sim.sincronizar(c); // garante o status atualizado
    const d = await corridasRepo.detalhes(c.id);
    const avaliacao = await corridasRepo.buscarAvaliacao(c.id);
    lista.push({
      id: c.id,
      data: c.agendada_para ?? c.criado_em,
      origem: c.origem,
      destino: c.destino,
      valor: c.valor,
      status: c.status,
      statusTexto: sim.TEXTO_STATUS[c.status],
      pet: d.pet_nome,
      categoria: d.cat_nome,
      motorista: d.mot_nome ?? null,
      estrelas: avaliacao?.estrelas ?? null,
    });
  }
  return lista;
}

// ---------- Avaliação (JA07) ----------
export async function avaliar(id: number, usuarioId: number, estrelas: number, comentario?: string) {
  const corrida = await sim.sincronizar(await carregar(id, usuarioId));
  if (corrida.status !== "CONCLUIDA") {
    throw new AppError(409, "Só é possível avaliar uma corrida concluída");
  }
  if (await corridasRepo.buscarAvaliacao(id)) {
    throw new AppError(409, "Esta corrida já foi avaliada");
  }
  await corridasRepo.criarAvaliacao(id, estrelas, comentario?.trim() || null);
  return montar(corrida);
}
