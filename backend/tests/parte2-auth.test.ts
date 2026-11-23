// Testes automáticos da Parte 2 (cadastro e login)
// Com a API rodando (npm run dev), em outro terminal:  npm run test:parte2
import { teste, resumo, API } from "./helpers";

async function main() {
  const email = `tutor${Date.now()}@teste.com`;
  let token = "";

  console.log(`\n🧪 Testando Parte 2 em ${API}\n`);

  await teste("Cadastro de tutor + pet (como no layout) → 201", "POST", "/auth/cadastro", {
    body: {
      nome: "Maria Souza",
      email,
      telefone: "11987654321",
      senha: "123456",
      pet: { nome: "Thor", especie: "CACHORRO", porte: "MEDIO", idade: 3 },
    },
    espera: 201,
    checar: (r) => {
      token = r.token;
      return !!r.token && r.usuario.email === email && r.pet.nome === "Thor" && !("senha_hash" in r.usuario);
    },
  });

  await teste("Cadastro com e-mail repetido → 409", "POST", "/auth/cadastro", {
    body: { nome: "Outra Pessoa", email, telefone: "11999998888", senha: "abcdef" },
    espera: 409,
  });

  await teste("Cadastro com dados inválidos → 400 com lista de campos", "POST", "/auth/cadastro", {
    body: { nome: "Jo", email: "nao-e-email", telefone: "123", senha: "123" },
    espera: 400,
    checar: (r) => r.campos.length === 4,
  });

  await teste("Cadastro com espécie inválida no pet → 400", "POST", "/auth/cadastro", {
    body: {
      nome: "Ana Lima", email: `ana${Date.now()}@teste.com`, telefone: "11911112222", senha: "123456",
      pet: { nome: "Nemo", especie: "PEIXE", porte: "PEQUENO" },
    },
    espera: 400,
  });

  await teste("Login correto → 200 com token", "POST", "/auth/login", {
    body: { email, senha: "123456" },
    espera: 200,
    checar: (r) => !!r.token,
  });

  await teste("Login com senha errada → 401", "POST", "/auth/login", {
    body: { email, senha: "errada" },
    espera: 401,
  });

  await teste("GET /auth/me com token → 200 com tutor e pets", "GET", "/auth/me", {
    token,
    espera: 200,
    checar: (r) => r.usuario.email === email && r.pets.length === 1,
  });

  await teste("GET /auth/me sem token → 401", "GET", "/auth/me", { espera: 401 });

  await teste("GET /auth/me com token falso → 401", "GET", "/auth/me", {
    token: "token-falso",
    espera: 401,
  });

  resumo();
}

main();
