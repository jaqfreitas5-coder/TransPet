// Cálculo de distância, tempo, valor e compatibilidade de categorias (JA03 / JA04)
// Na prova de conceito, a distância é SIMULADA (o mapeamento permite valores demonstrativos).
import { AppError } from "../errors";
import { Categoria, Extra } from "../repositories/catalogo.repository";

type PetBasico = { especie: "CACHORRO" | "GATO" | "SILVESTRE"; porte: "PEQUENO" | "MEDIO" | "GRANDE" };

// Gera uma distância "fake" entre 2 e 25 km, sempre igual para o mesmo par origem/destino
export function simularDistanciaKm(origem: string, destino: string): number {
  const texto = `${origem.trim().toLowerCase()}|${destino.trim().toLowerCase()}`;
  let hash = 0;
  for (const c of texto) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  const km = 2 + (hash % 2300) / 100; // 2.00 a 24.99
  return Math.round(km * 10) / 10;
}

// Velocidade média urbana de ~25 km/h, com mínimo de 5 minutos
export function estimarTempoMin(distanciaKm: number): number {
  return Math.max(5, Math.round((distanciaKm / 25) * 60));
}

function arred(valor: number) {
  return Math.round(valor * 100) / 100;
}

export function calcularValor(categoria: Categoria, distanciaKm: number, extras: Extra[]) {
  const valorCorrida = categoria.preco_base + categoria.preco_por_km * distanciaKm;
  const valorExtras = extras.reduce((soma, e) => soma + e.preco, 0);
  return {
    valorCorrida: arred(valorCorrida),
    valorExtras: arred(valorExtras),
    valorTotal: arred(valorCorrida + valorExtras),
  };
}

// Regras de qual categoria serve para qual pet
export function avaliarCategoria(categoria: Categoria, pet: PetBasico) {
  if (categoria.ilustrativa) {
    return { disponivel: false, motivo: "Em breve — ainda não disponível" };
  }
  if (categoria.nome === "Pet Felino" && pet.especie !== "GATO") {
    return { disponivel: false, motivo: "Exclusiva para gatos" };
  }
  if (categoria.nome === "Pet Padrão" && pet.porte === "GRANDE") {
    return { disponivel: false, motivo: "Não comporta animais de grande porte" };
  }
  return { disponivel: true, motivo: null };
}

// Categoria sugerida para o pet
export function categoriaRecomendada(pet: PetBasico): string {
  if (pet.especie === "GATO") return "Pet Felino";
  if (pet.porte === "GRANDE") return "Pet Grande Porte";
  return "Pet Padrão";
}

export function garantirCategoriaDisponivel(categoria: Categoria | undefined, pet: PetBasico): Categoria {
  if (!categoria) throw new AppError(404, "Categoria não encontrada");
  const { disponivel, motivo } = avaliarCategoria(categoria, pet);
  if (!disponivel) throw new AppError(422, `Categoria indisponível para este pet: ${motivo}`);
  return categoria;
}
