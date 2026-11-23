// Simulação do andamento da corrida (o mapeamento permite simular motorista e rastreamento)
//
// Como funciona: sempre que o app consulta a corrida, calculamos quanto tempo passou
// desde a última mudança de status e avançamos as etapas que já "venceram".
// Assim não dependemos de timers rodando no servidor.
//
// Tempo de cada etapa (com SIMULACAO_ETAPA_SEGUNDOS = 10):
//   SOLICITADA           → MOTORISTA_CONFIRMADO  após 10s  ("procurando motorista")
//   MOTORISTA_CONFIRMADO → A_CAMINHO             após 10s  (ou no horário agendado)
//   A_CAMINHO            → EM_ANDAMENTO          após 20s
//   EM_ANDAMENTO         → CONCLUIDA             após 30s
import { CorridaRow, Status, atualizarStatus, sortearMotorista } from "../repositories/corridas.repository";

export const ORDEM: Status[] = ["SOLICITADA", "MOTORISTA_CONFIRMADO", "A_CAMINHO", "EM_ANDAMENTO", "CONCLUIDA"];

export const TEXTO_STATUS: Record<Status, string> = {
  SOLICITADA: "Procurando motorista...",
  MOTORISTA_CONFIRMADO: "Motorista confirmado",
  A_CAMINHO: "Motorista a caminho",
  EM_ANDAMENTO: "Viagem em andamento",
  CONCLUIDA: "Viagem concluída!",
  CANCELADA: "Corrida cancelada",
};

function etapaSegundos() {
  return Number(process.env.SIMULACAO_ETAPA_SEGUNDOS) || 10;
}

function automatica() {
  return process.env.SIMULACAO_AUTOMATICA !== "false";
}

// Quantas "etapas" de tempo cada status dura
const MULTIPLICADOR: Partial<Record<Status, number>> = {
  SOLICITADA: 1,
  MOTORISTA_CONFIRMADO: 1,
  A_CAMINHO: 2,
  EM_ANDAMENTO: 3,
};

export function duracaoMs(status: Status) {
  return (MULTIPLICADOR[status] ?? 0) * etapaSegundos() * 1000;
}

export function proximo(status: Status): Status | null {
  const i = ORDEM.indexOf(status);
  return i >= 0 && i < ORDEM.length - 1 ? ORDEM[i + 1] : null;
}

// Momento em que o status atual deve avançar
function momentoDeAvancar(c: CorridaRow): number {
  let t = new Date(c.status_alterado_em).getTime() + duracaoMs(c.status);
  // Corrida agendada: o motorista só sai a caminho no horário marcado
  if (c.status === "MOTORISTA_CONFIRMADO" && c.agendada_para) {
    t = Math.max(t, new Date(c.agendada_para).getTime());
  }
  return t;
}

// Aplica uma mudança de status (sorteia o motorista quando ele é confirmado)
async function aplicar(c: CorridaRow, novo: Status, quando: Date) {
  if (novo === "MOTORISTA_CONFIRMADO" && !c.motorista_id) {
    c.motorista_id = await sortearMotorista(c.categoria_id);
  }
  c.status = novo;
  c.status_alterado_em = quando;
  await atualizarStatus(c.id, novo, quando, c.motorista_id);
}

// Avança automaticamente tudo que já venceu
export async function sincronizar(c: CorridaRow): Promise<CorridaRow> {
  if (!automatica()) return c;
  const agora = Date.now();
  let seguinte = proximo(c.status);
  while (seguinte && momentoDeAvancar(c) <= agora) {
    await aplicar(c, seguinte, new Date(momentoDeAvancar(c)));
    seguinte = proximo(c.status);
  }
  return c;
}

// Avanço manual (botão de demonstração na apresentação)
export async function avancarManual(c: CorridaRow): Promise<CorridaRow> {
  const seguinte = proximo(c.status);
  if (seguinte) await aplicar(c, seguinte, new Date());
  return c;
}

// "Chegada em X minutos" do layout
export function etaMinutos(c: CorridaRow): number | null {
  const restante = Math.max(0, momentoDeAvancar(c) - Date.now());
  const fracao = duracaoMs(c.status) > 0 ? restante / duracaoMs(c.status) : 0;
  if (c.status === "MOTORISTA_CONFIRMADO" || c.status === "A_CAMINHO") {
    // tempo até o motorista chegar na origem (simulado: até 5 min)
    return Math.max(1, Math.ceil(5 * (c.status === "A_CAMINHO" ? fracao : 1)));
  }
  if (c.status === "EM_ANDAMENTO") {
    return Math.max(1, Math.ceil(c.tempo_estimado_min * fracao));
  }
  return null;
}
