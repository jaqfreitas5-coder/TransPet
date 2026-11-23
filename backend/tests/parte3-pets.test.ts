// Testes automáticos da Parte 3 (pets)
// Com a API rodando (npm run dev), em outro terminal:  npm run test:parte3
import { teste, resumo, API } from "./helpers";

async function criarTutor(nome: string) {
  const res = await fetch(`${API}/auth/cadastro`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nome, email: `${nome.split(" ")[0].toLowerCase()}${Date.now()}@teste.com`,
      telefone: "11987654321", senha: "123456",
    }),
  });
  return (await res.json()).token as string;
}

async function main() {
  console.log(`\n🧪 Testando Parte 3 em ${API}\n`);

  const tokenMaria = await criarTutor("Maria Souza");
  const tokenJoao = await criarTutor("Joao Pereira");
  let petId = 0;

  await teste("Lista vazia para tutor sem pets (tela 'Meus pets' vazia)", "GET", "/pets", {
    token: tokenMaria, espera: 200, checar: (r) => Array.isArray(r) && r.length === 0,
  });

  await teste("Cadastrar pet → 201", "POST", "/pets", {
    token: tokenMaria,
    body: { nome: "Mia", especie: "GATO", raca: "Siamês", porte: "PEQUENO", idade: 2, observacoes: "Fica ansiosa em carro" },
    espera: 201,
    checar: (r) => { petId = r.id; return r.nome === "Mia" && r.especie === "GATO"; },
  });

  await teste("Cadastrar segundo pet → 201", "POST", "/pets", {
    token: tokenMaria, body: { nome: "Bob", especie: "CACHORRO", porte: "GRANDE" }, espera: 201,
  });

  await teste("Listar pets → 2 pets", "GET", "/pets", {
    token: tokenMaria, espera: 200, checar: (r) => r.length === 2,
  });

  await teste("Ver detalhes do pet → 200", "GET", `/pets/${petId}`, {
    token: tokenMaria, espera: 200, checar: (r) => r.raca === "Siamês",
  });

  await teste("Editar pet → 200 com dados novos", "PUT", `/pets/${petId}`, {
    token: tokenMaria,
    body: { nome: "Mia", especie: "GATO", raca: "Siamês", porte: "MEDIO", idade: 3 },
    espera: 200, checar: (r) => r.porte === "MEDIO" && r.idade === 3,
  });

  await teste("Cadastrar pet com porte inválido → 400", "POST", "/pets", {
    token: tokenMaria, body: { nome: "Rex", especie: "CACHORRO", porte: "GIGANTE" }, espera: 400,
  });

  await teste("Outro tutor NÃO vê o pet da Maria → 404", "GET", `/pets/${petId}`, {
    token: tokenJoao, espera: 404,
  });

  await teste("Outro tutor NÃO edita o pet da Maria → 404", "PUT", `/pets/${petId}`, {
    token: tokenJoao, body: { nome: "Hack", especie: "GATO", porte: "PEQUENO" }, espera: 404,
  });

  await teste("Lista do outro tutor não mostra pets da Maria", "GET", "/pets", {
    token: tokenJoao, espera: 200, checar: (r) => r.length === 0,
  });

  await teste("Sem token → 401", "GET", "/pets", { espera: 401 });

  await teste("ID inválido na URL → 400", "GET", "/pets/abc", { token: tokenMaria, espera: 400 });

  await teste("Remover pet → 204", "DELETE", `/pets/${petId}`, { token: tokenMaria, espera: 204 });

  await teste("Pet removido não existe mais → 404", "GET", `/pets/${petId}`, {
    token: tokenMaria, espera: 404,
  });

  resumo();
}

main();
