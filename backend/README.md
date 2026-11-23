# TransPet API — Backend

API do aplicativo TransPet (Projeto Integrador — Grupo 41).

**Stack:** Node.js + Express + TypeScript + PostgreSQL (driver `pg`, SQL puro)

## Estrutura de pastas

```
transpet-api/
├── db/
│   ├── schema.sql        # criação das tabelas (repositório de dados)
│   └── seed.sql          # dados fictícios: categorias, extras, motoristas
├── scripts/
│   └── db-setup.ts       # roda schema.sql + seed.sql no banco
├── src/
│   ├── server.ts         # sobe o servidor
│   ├── app.ts            # configura o Express e registra as rotas
│   ├── db.ts             # conexão com o PostgreSQL
│   ├── errors.ts         # tratamento de erros padronizado
│   ├── middlewares/
│   │   └── auth.ts       # confere o token JWT nas rotas protegidas
│   ├── repositories/     # SQL de cada tabela (repositório de dados)
│   ├── services/         # regras de negócio
│   └── routes/           # rotas HTTP + validação dos dados
├── tests/                # testes automáticos de cada parte
├── docker-compose.yml    # PostgreSQL local via Docker
├── .env.example          # modelo das variáveis de ambiente
└── package.json
```

## 📋 Resumo de todas as rotas (para quem faz a interface)

🔒 = precisa do cabeçalho `Authorization: Bearer TOKEN`

| Tela do app | Método e rota |
|---|---|
| Cadastro | `POST /auth/cadastro` |
| Login | `POST /auth/login` |
| Tela inicial | 🔒 `GET /auth/me` |
| Meus pets | 🔒 `GET /pets`, `DELETE /pets/:id` |
| Cadastro / edição de pet | 🔒 `POST /pets`, `PUT /pets/:id` |
| Solicitar corrida (categorias, extras, valor) | `GET /categorias`, `GET /extras`, 🔒 `POST /corridas/estimativa` |
| Botão "Confirmar" | 🔒 `POST /corridas` |
| Procurando motorista / Motorista confirmado / Corrida em andamento | 🔒 `GET /corridas/:id` (consultar a cada 3s) |
| Cancelar | 🔒 `POST /corridas/:id/cancelar` |
| Viagem concluída / Avalie a motorista | 🔒 `POST /corridas/:id/avaliacao` |
| Histórico | 🔒 `GET /corridas` |
| (apresentação) pular etapa | 🔒 `POST /corridas/:id/avancar` |

Para rodar todos os testes de uma vez: `npm run test:tudo` (~30s).

## Parte 1 — Rodando pela primeira vez

### 1. Pré-requisitos
- **Node.js 20 ou superior**: https://nodejs.org (verifique com `node -v`)
- **Um PostgreSQL**. Escolha UMA opção:
  - **A) Docker** (se tiver o Docker Desktop instalado): `docker compose up -d`
  - **B) Neon** (online e grátis, sem instalar nada): crie uma conta em https://neon.tech, crie um projeto e copie a "connection string"
  - **C) PostgreSQL instalado no PC**: crie um banco chamado `transpet`

### 2. Instalar as dependências
```bash
npm install
```

### 3. Configurar o `.env`
Copie o `.env.example` para um novo arquivo chamado `.env`.
- Se usou **Docker**, não precisa mudar nada.
- Se usou **Neon**, troque o `DATABASE_URL` pela connection string do Neon.
- Se usou **Postgres local**, ajuste usuário e senha.

### 4. Criar as tabelas e os dados iniciais
```bash
npm run db:setup
```
Saída esperada:
```
✅ Tabelas criadas
✅ Dados iniciais inseridos (4 categorias, 3 extras, 3 motoristas)
```

### 5. Subir a API
```bash
npm run dev
```
Saída esperada: `🚀 API TransPet rodando em http://localhost:3333`

### 6. Testar
Abra no navegador: http://localhost:3333/health

Resposta esperada:
```json
{"status":"ok","banco":"conectado","categorias":4}
```

✅ Se apareceu isso, a Parte 1 está pronta!

## Parte 2 — Cadastro e login (JA01)

> Se você já tinha a Parte 1 rodando: substitua os arquivos e rode `npm install` de novo.

### Rotas
| Método | Rota | Token? | O que faz |
|---|---|---|---|
| POST | `/auth/cadastro` | não | Cria o tutor (e o primeiro pet, opcional) e devolve o token |
| POST | `/auth/login` | não | Confere e-mail e senha e devolve o token |
| GET | `/auth/me` | **sim** | Dados do tutor logado + seus pets |

O token vai no cabeçalho: `Authorization: Bearer SEU_TOKEN`. Ele vale 7 dias.

