-- =========================================================
-- TransPet — Estrutura do banco de dados (PostgreSQL)
-- Rodar com: npm run db:setup  (apaga e recria tudo)
-- =========================================================

DROP TABLE IF EXISTS avaliacoes, corrida_extras, corridas, motoristas, extras, categorias, pets, usuarios CASCADE;
DROP TYPE IF EXISTS especie, porte, status_corrida CASCADE;

CREATE TYPE especie AS ENUM ('CACHORRO', 'GATO', 'SILVESTRE');
CREATE TYPE porte   AS ENUM ('PEQUENO', 'MEDIO', 'GRANDE');
CREATE TYPE status_corrida AS ENUM (
  'SOLICITADA',            -- 1. Solicitação enviada
  'MOTORISTA_CONFIRMADO',  -- 2. Motorista confirmado
  'A_CAMINHO',             -- 3. Motorista a caminho
  'EM_ANDAMENTO',          -- 4. Viagem em andamento
  'CONCLUIDA',             -- 5. Viagem concluída
  'CANCELADA'
);

-- JA01 — Tutor (usuário do app)
CREATE TABLE usuarios (
  id          SERIAL PRIMARY KEY,
  nome        VARCHAR(120) NOT NULL,
  email       VARCHAR(160) NOT NULL UNIQUE,
  telefone    VARCHAR(20)  NOT NULL,
  senha_hash  TEXT         NOT NULL,
  criado_em   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- JA02 — Pets do tutor
CREATE TABLE pets (
  id           SERIAL PRIMARY KEY,
  usuario_id   INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome         VARCHAR(80) NOT NULL,
  especie      especie NOT NULL,
  raca         VARCHAR(80),
  porte        porte NOT NULL,
  idade        INT CHECK (idade >= 0),
  observacoes  TEXT,
  foto_url     TEXT,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- JA04 — Categorias de transporte (veículo)
CREATE TABLE categorias (
  id            SERIAL PRIMARY KEY,
  nome          VARCHAR(80) NOT NULL,
  descricao     TEXT NOT NULL,
  preco_base    NUMERIC(10,2) NOT NULL,
  preco_por_km  NUMERIC(10,2) NOT NULL,
  ilustrativa   BOOLEAN NOT NULL DEFAULT FALSE,  -- ex.: ambulância ainda não operacional
  ativa         BOOLEAN NOT NULL DEFAULT TRUE
);

-- Extras do layout: música ambiente, mantas, petiscos
CREATE TABLE extras (
  id     SERIAL PRIMARY KEY,
  nome   VARCHAR(80) NOT NULL UNIQUE,
  preco  NUMERIC(10,2) NOT NULL
);

-- JA05 — Motoristas e veículos (fictícios na prova de conceito)
CREATE TABLE motoristas (
  id              SERIAL PRIMARY KEY,
  nome            VARCHAR(120) NOT NULL,
  foto_url        TEXT,
  veiculo_modelo  VARCHAR(80) NOT NULL,
  veiculo_placa   VARCHAR(10) NOT NULL UNIQUE,
  categoria_id    INT NOT NULL REFERENCES categorias(id)
);

-- JA03 / JA05 / JA06 — Corridas
CREATE TABLE corridas (
  id             SERIAL PRIMARY KEY,
  usuario_id     INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  pet_id         INT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  categoria_id   INT NOT NULL REFERENCES categorias(id),
  motorista_id   INT REFERENCES motoristas(id),
  origem         TEXT NOT NULL,
  destino        TEXT NOT NULL,
  distancia_km   NUMERIC(10,2) NOT NULL,
  agendada_para  TIMESTAMPTZ,               -- NULL = corrida imediata
  tempo_estimado_min  INT NOT NULL,
  valor          NUMERIC(10,2) NOT NULL,
  status         status_corrida NOT NULL DEFAULT 'SOLICITADA',
  status_alterado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- usado na simulação
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ligação N:N entre corridas e extras
CREATE TABLE corrida_extras (
  corrida_id  INT NOT NULL REFERENCES corridas(id) ON DELETE CASCADE,
  extra_id    INT NOT NULL REFERENCES extras(id),
  PRIMARY KEY (corrida_id, extra_id)
);

-- JA07 — Avaliação da corrida
CREATE TABLE avaliacoes (
  id          SERIAL PRIMARY KEY,
  corrida_id  INT NOT NULL UNIQUE REFERENCES corridas(id) ON DELETE CASCADE,
  estrelas    INT NOT NULL CHECK (estrelas BETWEEN 1 AND 5),
  comentario  TEXT,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
