// TransPet — frontend do protótipo (HTML + CSS + JavaScript puro)
// Fluxo: cadastro/login → pets → solicitar corrida → categoria → confirmar
//        → acompanhar (status) → avaliar → histórico
// Todas as telas conversam com a API (pasta /backend).

// Se a página for aberta pela própria API (/demo) usa o mesmo endereço;
// se for aberta por outro servidor (ex.: Live Server), aponta para a API local.
const API = location.pathname.startsWith("/demo") ? "" : "http://localhost:3333";

const $tela = document.getElementById("tela");
const $menu = document.getElementById("menu");
const $sair = document.getElementById("btnSair");
const $log = document.getElementById("log");

const estado = {
  token: null,
  usuario: null,
  pets: [],
  extras: [],
  rascunho: {},      // dados da solicitação em andamento (voltar sem perder o que digitou)
  corridaId: null,
  timer: null,
};

// ---------- Utilidades ----------
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dinheiro = (v) => "R$ " + Number(v).toFixed(2).replace(".", ",");
const EMOJI = { CACHORRO: "🐶", GATO: "🐱", SILVESTRE: "🦜" };
const ESPECIE = { CACHORRO: "cachorro", GATO: "gato", SILVESTRE: "silvestre" };
const PORTE = { PEQUENO: "porte pequeno", MEDIO: "porte médio", GRANDE: "porte grande" };

function dataBr(iso) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function guardarToken(t) { try { sessionStorage.setItem("transpet_token", t || ""); } catch (e) { /* sem storage: segue a vida */ } }
function lerToken() { try { return sessionStorage.getItem("transpet_token") || null; } catch (e) { return null; } }

// ---------- Painel de chamadas à API ----------
function logar(html, classe) {
  const d = document.createElement("div");
  d.className = classe;
  d.innerHTML = html;
  $log.appendChild(d);
  while ($log.children.length > 120) $log.removeChild($log.firstChild);
  $log.scrollTop = $log.scrollHeight;
}

