// Testes automáticos da Parte 4 (categorias, extras e estimativa)
// Com a API rodando (npm run dev), em outro terminal:  npm run test:parte4
import { teste, resumo, API } from "./helpers";

async function main() {
  console.log(`\n🧪 Testando Parte 4 em ${API}\n`);

  // Prepara um tutor com um gato e um cachorro grande
  const cad = await (await fetch(`${API}/auth/cadastro`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nome: "Carla Mendes", email: `carla${Date.now()}@teste.com`, telefone: "11987654321", senha: "123456",
      pet: { nome: "Mia", especie: "GATO", porte: "PEQUENO" },
    }),
  })).json();
  const token = cad.token as string;
  const gatoId = cad.pet.id as number;

  const cao = await (await fetch(`${API}/pets`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ nome: "Thor", especie: "CACHORRO", porte: "GRANDE" }),
  })).json();

  const rota = { origem: "Rua das Flores, 100", destino: "Av. Paulista, 1000" };
  let extrasIds: number[] = [];

  await teste("GET /categorias → 4 categorias", "GET", "/categorias", {
    espera: 200, checar: (r) => r.length === 4 && typeof r[0].preco_base === "number",
  });

  await teste("GET /extras → música, mantas, petiscos", "GET", "/extras", {
    espera: 200,
    checar: (r) => { extrasIds = r.map((e: any) => e.id); return r.length === 3; },
  });

  let valorSemExtras = 0;
  await teste("Estimativa para gato → recomenda 'Pet Felino'", "POST", "/corridas/estimativa", {
    token, body: { petId: gatoId, ...rota }, espera: 200,
    checar: (r) => {
      const rec = r.categorias.find((c: any) => c.recomendada);
      valorSemExtras = rec.valorTotal;
      return rec.nome === "Pet Felino" && rec.disponivel && r.distanciaKm >= 2 && r.tempoEstimadoMin >= 5;
    },
  });

  await teste("Ambulância aparece como indisponível (ilustrativa)", "POST", "/corridas/estimativa", {
    token, body: { petId: gatoId, ...rota }, espera: 200,
    checar: (r) => r.categorias.find((c: any) => c.nome === "Ambulância Pet").disponivel === false,
  });

  await teste("Extras somam no valor (3 + 5 + 7 = R$ 15)", "POST", "/corridas/estimativa", {
    token, body: { petId: gatoId, ...rota, extras: extrasIds }, espera: 200,
    checar: (r) => {
      const rec = r.categorias.find((c: any) => c.recomendada);
      return rec.valorExtras === 15 && Math.abs(rec.valorTotal - (valorSemExtras + 15)) < 0.01;
    },
  });

  await teste("Mesma origem/destino → mesma distância (simulação estável)", "POST", "/corridas/estimativa", {
    token, body: { petId: gatoId, ...rota }, espera: 200,
    checar: (r) => r.categorias.find((c: any) => c.recomendada).valorTotal === valorSemExtras,
  });

  await teste("Cachorro grande → recomenda 'Pet Grande Porte'; Padrão e Felino bloqueadas", "POST",
    "/corridas/estimativa", {
      token, body: { petId: cao.id, ...rota }, espera: 200,
      checar: (r) => {
        const por = (n: string) => r.categorias.find((c: any) => c.nome === n);
        return por("Pet Grande Porte").recomendada && !por("Pet Padrão").disponivel && !por("Pet Felino").disponivel;
      },
    });

  await teste("Extra inexistente → 400", "POST", "/corridas/estimativa", {
    token, body: { petId: gatoId, ...rota, extras: [999] }, espera: 400,
  });

  await teste("Sem destino → 400", "POST", "/corridas/estimativa", {
    token, body: { petId: gatoId, origem: "Rua A, 1" }, espera: 400,
  });

  await teste("Pet de outro tutor / inexistente → 404", "POST", "/corridas/estimativa", {
    token, body: { petId: 999999, ...rota }, espera: 404,
  });

  await teste("Estimativa sem token → 401", "POST", "/corridas/estimativa", {
    body: { petId: gatoId, ...rota }, espera: 401,
  });

  resumo();
}

main();
