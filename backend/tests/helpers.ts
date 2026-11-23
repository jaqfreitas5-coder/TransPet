// Funções de apoio para os testes (usa o fetch nativo do Node)
import "dotenv/config";

export const API = process.env.API_URL || `http://localhost:${process.env.PORT || 3333}`;

let ok = 0;
let falhas = 0;

type Opcoes = {
  body?: unknown;
  token?: string;
  espera: number;                     // status HTTP esperado
  checar?: (resposta: any) => boolean; // verificação extra no JSON
};

export async function teste(nome: string, metodo: string, rota: string, op: Opcoes) {
  try {
    const res = await fetch(API + rota, {
      method: metodo,
      headers: {
        "Content-Type": "application/json",
        ...(op.token ? { Authorization: `Bearer ${op.token}` } : {}),
      },
      body: op.body ? JSON.stringify(op.body) : undefined,
    });
    const json = await res.json().catch(() => null);
    const passou = res.status === op.espera && (!op.checar || op.checar(json));

    if (passou) {
      ok++;
      console.log(`  ✅ ${nome}`);
    } else {
      falhas++;
      console.log(`  ❌ ${nome}\n     recebido: ${res.status} ${JSON.stringify(json)}`);
    }
    return json;
  } catch (e) {
    falhas++;
    console.log(`  ❌ ${nome}\n     erro: ${(e as Error).message} (a API está rodando?)`);
  }
}

export function resumo() {
  console.log(`\n${falhas === 0 ? "🎉" : "⚠️"}  ${ok} passaram, ${falhas} falharam\n`);
  if (falhas > 0) process.exit(1);
}