async function api(metodo, caminho, corpo) {
  logar(`→ ${metodo} ${esc(caminho)}`, "req");
  let resp;
  try {
    resp = await fetch(API + caminho, {
      method: metodo,
      headers: {
        "Content-Type": "application/json",
        ...(estado.token ? { Authorization: "Bearer " + estado.token } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
  } catch (e) {
    logar("← sem conexão com a API", "res-erro");
    throw new Error("Não foi possível falar com o servidor. A API está rodando?");
  }
  const texto = await resp.text();
  let json = null;
  try { json = texto ? JSON.parse(texto) : null; } catch (e) { /* resposta sem JSON */ }
  logar(`← ${resp.status}`, resp.ok ? "res-ok" : "res-erro");
  logar(esc((texto || "").slice(0, 220)), "corpo");
  if (!resp.ok) {
    const campos = json && json.campos ? json.campos.map((c) => c.mensagem).join(" · ") : "";
    const err = new Error(campos || (json && json.erro) || "Erro inesperado");
    err.status = resp.status;
    throw err;
  }
  return json;
}

// ---------- Navegação ----------
function pararTimer() { if (estado.timer) { clearInterval(estado.timer); estado.timer = null; } }

function mostrar(html, abaMenu) {
  pararTimer();
  $tela.innerHTML = html;
  $tela.scrollTop = 0;
  const logado = !!estado.token;
  $menu.hidden = !logado;
  $sair.hidden = !logado;
  $menu.querySelectorAll("button").forEach((b) => b.classList.toggle("ativo", b.dataset.ir === abaMenu));
}

function msg(id, texto, tipo = "erro") {
  const el = document.getElementById(id);
  if (el) el.innerHTML = texto ? `<div class="${tipo}">${esc(texto)}</div>` : "";
}

function ir(tela) {
  ({ home: telaHome, pets: telaPets, historico: telaHistorico, solicitar: telaSolicitar, login: telaLogin, cadastro: telaCadastro }[tela] || telaHome)();
}

$menu.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) ir(b.dataset.ir); });
$sair.addEventListener("click", () => {
  estado.token = null; estado.usuario = null; estado.pets = []; estado.rascunho = {}; estado.corridaId = null;
  guardarToken("");
  telaLogin();
});

// ---------- JA01: Cadastro e login ----------
function telaCadastro() {
  mostrar(`
    <h2>Faça seu <em>cadastro</em></h2>
    <form id="f" novalidate>
      <label>Nome completo do tutor</label><input name="nome" autocomplete="name" required>
      <label>E-mail</label><input name="email" type="email" autocomplete="email" required>
      <label>Telefone com DDD (só números)</label><input name="telefone" inputmode="numeric" placeholder="11987654321" required>
      <label>Nome do pet</label><input name="petNome" required>
      <div class="linha">
        <div><label>Espécie</label>
          <select name="especie"><option value="CACHORRO">Cachorro</option><option value="GATO">Gato</option><option value="SILVESTRE">Silvestre</option></select></div>
        <div><label>Idade</label><input name="idade" type="number" min="0" inputmode="numeric"></div>
      </div>
      <label>Porte do pet</label>
      <select name="porte"><option value="PEQUENO">Porte pequeno</option><option value="MEDIO">Porte médio</option><option value="GRANDE">Porte grande</option></select>
      <label>Crie uma senha (mínimo 6)</label><input name="senha" type="password" autocomplete="new-password" required>
      <div id="m"></div>
      <button class="btn cheio" type="submit">Cadastrar</button>
    </form>
    <button class="link" id="irLogin" type="button">Já tem cadastro? Faça login</button>`);
  document.getElementById("irLogin").onclick = telaLogin;
  document.getElementById("f").onsubmit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const corpo = {
      nome: f.nome, email: f.email, telefone: f.telefone.replace(/\D/g, ""), senha: f.senha,
      pet: { nome: f.petNome, especie: f.especie, porte: f.porte, ...(f.idade !== "" ? { idade: Number(f.idade) } : {}) },
    };
    const btn = e.target.querySelector("button[type=submit]"); btn.disabled = true;
    try {
      const r = await api("POST", "/auth/cadastro", corpo);
      estado.token = r.token; guardarToken(r.token);
      await telaHome();
    } catch (err) { msg("m", err.message); btn.disabled = false; }
  };
}

function telaLogin() {
  mostrar(`
    <h2>Entrar no <em>TransPet</em></h2>
    <p class="sub">Que bom ter você de volta!</p>
    <form id="f" novalidate>
      <label>E-mail</label><input name="email" type="email" autocomplete="email" required>
      <label>Senha</label><input name="senha" type="password" autocomplete="current-password" required>
      <div id="m"></div>
      <button class="btn cheio" type="submit">Entrar</button>
    </form>
    <button class="link" id="irCad" type="button">Ainda não tem conta? Cadastre-se</button>`);
  document.getElementById("irCad").onclick = telaCadastro;
  document.getElementById("f").onsubmit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const btn = e.target.querySelector("button[type=submit]"); btn.disabled = true;
    try {
      const r = await api("POST", "/auth/login", { email: f.email, senha: f.senha });
      estado.token = r.token; guardarToken(r.token);
      await telaHome();
    } catch (err) { msg("m", err.status === 401 ? "E-mail ou senha incorretos." : err.message); btn.disabled = false; }
  };
}

// ---------- Início ----------
async function carregarUsuario() {
  const r = await api("GET", "/auth/me");
  estado.usuario = r.usuario || r;
  estado.pets = r.pets || [];
}

async function telaHome() {
  try { await carregarUsuario(); } catch (e) { return telaLogin(); }
  const primeiro = (estado.usuario.nome || "").split(" ")[0];
  const pets = estado.pets.length
    ? estado.pets.map((p) => `<div class="cartao"><div class="pet-linha"><span class="emoji">${EMOJI[p.especie] || "🐾"}</span><div><h3>${esc(p.nome)}</h3><p>${ESPECIE[p.especie]} · ${PORTE[p.porte]}</p></div></div></div>`).join("")
    : `<div class="vazio">Você ainda não cadastrou nenhum pet.</div>`;
  mostrar(`
    <h2>Olá, <em>${esc(primeiro)}</em>!</h2>
    <p class="sub">Para onde vai seu pet hoje?</p>
    <div class="secao">Seus pets</div>
    ${pets}
    <button class="btn cheio" id="bSolicitar" type="button">🚗 Solicitar corrida</button>
    <button class="btn" id="bPets" type="button">🐾 Gerenciar pets</button>`, "home");
  document.getElementById("bSolicitar").onclick = telaSolicitar;
  document.getElementById("bPets").onclick = telaPets;
}

