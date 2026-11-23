// Estimativa da corrida: mostra as categorias com valor e tempo (tela "Solicitar corrida")
import { AppError } from "../errors";
import * as catalogoRepo from "../repositories/catalogo.repository";
import * as petsRepo from "../repositories/pets.repository";
import * as preco from "./preco.service";

type Entrada = {
  petId: number;
  origem: string;
  destino: string;
  extras: number[];
};

export async function estimar(usuarioId: number, dados: Entrada) {
  const pet = await petsRepo.buscarDoUsuario(dados.petId, usuarioId);
  if (!pet) throw new AppError(404, "Pet não encontrado");

  const extras = await catalogoRepo.buscarExtrasPorIds(dados.extras);
  if (extras.length !== new Set(dados.extras).size) {
    throw new AppError(400, "Algum extra informado não existe");
  }

  const distanciaKm = preco.simularDistanciaKm(dados.origem, dados.destino);
  const tempoEstimadoMin = preco.estimarTempoMin(distanciaKm);
  const recomendada = preco.categoriaRecomendada(pet);

  const categorias = (await catalogoRepo.listarCategorias()).map((c) => ({
    id: c.id,
    nome: c.nome,
    descricao: c.descricao,
    ...preco.avaliarCategoria(c, pet),
    recomendada: c.nome === recomendada,
    ...preco.calcularValor(c, distanciaKm, extras),
  }));

  return {
    pet: { id: pet.id, nome: pet.nome, especie: pet.especie, porte: pet.porte },
    origem: dados.origem,
    destino: dados.destino,
    distanciaKm,
    tempoEstimadoMin,
    extras,
    categorias,
  };
}
