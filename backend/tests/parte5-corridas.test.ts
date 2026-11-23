// Testes automáticos da Parte 5 (corridas e simulação)
// Com a API rodando (npm run dev), em outro terminal:  npm run test:parte5
// ⏱️ Demora ~25 segundos, porque espera a simulação automática avançar.
import { teste, resumo, API } from "./helpers";

const esperar = (s: number) => new Promise((r) => setTimeout(r, s * 1000));

async function post(rota: string, token: string, body: unknown) {
  const r = await fetch(API + rota, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function main() {
  console.log(`\n🧪 Testando Parte 5 em ${API}  (leva ~25s)\n`);

  const cad = await (await fetch(`${API}/auth/cadastro`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nome: "Paula Rocha", email: `paula${Date.now()}@teste.com`, telefone: "11987654321", senha: "123456",
      pet: { nome: "Thor", especie: "CACHORRO", porte: "MEDIO" },
    }),
  })).json();
  const token = cad.token as string;
  const petId = cad.pet.id as number;

  const rota = { origem: "Rua Endereço, 123", destino: "Clínica Vet, 50" };
  const est = await post("/corridas/estimativa", token, { petId, ...rota, extras: [2] });
  const padrao = est.categorias.find((c: any) => c.nome === "Pet Padrão");
  const felino = est.categorias.find((c: any) => c.nome === "Pet Felino");
  const ambulancia = est.categorias.find((c: any) => c.nome === "Ambulância Pet");

  // ---------- Corrida com avanço MANUAL ----------
  let id = 0;
  await teste("Confirmar corrida → 201, status SOLICITADA, sem motorista ainda", "POST", "/corridas", {
    token, body: { petId, categoriaId: padrao.id, ...rota, extras: [2] }, espera: 201,
    checar: (r) => { id = r.id; return r.status === "SOLICITADA" && r.motorista === null; },
  });

  await teste("Valor da corrida = valor mostrado na estimativa", "GET", `/corridas/${id}`, {
    token, espera: 200, checar: (r) => r.valor === padrao.valorTotal && r.extras[0].nome === "Mantas",
  });

  await teste("Avançar → MOTORISTA_CONFIRMADO com motorista e placa", "POST", `/corridas/${id}/avancar`, {
    token, espera: 200,
    checar: (r) => r.status === "MOTORISTA_CONFIRMADO" && r.motorista?.placa && r.motorista?.veiculo,
  });

  await teste("Avançar → A_CAMINHO com 'chegada em X minutos'", "POST", `/corridas/${id}/avancar`, {
    token, espera: 200, checar: (r) => r.status === "A_CAMINHO" && r.etaMinutos >= 1,
  });

  await teste("Avançar → EM_ANDAMENTO (cancelar não é mais permitido)", "POST", `/corridas/${id}/avancar`, {
    token, espera: 200, checar: (r) => r.status === "EM_ANDAMENTO",
  });

  await teste("Cancelar viagem em andamento → 409", "POST", `/corridas/${id}/cancelar`, {
    token, espera: 409,
  });

  await teste("Avançar → CONCLUIDA, todas as etapas marcadas", "POST", `/corridas/${id}/avancar`, {
    token, espera: 200,
    checar: (r) => r.status === "CONCLUIDA" && r.statusTexto === "Viagem concluída!" && r.etapas.every((e: any) => e.concluida),
  });

  await teste("Avançar corrida concluída → 409", "POST", `/corridas/${id}/avancar`, { token, espera: 409 });

  await teste("Pet com corrida não pode ser removido → 409", "DELETE", `/pets/${petId}`, { token, espera: 409 });

  // ---------- Cancelamento ----------
  const paraCancelar = await post("/corridas", token, { petId, categoriaId: padrao.id, ...rota });
  await teste("Cancelar antes da viagem → CANCELADA", "POST", `/corridas/${paraCancelar.id}/cancelar`, {
    token, espera: 200, checar: (r) => r.status === "CANCELADA",
  });

  // ---------- Validações ----------
  await teste("Categoria incompatível (Felino para cachorro) → 422", "POST", "/corridas", {
    token, body: { petId, categoriaId: felino.id, ...rota }, espera: 422,
  });

  await teste("Ambulância (ilustrativa) → 422", "POST", "/corridas", {
    token, body: { petId, categoriaId: ambulancia.id, ...rota }, espera: 422,
  });

  await teste("Agendamento no passado → 400", "POST", "/corridas", {
    token, body: { petId, categoriaId: padrao.id, ...rota, agendadaPara: "2020-01-01T10:00:00-03:00" }, espera: 400,
  });

  await teste("Sem categoria → 400", "POST", "/corridas", { token, body: { petId, ...rota }, espera: 400 });

  await teste("Corrida inexistente → 404", "GET", "/corridas/999999", { token, espera: 404 });

  // ---------- Simulação AUTOMÁTICA ----------
  const auto = await post("/corridas", token, { petId, categoriaId: padrao.id, ...rota });
  const daquiUmaHora = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const agendada = await post("/corridas", token, { petId, categoriaId: padrao.id, ...rota, agendadaPara: daquiUmaHora });

  console.log("\n  ⏳ Esperando a simulação automática (22s)...\n");
  await esperar(22);

  await teste("Automático: após ~20s a corrida está A_CAMINHO", "GET", `/corridas/${auto.id}`, {
    token, espera: 200, checar: (r) => r.status === "A_CAMINHO" && r.motorista !== null,
  });

  await teste("Agendada para daqui 1h: motorista confirmado, mas espera o horário", "GET", `/corridas/${agendada.id}`, {
    token, espera: 200, checar: (r) => r.status === "MOTORISTA_CONFIRMADO" && r.agendadaPara !== null,
  });

  resumo();
}

main();