// ---------- JA02: Pets ----------
async function telaPets() {
  try { const r = await api("GET", "/pets"); estado.pets = r; } catch (e) { return telaLogin(); }
  const lista = estado.pets.length
    ? estado.pets.map((p) => `
      <div class="cartao"><div class="topo-cartao">
        <div class="pet-linha"><span class="emoji">${EMOJI[p.especie] || "🐾"}</span>
          <div><h3>${esc(p.nome)}</h3><p>${ESPECIE[p.especie]}${p.raca ? " · " + esc(p.raca) : ""} · ${PORTE[p.porte]}${p.idade != null ? " · " + p.idade + " ano(s)" : ""}</p>
          ${p.observacoes ? `<p>📝 ${esc(p.observacoes)}</p>` : ""}</div></div>
        <button class="mini" data-del="${p.id}" type="button">Remover</button>
      </div></div>`).join("")
    : `<div class="vazio">Nenhum pet cadastrado ainda.<br>Cadastre o primeiro abaixo 👇</div>`;
  mostrar(`
    <h2>Meus <em>pets</em></h2>
    <div id="m"></div>
    ${lista}
    <button class="btn cheio" id="bNovo" type="button">+ Adicionar pet</button>`, "pets");
  document.getElementById("bNovo").onclick = telaNovoPet;
  $tela.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => {
    if (!confirm("Remover este pet?")) return;
    try { await api("DELETE", "/pets/" + b.dataset.del); telaPets(); }
    catch (err) { msg("m", err.status === 409 ? "Este pet já tem corridas e não pode ser removido." : err.message); }
  });
}

function telaNovoPet() {
  mostrar(`
    <h2>Cadastro de <em>pet</em></h2>
    <form id="f" novalidate>
      <label>Nome</label><input name="nome" required>
      <div class="linha">
        <div><label>Espécie</label><select name="especie"><option value="CACHORRO">Cachorro</option><option value="GATO">Gato</option><option value="SILVESTRE">Silvestre</option></select></div>
        <div><label>Idade</label><input name="idade" type="number" min="0" inputmode="numeric"></div>
      </div>
      <label>Raça (opcional)</label><input name="raca">
      <label>Porte</label><select name="porte"><option value="PEQUENO">Porte pequeno</option><option value="MEDIO">Porte médio</option><option value="GRANDE">Porte grande</option></select>
      <label>Observações (comportamento, saúde, necessidades)</label><textarea name="observacoes"></textarea>
      <div id="m"></div>
      <button class="btn cheio" type="submit">Salvar pet</button>
      <button class="link" id="volta" type="button">Cancelar</button>
    </form>`, "pets");
  document.getElementById("volta").onclick = telaPets;
  document.getElementById("f").onsubmit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const corpo = { nome: f.nome, especie: f.especie, porte: f.porte };
    if (f.raca.trim()) corpo.raca = f.raca.trim();
    if (f.idade !== "") corpo.idade = Number(f.idade);
    if (f.observacoes.trim()) corpo.observacoes = f.observacoes.trim();
    try { await api("POST", "/pets", corpo); telaPets(); } catch (err) { msg("m", err.message); }
  };
}

