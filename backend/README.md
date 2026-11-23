# TransPet 🐾

**Mais que transporte, cuidado em movimento.**

Protótipo funcional (PoC) de um aplicativo de transporte especializado para pets.
Projeto Integrador — SENAC EAD (TADS/TSI) — **Grupo 41** — 2ª entrega.

## 🎬 Vídeo de demonstração (59 s)

▶️ **[Assistir ao vídeo](docs/video_demonstracao.mp4)** — arquivo MP4 em `docs/video_demonstracao.mp4`
(no GitHub, clique no arquivo e depois em **View raw** para reproduzir ou baixar).

O vídeo mostra a jornada completa da PoC funcionando: cadastro de pet → solicitação com agendamento e extras →
categoria recomendada e bloqueadas → resumo e confirmação → motorista confirmado → viagem em andamento →
viagem concluída e avaliação. À direita, o painel exibe as chamadas reais à API.

---

## 1. Revisão do projeto e definição da prova de conceito

### O que revisamos da 1ª entrega
Na 1ª entrega mapeamos o TransPet completo: personas, jornadas associadas (JA01 a JA09) e o layout das telas
(arquivos em [`docs/`](docs/)). Ao revisitar o projeto, identificamos que o **maior risco** não é visual, e sim
a **jornada principal funcionar de ponta a ponta com regras de negócio reais**:

- o tutor consegue cadastrar o pet com as informações que importam para o transporte (espécie, porte, observações)?
- o sistema oferece **só as categorias de veículo compatíveis** com aquele pet e calcula o valor corretamente?
- o tutor consegue **acompanhar o status** da corrida até a conclusão e avaliar o motorista?

### PoC escolhida: a jornada principal "Solicitar e acompanhar uma corrida"
Cadastro/Login → Pet → Solicitação (origem, destino, agendamento, extras) → Categoria → Resumo e confirmação
→ Motorista confirmado → Acompanhamento da viagem → Conclusão → Avaliação (estrelas + comentário) → Histórico.

| Jornada | Implementado na PoC |
|---|---|
| JA01 Cadastro e login | ✅ Cadastro do tutor junto com o primeiro pet (como no layout), login com JWT |
| JA02 Pets | ✅ Listar, cadastrar e remover pets (cada tutor só vê os seus) |
| JA03 Solicitação | ✅ Partida, destino, agendamento opcional e extras (música ambiente, mantas, petiscos) |
| JA04 Categorias | ✅ Categoria recomendada para o pet; incompatíveis bloqueadas (ex.: Pet Felino só para gatos) |
| JA05 Confirmação e motorista | ✅ Resumo, confirmação e motorista com veículo e placa |
| JA06 Acompanhamento | ✅ Status em 5 etapas e "chegada em X minutos" |
| JA07 Avaliação | ✅ 1 a 5 estrelas + comentário, somente após a conclusão |
| JA08 Histórico | ✅ Corridas do tutor com status e avaliação |

### O que é simulado (permitido no mapeamento)
Busca de motorista, localização/rastreamento (mapa ilustrativo), distância e valores das corridas,
disponibilidade de veículos. A Ambulância Pet aparece como **ilustrativa** ("em breve").
O botão **"⏩ Avançar etapa (demonstração)"** acelera o status durante a apresentação.

### Ajustes feitos em relação à 1ª entrega
- **Categorias:** no layout, "Categorias" misturava espécie e porte. Na PoC, espécie e porte ficam no **cadastro do pet**
  e "Categoria" passou a ser o **tipo de veículo** (Pet Padrão, Pet Grande Porte, Pet Felino, Ambulância Pet), escolhido
  automaticamente conforme o pet.
- **Extras do layout** ("Você deseja: música ambiente, mantas, petiscos") viraram itens com preço somado ao valor da corrida.
- **Telas que faltavam no layout** e foram criadas: Meus pets, resumo da corrida, procurando motorista, histórico.

---

## 2. Preparação do ambiente — stack escolhida

