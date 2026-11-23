// Testes automáticos da Parte 6 (avaliação e histórico)
// Com a API rodando (npm run dev), em outro terminal:  npm run test:parte6
import { teste, resumo, API } from "./helpers";

async function post(rota: string, token: string, body: unknown = {}) {
  const r = await fetch(API + rota, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function novoTutor(nome: string) {
  const r = await (await fetch(`${API}/auth/cadastro`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nome, email: `${nome.split(" ")[0].toLowerCase()}${Date.now()}@teste.com`,
      telefone: "11987654321", senha: "123456",
      pet: { nome: "Luna", especie: "GATO", porte: "PEQUENO" },
    }),
  })).json();
  return { token: r.token as string, petId: r.pet.id as number };
}

async function main() {
  console.log(`\n🧪 Testando Parte 6 em ${API}\n`);

  const { token, petId } = await novoTutor("Renata Alves");
  const outro = await novoTutor("Bruno Costa");
  const rota = { origem: "Rua A, 10", destino: "Pet Shop Central, 200" };

  // Felino (id 3 no seed) para gato
  const concluida = await post("/corridas", token, { petId, categoriaId: 3, ...rota });
  const emAndamento = await post("/corridas", token, { petId, categoriaId: 3, ...rota });

  await teste("Histórico mostra as 2 corridas (mais recente primeiro)", "GET", "/corridas", {
    token, espera: 200, checar: (r) => r.length === 2 && r[0].id === emAndamento.id,
  });

  await teste("Avaliar corrida ainda não concluída → 409", "POST", `/corridas/${concluida.id}/avaliacao`, {
    token, body: { estrelas: 5 }, espera: 409,
  });

  for (let i = 0; i < 4; i++) await post(`/corridas/${concluida.id}/avancar`, token);

  await teste("Corrida concluída: podeAvaliar = true", "GET", `/corridas/${concluida.id}`, {
    token, espera: 200, checar: (r) => r.status === "CONCLUIDA" && r.podeAvaliar === true && r.avaliacao === null,
  });

  await teste("Avaliar com 6 estrelas → 400", "POST", `/corridas/${concluida.id}/avaliacao`, {
    token, body: { estrelas: 6 }, espera: 400,
  });

  await teste("Outro tutor não avalia corrida alheia → 404", "POST", `/corridas/${concluida.id}/avaliacao`, {
    token: outro.token, body: { estrelas: 1 }, espera: 404,
  });

  await teste("Avaliar com 5 estrelas + comentário → 201", "POST", `/corridas/${concluida.id}/avaliacao`, {
    token, body: { estrelas: 5, comentario: "A Luna chegou tranquila, motorista muito cuidadosa!" }, espera: 201,
    checar: (r) => r.avaliacao.estrelas === 5 && r.podeAvaliar === false && r.motorista.totalAvaliacoes >= 1,
  });

  await teste("Avaliar de novo → 409", "POST", `/corridas/${concluida.id}/avaliacao`, {
    token, body: { estrelas: 3 }, espera: 409,
  });

  await teste("Avaliar corrida em andamento → 409", "POST", `/corridas/${emAndamento.id}/avaliacao`, {
    token, body: { estrelas: 4 }, espera: 409,
  });

  await teste("Histórico mostra as estrelas da corrida avaliada", "GET", "/corridas", {
    token, espera: 200,
    checar: (r) => r.find((c: any) => c.id === concluida.id).estrelas === 5 &&
                   r.find((c: any) => c.id === emAndamento.id).estrelas === null,
  });

  await teste("Histórico do outro tutor vem vazio", "GET", "/corridas", {
    token: outro.token, espera: 200, checar: (r) => r.length === 0,
  });

  await teste("Histórico sem token → 401", "GET", "/corridas", { espera: 401 });

  resumo();
}

main();