// ---------- JA03: Solicitar corrida ----------
async function telaSolicitar() {
  try {
    const [pets, extras] = await Promise.all([api("GET", "/pets"), api("GET", "/extras")]);
    estado.pets = pets; estado.extras = extras;
  } catch (e) { return telaLogin(); }

  if (!estado.pets.length) {
    mostrar(`<h2>Solicitar <em>corrida</em></h2>
      <div class="vazio">Para solicitar uma corrida, primeiro cadastre um pet.</div>
      <button class="btn cheio" id="b" type="button">Cadastrar pet</button>`, "home");
    document.getElementById("b").onclick = telaNovoPet;
    return;
  }

  const r = estado.rascunho;
  if (!r.extras) r.extras = [];
  if (!r.petId) r.petId = estado.pets[0].id;
  mostrar(`
    <h2>Solicitar <em>corrida</em></h2>
    <form id="f" novalidate>
      <label>Pet</label>
      <select name="petId">${estado.pets.map((p) => `<option value="${p.id}" ${p.id === r.petId ? "selected" : ""}>${EMOJI[p.especie] || "🐾"} ${esc(p.nome)}</option>`).join("")}</select>
      <label>Partida</label><input name="origem" value="${esc(r.origem || "")}" placeholder="Rua, número">
      <label>Destino</label><input name="destino" value="${esc(r.destino || "")}" placeholder="Ex.: Clínica Veterinária Central, 50">
      <label>Agendar (opcional)</label><input name="agendada" type="datetime-local" value="${esc(r.agendada || "")}">
      <div class="secao">Você deseja</div>
      <div class="chips">${estado.extras.map((x) => `<button type="button" class="chip ${r.extras.includes(x.id) ? "ativo" : ""}" data-extra="${x.id}">${esc(x.nome)} +${dinheiro(x.preco)}</button>`).join("")}</div>
      <div id="m"></div>
      <button class="btn" type="submit">Ver categorias e valores</button>
    </form>`, "home");
  const form = document.getElementById("f");
  const guardar = () => {
    const f = Object.fromEntries(new FormData(form));
    Object.assign(r, { petId: Number(f.petId), origem: f.origem, destino: f.destino, agendada: f.agendada });
  };
  form.addEventListener("input", guardar);
  $tela.querySelectorAll("[data-extra]").forEach((c) => c.onclick = () => {
    const id = Number(c.dataset.extra);
    r.extras = r.extras.includes(id) ? r.extras.filter((x) => x !== id) : [...r.extras, id];
    c.classList.toggle("ativo");
  });
  form.onsubmit = async (e) => {
    e.preventDefault(); guardar();
    if (r.origem.trim().length < 3) return msg("m", "Informe o endereço de partida.");
    if (r.destino.trim().length < 3) return msg("m", "Informe o endereço de destino.");
    if (r.agendada && new Date(r.agendada).getTime() < Date.now() + 5 * 60000) return msg("m", "O agendamento deve ser pelo menos 5 minutos no futuro.");
    try {
      r.estimativa = await api("POST", "/corridas/estimativa", { petId: r.petId, origem: r.origem.trim(), destino: r.destino.trim(), extras: r.extras });
      r.categoriaId = (r.estimativa.categorias.find((c) => c.recomendada && c.disponivel) || {}).id || null;
      telaCategorias();
    } catch (err) { msg("m", err.message); }
  };
}

// ---------- JA04: Categorias ----------
function telaCategorias() {
  const r = estado.rascunho, est = r.estimativa;
  const cartoes = est.categorias.map((c) => `
    <div class="cartao ${c.id === r.categoriaId ? "sel" : ""} ${c.disponivel ? "" : "off"}" data-cat="${c.id}" ${c.disponivel ? "" : 'aria-disabled="true"'}>
      <div class="topo-cartao">
        <h3>${esc(c.nome)}${c.recomendada ? '<span class="selo">Recomendada</span>' : ""}${!c.disponivel ? '<span class="selo cinza">Indisponível</span>' : ""}</h3>
        ${c.disponivel ? `<span class="preco">${dinheiro(c.valorTotal)}</span>` : ""}
      </div>
      <p>${esc(c.descricao)}</p>
      ${!c.disponivel && c.motivo ? `<p>⚠️ ${esc(c.motivo)}</p>` : ""}
    </div>`).join("");
  mostrar(`
    <h2>Escolha a <em>categoria</em></h2>
    <p class="sub">${esc(est.pet.nome)} · ${est.distanciaKm} km · cerca de ${est.tempoEstimadoMin} min</p>
    ${cartoes}
    <div id="m"></div>
    <button class="btn cheio" id="bResumo" type="button">Continuar</button>
    <button class="link" id="bVolta" type="button">← Voltar e editar</button>`, "home");
  $tela.querySelectorAll("[data-cat]").forEach((el) => el.onclick = () => {
    const c = est.categorias.find((x) => x.id === Number(el.dataset.cat));
    if (!c.disponivel) return msg("m", c.motivo || "Categoria indisponível.");
    r.categoriaId = c.id; telaCategorias();
  });
  document.getElementById("bVolta").onclick = telaSolicitar;
  document.getElementById("bResumo").onclick = () => r.categoriaId ? telaResumo() : msg("m", "Selecione uma categoria.");
}