### Exemplo — cadastro (tela "Faça seu cadastro")
```json
POST /auth/cadastro
{
  "nome": "Maria Souza",
  "email": "maria@email.com",
  "telefone": "11987654321",
  "senha": "123456",
  "pet": { "nome": "Thor", "especie": "CACHORRO", "porte": "MEDIO", "idade": 3 }
}
```
Resposta `201`:
```json
{
  "token": "eyJhbGciOi...",
  "usuario": { "id": 1, "nome": "Maria Souza", "email": "maria@email.com", "telefone": "11987654321", "criado_em": "..." },
  "pet": { "id": 1, "nome": "Thor", "especie": "CACHORRO", "porte": "MEDIO", "idade": 3, "...": "..." }
}
```

### Valores aceitos (o app deve enviar exatamente assim)
- `especie`: `CACHORRO`, `GATO`, `SILVESTRE`
- `porte`: `PEQUENO`, `MEDIO`, `GRANDE`
- `telefone`: só números com DDD (10 ou 11 dígitos)
- `senha`: mínimo 6 caracteres

### Respostas de erro
| Status | Quando |
|---|---|
| 400 | Dados inválidos — vem a lista `campos` dizendo o que corrigir |
| 401 | Login errado, ou token ausente/inválido |
| 409 | E-mail já cadastrado |

### Testar
Com a API rodando (`npm run dev`), abra **outro terminal** e rode:
```bash
npm run test:parte2
```
Esperado: `🎉  9 passaram, 0 falharam`

## Parte 3 — Pets (JA02)

Todas as rotas precisam de token (`Authorization: Bearer SEU_TOKEN`).
Cada tutor só vê e mexe nos **próprios** pets.

| Método | Rota | O que faz | Tela |
|---|---|---|---|
| GET | `/pets` | Lista os pets do tutor (lista vazia se não tiver) | Meus pets |
| GET | `/pets/:id` | Detalhes de um pet | — |
| POST | `/pets` | Cadastra um pet novo | Cadastro de pet |
| PUT | `/pets/:id` | Edita um pet (envia todos os campos) | Cadastro de pet |
| DELETE | `/pets/:id` | Remove um pet (bloqueado se ele já tiver corridas) | Meus pets |

### Exemplo — cadastrar pet
```json
POST /pets
{ "nome": "Mia", "especie": "GATO", "raca": "Siamês", "porte": "PEQUENO", "idade": 2, "observacoes": "Fica ansiosa em carro" }
```
Obrigatórios: `nome`, `especie`, `porte`. Opcionais: `raca`, `idade`, `observacoes`, `fotoUrl`.

### Testar
Com a API rodando, em outro terminal:
```bash
npm run test:parte3
```
Esperado: `🎉  14 passaram, 0 falharam`

## Parte 4 — Categorias, extras e estimativa (JA03 / JA04)

| Método | Rota | Token? | O que faz |
|---|---|---|---|
| GET | `/categorias` | não | Lista as categorias de transporte |
| GET | `/extras` | não | Lista os extras (música ambiente, mantas, petiscos) |
| POST | `/corridas/estimativa` | **sim** | Valor e tempo de cada categoria para o pet escolhido |

### Exemplo — estimativa (tela "Partida / Destino / Categorias / Você deseja")
```json
POST /corridas/estimativa
{ "petId": 1, "origem": "Rua Endereço, 123", "destino": "Clínica Vet, 50", "extras": [1, 3] }
```
Resposta (resumida):
```json
{
  "distanciaKm": 19.7,
  "tempoEstimadoMin": 47,
  "extras": [{ "id": 1, "nome": "Música ambiente", "preco": 3 }, { "id": 3, "nome": "Petiscos", "preco": 7 }],
  "categorias": [
    { "id": 1, "nome": "Pet Padrão", "disponivel": true, "motivo": null, "recomendada": true,
      "valorCorrida": 64.25, "valorExtras": 10, "valorTotal": 74.25 },
    { "id": 4, "nome": "Ambulância Pet", "disponivel": false, "motivo": "Em breve — ainda não disponível", "...": "..." }
  ]
}
```
O campo `valorTotal` é o que aparece em **"Valor da corrida: R$..."** no layout.

### Regras
- **Distância simulada** (2 a 25 km), sempre igual para a mesma origem/destino. Tempo: ~25 km/h, mínimo 5 min.
- **Valor** = preço base + preço por km × distância + extras.
- **Compatibilidade:** Pet Felino só para gatos; Pet Padrão não aceita porte grande; Ambulância Pet é ilustrativa (indisponível).
- **Recomendada:** gato → Pet Felino; porte grande → Pet Grande Porte; demais → Pet Padrão.

