-- =========================================================
-- TransPet — Dados iniciais (fictícios) para a demonstração
-- =========================================================

INSERT INTO categorias (nome, descricao, preco_base, preco_por_km, ilustrativa) VALUES
  ('Pet Padrão',       'Veículo adaptado para cães e gatos de pequeno e médio porte.', 15.00, 2.50, FALSE),
  ('Pet Grande Porte', 'Veículo espaçoso, preparado para animais de grande porte.',    25.00, 3.50, FALSE),
  ('Pet Felino',       'Transporte especializado para gatos, com ambiente calmo.',     18.00, 2.80, FALSE),
  ('Ambulância Pet',   'Transporte para emergências veterinárias (em breve).',         60.00, 6.00, TRUE);

INSERT INTO extras (nome, preco) VALUES
  ('Música ambiente', 3.00),
  ('Mantas',          5.00),
  ('Petiscos',        7.00);

INSERT INTO motoristas (nome, veiculo_modelo, veiculo_placa, categoria_id) VALUES
  ('Fernanda da Silva', 'Jeep Renegade', 'FTR-7B29', 1),
  ('Carlos Oliveira',   'Fiat Toro',     'GHT-4C12', 2),
  ('Juliana Santos',    'Honda HR-V',    'KLP-9D33', 3);