// ---------- JA05: Resumo e confirmação ----------
function telaResumo() {
  const r = estado.rascunho, est = r.estimativa;
  const cat = est.categorias.find((c) => c.id === r.categoriaId);
  const pet = estado.pets.find((p) => p.id === r.petId);
  mostrar(`
    <h2>Resumo da <em>corrida</em></h2>
    <div class="resumo">
      <div>${EMOJI[pet.especie] || "🐾"} <b>Pet:</b> ${esc(pet.nome)}</div>
      <div>📍 <b>Partida:</b> ${esc(r.origem)}</div>
      <div>🏁 <b>Destino:</b> ${esc(r.destino)}</div>
      <div>🚙 <b>Categoria:</b> ${esc(cat.nome)}</div>
      <div>🗓️ <b>Quando:</b> ${r.agendada ? dataBr(r.agendada) : "Agora"}</div>
      <div>🎁 <b>Extras:</b> ${est.extras.length ? est.extras.map((x) => esc(x.nome)).join(", ") : "nenhum"}</div>
      <div>⏱️ <b>Tempo estimado:</b> ${est.tempoEstimadoMin} min (${est.distanciaKm} km)</div>
      <div>💰 <b>Valor:</b> ${dinheiro(cat.valorTotal)}</div>
    </div>
    <div id="m"></div>
    <button class="btn cheio" id="bConf" type="button">Confirmar corrida</button>
    <button class="link" id="bVolta" type="button">← Voltar</button>`, "home");
  document.getElementById("bVolta").onclick = telaCategorias;
  document.getElementById("bConf").onclick = async (e) => {
    e.target.disabled = true;
    try {
      const corpo = { petId: r.petId, categoriaId: r.categoriaId, origem: r.origem.trim(), destino: r.destino.trim(), extras: r.extras };
      if (r.agendada) corpo.agendadaPara = new Date(r.agendada).toISOString();
      const c = await api("POST", "/corridas", corpo);
      estado.corridaId = c.id; estado.rascunho = {};
      telaCorrida(c);
    } catch (err) { msg("m", err.message); e.target.disabled = false; }
  };
}

// ---------- JA05/JA06: Motorista e acompanhamento ----------
const ROTA = [[20, 112], [62, 100], [96, 82], [150, 72], [212, 52], [272, 34]];
const PROGRESSO = { SOLICITADA: 0, MOTORISTA_CONFIRMADO: 0.05, A_CAMINHO: 0.3, EM_ANDAMENTO: 0.7, CONCLUIDA: 1, CANCELADA: 0 };

function pontoNaRota(p) {
  const seg = ROTA.length - 1, x = Math.min(Math.max(p, 0), 1) * seg, i = Math.min(Math.floor(x), seg - 1), t = x - i;
  return [ROTA[i][0] + (ROTA[i + 1][0] - ROTA[i][0]) * t, ROTA[i][1] + (ROTA[i + 1][1] - ROTA[i][1]) * t];
}

