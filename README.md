# TransPet 🐾

**Mais que transporte, cuidado em movimento.**

Protótipo funcional (PoC) de um aplicativo de transporte especializado para pets.
Projeto Integrador — SENAC EAD (TADS/TSI) — **Grupo 41** — 2ª entrega.

## Jornada da prova de conceito

Cadastro/Login → Pet → Solicitação (origem, destino, agendamento) → Categoria → Resumo e confirmação
→ Motorista confirmado → Acompanhamento da viagem → Conclusão → Avaliação (estrelas + comentário) → Histórico.

Recursos simulados (conforme o mapeamento): busca de motorista, localização/rastreamento (mapa ilustrativo),
valores das corridas, disponibilidade de veículos. O botão **"Avançar etapa (demonstração)"** acelera o status na apresentação.

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | HTML, CSS e JavaScript puro (mobile-first), em `frontend/` |
| Backend / API | Node.js 20+, Express 5, TypeScript, Zod, JWT, bcrypt, em `backend/` |
| Banco de dados | PostgreSQL 16 (SQL puro com `pg`) — `backend/db/schema.sql` e `seed.sql` |
| Versionamento | Git e GitHub |

## Estrutura do repositório

```
TransPet/
├── backend/    # API REST + banco de dados (README próprio com todas as rotas)
├── frontend/   # Interface do app (servida pela API em /demo)
└── docs/       # Mapeamento das jornadas e manual de configuração
```

## Como executar (passo a passo)

**Pré-requisitos:** Node.js 20+ e um PostgreSQL (Docker, Neon online ou instalado no PC).

```bash
# 1. Entrar na pasta do backend
cd backend

# 2. Subir o PostgreSQL (opção Docker). Sem Docker, use o Neon e ajuste o .env
docker compose up -d

# 3. Instalar dependências
npm install

# 4. Criar o .env (Windows: copy .env.example .env)
cp .env.example .env

# 5. Criar as tabelas e os dados iniciais (categorias, extras, motoristas)
npm run db:setup

# 6. Subir a API + frontend
npm run dev
```

Depois abra no navegador:

- **Aplicativo:** http://localhost:3333/demo/
- **Teste da API:** http://localhost:3333/health → `{"status":"ok","banco":"conectado","categorias":4}`

O painel preto ao lado do celular mostra as chamadas reais feitas à API (útil para a demonstração).

## Testes automáticos do backend

Com a API rodando, em outro terminal, dentro de `backend/`:

```bash
npm run test:tudo
```

## Rotas da API

Resumo completo em [`backend/README.md`](backend/README.md).

## Integrantes

| Nome | Etapa escolhida na enquete do grupo |
|---|---|
| Jaqueline Freitas | Escolha de frontend, backend e banco de dados; lógica do servidor, APIs e repositório de dados |
| Giovanna | Configuração de repositório e servidores de desenvolvimento |
| Ray | Configuração de repositório e servidores de desenvolvimento |
| Novaes | Jornadas associadas (mapeamento) |
| Vitória Mota | Criar interface |

**Observação:** a etapa "Escolha de frontend, backend e banco de dados" foi realizada somente por Jaqueline Freitas. Os outros dois integrantes inscritos nela não participaram.

## Vídeo de demonstração

_Colar aqui o link (YouTube não listado) do vídeo de até 1 minuto._
