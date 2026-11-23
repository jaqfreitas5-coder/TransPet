// Regras de negócio do cadastro e login (JA01)
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { AppError } from "../errors";
import * as usuariosRepo from "../repositories/usuarios.repository";
import * as petsRepo from "../repositories/pets.repository";

function gerarToken(usuarioId: number) {
  return jwt.sign({}, process.env.JWT_SECRET!, {
    subject: String(usuarioId),
    expiresIn: "7d",
  });
}

// Nunca devolver o hash da senha para o app
function semSenha(u: usuariosRepo.Usuario) {
  const { senha_hash, ...resto } = u;
  return resto;
}

type DadosCadastro = {
  nome: string;
  email: string;
  telefone: string;
  senha: string;
  pet?: petsRepo.NovoPet; // o layout cadastra o tutor junto com o primeiro pet
};

export async function cadastrar(dados: DadosCadastro) {
  const existente = await usuariosRepo.buscarPorEmail(dados.email);
  if (existente) throw new AppError(409, "E-mail já cadastrado");

  const senhaHash = await bcrypt.hash(dados.senha, 10);

  // Transação: se falhar ao salvar o pet, o usuário também não é salvo
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const usuario = await usuariosRepo.criar(client, { ...dados, senhaHash });
    const pet = dados.pet ? await petsRepo.criar(client, usuario.id, dados.pet) : null;
    await client.query("COMMIT");

    return { token: gerarToken(usuario.id), usuario: semSenha(usuario), pet };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function login(email: string, senha: string) {
  const usuario = await usuariosRepo.buscarPorEmail(email);
  // Mesma mensagem nos dois casos, para não revelar quais e-mails existem
  if (!usuario || !(await bcrypt.compare(senha, usuario.senha_hash))) {
    throw new AppError(401, "E-mail ou senha incorretos");
  }
  return { token: gerarToken(usuario.id), usuario: semSenha(usuario) };
}

export async function meusDados(usuarioId: number) {
  const usuario = await usuariosRepo.buscarPorId(usuarioId);
  if (!usuario) throw new AppError(404, "Usuário não encontrado");
  const pets = await petsRepo.listarDoUsuario(usuarioId);
  return { usuario: semSenha(usuario), pets };
}