function mapaHtml(status) {
  const grade = [];
  for (let i = 0; i <= 300; i += 30) grade.push(`<line x1="${i}" y1="0" x2="${i - 40}" y2="150" stroke="#1d2a40" stroke-width="1"/>`);
  for (let j = 10; j <= 150; j += 28) grade.push(`<line x1="0" y1="${j}" x2="300" y2="${j - 8}" stroke="#1d2a40" stroke-width="1"/>`);
  const [cx, cy] = pontoNaRota(PROGRESSO[status] ?? 0);
  const fim = ROTA[ROTA.length - 1];
  return `<div class="mapa">
    <svg viewBox="0 0 300 150" preserveAspectRatio="none" aria-hidden="true">${grade.join("")}
      <polyline points="${ROTA.map((p) => p.join(",")).join(" ")}" fill="none" stroke="#3ddc84" stroke-width="3" stroke-dasharray="5 5" stroke-linecap="round"/>
      <circle cx="${fim[0]}" cy="${fim[1]}" r="7" fill="#3ddc84"/></svg>
    <span class="carro" id="carro" style="left:${(cx / 300) * 100}%;top:${(cy / 150) * 100}%">🚗</span></div>`;
}

function cabecalhoStatus(c) {
  const quando = c.agendadaPara ? `<div class="info">🗓️ Agendada: ${dataBr(c.agendadaPara)}</div>` : "";
  const eta = c.status === "MOTORISTA_CONFIRMADO" || c.status === "A_CAMINHO"
    ? `<div class="peq">Chegada em ${c.etaMinutos ?? "—"} minuto(s)</div>` : "";
  const m = c.motorista
    ? `<div class="motorista"><div class="foto">🧑‍✈️</div><div><b>${esc(c.motorista.nome)}</b><small>${esc(c.motorista.veiculo)} (${esc(c.motorista.placa)})</small>
        ${c.motorista.mediaEstrelas ? `<small><br>⭐ ${Number(c.motorista.mediaEstrelas).toFixed(1)} (${c.motorista.totalAvaliacoes})</small>` : ""}</div></div>` : "";
  return `<div class="status">
    <h3>${esc(c.statusTexto)}</h3>${eta}
    <div class="peq">A caminho de: ${esc(c.origem)} → ${esc(c.destino)}</div>
    ${m}
    <div class="info">Valor: <b>${dinheiro(c.valor)}</b> · ${EMOJI[c.pet.especie] || "🐾"} ${esc(c.pet.nome)} · ${esc(c.categoria.nome)}</div>${quando}</div>`;
}

function etapasHtml(c) {
  const idxAtual = c.etapas.map((e) => e.concluida).lastIndexOf(true);
  return `<ul class="etapas">${c.etapas.map((e, i) => `<li class="${e.concluida ? "feita" : ""} ${i === idxAtual ? "atual" : ""}">${esc(e.texto)}</li>`).join("")}</ul>`;
}

function telaCorrida(c) {
  if (c.status === "CONCLUIDA") return telaConcluida(c);
  if (c.status === "CANCELADA") return telaCancelada();
  mostrar(`
    ${mapaHtml(c.status)}
    ${cabecalhoStatus(c)}
    ${etapasHtml(c)}
    <div id="m"></div>
    <button class="btn escuro" id="bAvancar" type="button">⏩ Avançar etapa (demonstração)</button>
    ${c.status !== "EM_ANDAMENTO" ? '<button class="btn" id="bCancelar" type="button">Cancelar corrida</button>' : ""}`, "home");

  document.getElementById("bAvancar").onclick = async () => {
    try { telaCorrida(await api("POST", `/corridas/${c.id}/avancar`)); } catch (err) { msg("m", err.message); }
  };
  const bc = document.getElementById("bCancelar");
  if (bc) bc.onclick = async () => {
    if (!confirm("Cancelar esta corrida?")) return;
    try { await api("POST", `/corridas/${c.id}/cancelar`); telaCancelada(); } catch (err) { msg("m", err.message); }
  };

  // Consulta o status a cada 3 s (a API simula o andamento)
  estado.timer = setInterval(async () => {
    try {
      const n = await api("GET", `/corridas/${c.id}`);
      if (n.status !== c.status) telaCorrida(n);
    } catch (e) { pararTimer(); }
  }, 3000);
}

function telaCancelada() {
  mostrar(`<div class="centro"><div class="grande">🚫</div><h2>Corrida <em>cancelada</em></h2>
    <p class="sub">Sem problemas! Você pode fazer uma nova solicitação quando quiser.</p></div>
    <button class="btn cheio" id="b" type="button">Solicitar nova corrida</button>
    <button class="link" id="h" type="button">Voltar ao início</button>`, "home");
  document.getElementById("b").onclick = telaSolicitar;
  document.getElementById("h").onclick = telaHome;
}