| Camada | Tecnologia | Por que escolhemos |
|---|---|---|
| Frontend | HTML, CSS e JavaScript puro (mobile-first), em `frontend/` | Roda em qualquer navegador e celular sem instalação; o layout foi pensado para celular |
| Backend / API | Node.js 20+, Express 5, TypeScript, Zod, JWT, bcrypt, em `backend/` | Mesma linguagem (JavaScript) do frontend; TypeScript evita erros; Zod valida os dados; JWT e bcrypt dão login seguro |
| Banco de dados | PostgreSQL 16 (SQL puro com `pg`), em `backend/db/` | Dados relacionais (tutor → pets → corridas → avaliação); SQL visível em `schema.sql` |
| Hospedagem do banco | Neon (PostgreSQL online gratuito) ou Docker | Sem instalar nada no PC; Docker como alternativa local |
| Versionamento | Git e GitHub | Histórico e colaboração do grupo |

### Arquitetura
```
[ Navegador / celular ]  →  HTTP + JSON  →  [ API Express ]  →  SQL  →  [ PostgreSQL ]
   frontend/                                  backend/src/               backend/db/
                                              routes → services → repositories
```
- **routes:** recebem a requisição e validam os dados
- **services:** regras de negócio (preço, categorias compatíveis, simulação da corrida)
- **repositories:** todo o SQL do banco

### Modelagem de dados
`usuarios` → `pets` → `corridas` (+ `corrida_extras`) → `avaliacoes`, com `categorias`, `extras` e `motoristas`
como tabelas de catálogo. Detalhes em [`backend/db/schema.sql`](backend/db/schema.sql).

---

## 3. Estrutura do repositório

```
TransPet/
├── backend/    # API REST + banco de dados (README próprio com todas as rotas)
├── frontend/   # Interface do app (servida pela API em /demo)
└── docs/       # Mapeamento das jornadas, layout das telas, manual de configuração e vídeo
```

## 4. Como executar (passo a passo)

**Pré-requisitos:** Node.js 20+ e um PostgreSQL (Neon online, Docker ou instalado no PC).

```bash
# 1. Entrar na pasta do backend
cd backend

# 2. Instalar dependências
npm install

# 3. Criar o .env (Windows: copy .env.example .env) e colocar o endereço do banco em DATABASE_URL
cp .env.example .env

# 4. Criar as tabelas e os dados iniciais (categorias, extras, motoristas)
npm run db:setup

# 5. Subir a API + frontend
npm run dev
```

Sem Neon, dá para subir um PostgreSQL local com Docker (`docker compose up -d`) antes do passo 4.

Depois abra no navegador:

- **Aplicativo:** http://localhost:3333/demo/
- **Teste da API:** http://localhost:3333/health → `{"status":"ok","banco":"conectado","categorias":4}`

O painel preto ao lado do celular mostra as chamadas reais feitas à API.

## 5. Testes e validação

Com a API rodando, em outro terminal, dentro de `backend/`:

```bash
npm run test:tudo
```

Resultado: **62 testes automáticos passando**, cobrindo cadastro/login, pets, estimativa de valor,
corridas (incluindo simulação automática e agendamento), avaliação e histórico. Também testam regras de
segurança: um tutor não acessa pets nem corridas de outro.

## 6. Rotas da API

Resumo completo em [`backend/README.md`](backend/README.md).

## 7. Integrantes

| Nome | Etapa escolhida na enquete do grupo |
|---|---|
| Jaqueline Freitas | Escolha de frontend, backend e banco de dados; lógica do servidor, APIs e repositório de dados |
| Giovanna | Configuração de repositório e servidores de desenvolvimento |
| Ray | Configuração de repositório e servidores de desenvolvimento |
| Novaes | Jornadas associadas (mapeamento) |
| Vitória Mota | Criar interface |

**Observação:** a etapa "Escolha de frontend, backend e banco de dados" foi realizada somente por Jaqueline Freitas. Os outros dois integrantes inscritos nela não participaram.
