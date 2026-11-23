// Regras de negócio dos pets (JA02)
import { db } from "../db";
import { AppError } from "../errors";
import * as petsRepo from "../repositories/pets.repository";

async function garantirDono(id: number, usuarioId: number) {
  const pet = await petsRepo.buscarDoUsuario(id, usuarioId);
  // 404 também quando o pet é de outro tutor, para não revelar que ele existe
  if (!pet) throw new AppError(404, "Pet não encontrado");
  return pet;
}

export function listar(usuarioId: number) {
  return petsRepo.listarDoUsuario(usuarioId);
}

export function buscar(id: number, usuarioId: number) {
  return garantirDono(id, usuarioId);
}

export function criar(usuarioId: number, dados: petsRepo.NovoPet) {
  return petsRepo.criar(db, usuarioId, dados);
}

export async function atualizar(id: number, usuarioId: number, dados: petsRepo.NovoPet) {
  await garantirDono(id, usuarioId);
  return petsRepo.atualizar(id, dados);
}

export async function remover(id: number, usuarioId: number) {
  await garantirDono(id, usuarioId);
  // Não apaga pet que já tem corridas, para não perder o histórico
  if ((await petsRepo.contarCorridas(id)) > 0) {
    throw new AppError(409, "Este pet possui corridas registradas e não pode ser removido");
  }
  await petsRepo.remover(id);
}