// ---------- JA07: Conclusão e avaliação ----------
function telaConcluida(c) {
  const jaAvaliou = !!c.avaliacao;
  let estrelas = jaAvaliou ? c.avaliacao.estrelas : 0;
  mostrar(`
    <div class="centro"><div class="grande">🐾</div><h2>Viagem <em>concluída!</em></h2>
    <p class="sub">${esc(c.pet.nome)} chegou em segurança.</p></div>
    <div class="resumo">
      <div>📍 ${esc(c.origem)} → ${esc(c.destino)}</div>
      <div>🚙 ${esc(c.categoria.nome)} · ${c.motorista ? esc(c.motorista.nome) : ""}</div>
      <div>💰 <b>Valor final:</b> ${dinheiro(c.valor)}</div>
    </div>
    ${jaAvaliou
      ? `<div class="ok">Obrigado pela avaliação! ${"⭐".repeat(c.avaliacao.estrelas)}${c.avaliacao.comentario ? "<br>“" + esc(c.avaliacao.comentario) + "”" : ""}</div>`
      : `<div class="secao centro">Avalie a motorista</div>
         <div class="estrelas" id="estrelas">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-n="${n}" aria-label="${n} estrela(s)">★</button>`).join("")}</div>
         <label>Comentário (opcional)</label><textarea id="coment" maxlength="500"></textarea>
         <div id="m"></div>
         <button class="btn cheio" id="bEnviar" type="button">Enviar avaliação</button>`}
    <button class="btn" id="bNova" type="button">Solicitar nova corrida</button>
    <button class="link" id="bHome" type="button">Voltar ao início</button>`, "home");

  document.getElementById("bNova").onclick = telaSolicitar;
  document.getElementById("bHome").onclick = telaHome;
  if (jaAvaliou) return;
  const pintar = () => $tela.querySelectorAll("#estrelas button").forEach((b) => b.classList.toggle("on", Number(b.dataset.n) <= estrelas));
  $tela.querySelectorAll("#estrelas button").forEach((b) => b.onclick = () => { estrelas = Number(b.dataset.n); pintar(); });
  document.getElementById("bEnviar").onclick = async (e) => {
    if (!estrelas) return msg("m", "Escolha de 1 a 5 estrelas.");
    e.target.disabled = true;
    try {
      const corpo = { estrelas }; const t = document.getElementById("coment").value.trim(); if (t) corpo.comentario = t;
      telaConcluida(await api("POST", `/corridas/${c.id}/avaliacao`, corpo));
    } catch (err) { msg("m", err.message); e.target.disabled = false; }
  };
}

// ---------- JA08: Histórico ----------
async function telaHistorico() {
  let lista;
  try { lista = await api("GET", "/corridas"); } catch (e) { return telaLogin(); }
  const itens = lista.length
    ? lista.map((c) => `
      <div class="cartao" data-id="${c.id}" style="cursor:pointer">
        <div class="topo-cartao"><h3>${esc(c.destino)}</h3><span class="preco">${dinheiro(c.valor)}</span></div>
        <p>${dataBr(c.data)} · ${esc(c.pet)} · ${esc(c.categoria)}</p>
        <p>${esc(c.statusTexto)}${c.estrelas ? " · " + "⭐".repeat(c.estrelas) : ""}</p>
      </div>`).join("")
    : `<div class="vazio">Você ainda não fez nenhuma corrida.</div>`;
  mostrar(`<h2>Histórico de <em>corridas</em></h2>${itens}`, "historico");
  $tela.querySelectorAll("[data-id]").forEach((el) => el.onclick = async () => {
    try { telaCorrida(await api("GET", "/corridas/" + el.dataset.id)); } catch (err) { /* ignora */ }
  });
}

// ---------- Início do app ----------
(async function iniciar() {
  estado.token = lerToken();
  if (estado.token) await telaHome(); else telaCadastro();
})();
