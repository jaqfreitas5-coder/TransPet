// Validações reaproveitadas em várias rotas
import { z } from "zod";

export const petSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do pet"),
  especie: z.enum(["CACHORRO", "GATO", "SILVESTRE"], "Espécie deve ser CACHORRO, GATO ou SILVESTRE"),
  raca: z.string().trim().optional(),
  porte: z.enum(["PEQUENO", "MEDIO", "GRANDE"], "Porte deve ser PEQUENO, MEDIO ou GRANDE"),
  idade: z.number().int().min(0, "Idade não pode ser negativa").optional(),
  observacoes: z.string().optional(),
  fotoUrl: z.string().url("URL da foto inválida").optional(),
});

// Converte o ":id" da URL em número (ex.: /pets/5)
export const idParam = z.coerce.number().int().positive("ID inválido");