### Testar
```bash
npm run test:parte4
```
Esperado: `🎉  11 passaram, 0 falharam`

## Parte 5 — Corridas e simulação (JA05 / JA06)

> ⚠️ Esta parte mudou o banco. Depois de atualizar os arquivos, rode **`npm run db:setup`** de novo (apaga os dados de teste e recria as tabelas).

| Método | Rota | O que faz | Tela |
|---|---|---|---|
| POST | `/corridas` | Confirma a corrida (status `SOLICITADA`) | Botão "Confirmar" |
| GET | `/corridas/:id` | Status, motorista, veículo, placa, "chegada em X min" | Procurando motorista / Corrida em andamento |
| POST | `/corridas/:id/avancar` | Avança uma etapa na hora (para a apresentação) | — |
| POST | `/corridas/:id/cancelar` | Cancela (só antes de a viagem começar) | Procurando motorista |

### Exemplo — confirmar corrida
```json
POST /corridas
{ "petId": 1, "categoriaId": 1, "origem": "Rua Endereço, 123", "destino": "Clínica Vet, 50", "extras": [2] }
```
Para **agendar**, acrescente `"agendadaPara": "2026-11-25T14:30:00-03:00"` (mínimo 5 min no futuro).

### Resposta de `GET /corridas/:id` (resumida)
```json
{
  "id": 1,
  "status": "A_CAMINHO",
  "statusTexto": "Motorista a caminho",
  "etaMinutos": 4,
  "valor": 69.25,
  "motorista": { "nome": "Fernanda da Silva", "veiculo": "Jeep Renegade", "placa": "FTR-7B29" },
  "etapas": [ { "status": "SOLICITADA", "texto": "Procurando motorista...", "concluida": true }, "..." ]
}
```

### Como a simulação funciona
O app consulta `GET /corridas/:id` a cada poucos segundos e o status avança sozinho:

| Status | Texto | Dura |
|---|---|---|
| `SOLICITADA` | Procurando motorista... | 10s |
| `MOTORISTA_CONFIRMADO` | Motorista confirmado | 10s (agendada: até o horário marcado) |
| `A_CAMINHO` | Motorista a caminho | 20s |
| `EM_ANDAMENTO` | Viagem em andamento | 30s |
| `CONCLUIDA` | Viagem concluída! | — |

Ajuste no `.env`: `SIMULACAO_ETAPA_SEGUNDOS` (velocidade) e `SIMULACAO_AUTOMATICA=false` (só avança pela rota `/avancar`).

### Testar
```bash
npm run test:parte5
```
Esperado (leva ~25s): `🎉  17 passaram, 0 falharam`

## Parte 6 — Avaliação e histórico (JA07 / JA08)

| Método | Rota | O que faz | Tela |
|---|---|---|---|
| POST | `/corridas/:id/avaliacao` | Registra estrelas (1 a 5) e comentário opcional | Avalie a motorista |
| GET | `/corridas` | Lista as corridas do tutor, mais recentes primeiro | Histórico |

### Exemplo — avaliar
```json
POST /corridas/1/avaliacao
{ "estrelas": 5, "comentario": "A Luna chegou tranquila!" }
```

### Regras
- Só avalia corrida **concluída**, e só **uma vez**.
- `GET /corridas/:id` agora traz `podeAvaliar` (true/false) e `avaliacao` — use para decidir se mostra a tela de estrelas.
- Os dados da motorista trazem `mediaEstrelas` e `totalAvaliacoes`.

### Testar
```bash
npm run test:parte6
```
Esperado: `🎉  11 passaram, 0 falharam`

## Problemas comuns
| Erro | Solução |
|---|---|
| `ECONNREFUSED` | O banco não está rodando. Suba o Docker ou confira o `DATABASE_URL` |
| `password authentication failed` | Usuário/senha errados no `.env` |
| `database "transpet" does not exist` | Crie o banco `transpet` |
| `EADDRINUSE :3333` | Já tem algo na porta 3333. Mude `PORT` no `.env` |

## Scripts
| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe a API em modo desenvolvimento (reinicia ao salvar) |
| `npm run db:setup` | Apaga e recria as tabelas com os dados iniciais |
| `npm run build` | Compila para JavaScript (pasta `dist`) |
| `npm start` | Roda a versão compilada |

## Próximas partes
- [x] Parte 1 — Estrutura, banco e servidor
- [x] Parte 2 — Cadastro e login (JWT)
- [x] Parte 3 — Pets
- [x] Parte 4 — Categorias, extras e estimativa de valor
- [x] Parte 5 — Corridas e simulação de status
- [x] Parte 6 — Avaliação e histórico
