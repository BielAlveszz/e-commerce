// ─────────────────────────────────────────────────────────────────
// import-catalogo.js — Importação em massa do catálogo (Meby Cosméticos)
//
// COMO USAR (rode na RAIZ do backend, onde está o .env):
//   node import-catalogo.js catalogo-meby.csv --dry-run  → só simula
//   node import-catalogo.js catalogo-meby.csv            → grava de verdade
//
// Robusto a: separador ";" (Excel pt-BR) OU ",", BOM do Excel, decimais com
// vírgula (65,90) ou ponto (65.90), e linhas "embrulhadas" pelo Excel.
// ─────────────────────────────────────────────────────────────────

require('dotenv').config();
const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT) || 5432,
});

function parseCSV(texto, delim) {
  const linhas = [];
  let campo = '', linha = [], dentroDeAspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i], proximo = texto[i + 1];
    if (dentroDeAspas) {
      if (c === '"' && proximo === '"') { campo += '"'; i++; }
      else if (c === '"') { dentroDeAspas = false; }
      else { campo += c; }
    } else {
      if (c === '"') { dentroDeAspas = true; }
      else if (c === delim) { linha.push(campo); campo = ''; }
      else if (c === '\r') { /* ignora */ }
      else if (c === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
      else { campo += c; }
    }
  }
  if (campo.length > 0 || linha.length > 0) { linha.push(campo); linhas.push(linha); }
  return linhas.filter(l => l.length > 1 || (l.length === 1 && l[0].trim() !== ''));
}

function paraNumero(valor) {
  if (valor === undefined || valor === null) return null;
  let limpo = String(valor).trim();
  if (limpo === '') return null;
  if (limpo.includes(',') && limpo.includes('.')) limpo = limpo.replace(/\./g, '').replace(',', '.');
  else limpo = limpo.replace(',', '.');
  const n = parseFloat(limpo);
  return Number.isNaN(n) ? null : n;
}

async function main() {
  const args = process.argv.slice(2);
  const arquivo = args.find(a => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');

  if (!arquivo) { console.error('❌ Uso: node import-catalogo.js <arquivo.csv> [--dry-run]'); process.exit(1); }
  if (!fs.existsSync(arquivo)) { console.error(`❌ Arquivo não encontrado: ${arquivo}`); process.exit(1); }

  let conteudo = fs.readFileSync(arquivo, 'utf8').replace(/^\uFEFF/, '');
  const primeiraLinha = conteudo.split('\n')[0];
  const delim = (primeiraLinha.split(';').length > primeiraLinha.split(',').length) ? ';' : ',';

  let linhas = parseCSV(conteudo, delim);
  if (linhas.length < 2) { console.error('❌ O CSV precisa ter cabeçalho + pelo menos 1 produto.'); process.exit(1); }

  const headerLen = linhas[0].length;
  linhas = linhas.map((l, idx) => {
    if (idx > 0 && l.length === 1 && headerLen > 1) {
      const re = parseCSV(l[0], delim);
      if (re.length && re[0].length > 1) return re[0];
    }
    return l;
  });

  const cabecalho = linhas[0].map(h => h.trim().toLowerCase());
  const col = (nome) => cabecalho.indexOf(nome);
  const obrigatorias = ['nome', 'descricao', 'preco', 'quantidade_estoque', 'categoria', 'sub_categoria'];
  const faltando = obrigatorias.filter(c => col(c) === -1);
  if (faltando.length > 0) { console.error(`❌ Faltam colunas no CSV: ${faltando.join(', ')}`); process.exit(1); }

  const dados = linhas.slice(1);
  console.log(`\n📦 ${dados.length} produto(s) no CSV (separador detectado: "${delim}").`);
  console.log(dryRun ? '🧪 Modo DRY-RUN: nada será gravado.\n' : '💾 Gravando no banco...\n');

  const cacheCategoria = new Map();
  const cacheSubCategoria = new Map();
  const client = await pool.connect();
  let inseridos = 0, pulados = 0, erros = 0;
  const detalhesErro = [];

  const acharOuCriarCategoria = async (nome) => {
    const chave = nome.toLowerCase();
    if (cacheCategoria.has(chave)) return cacheCategoria.get(chave);
    const { rows } = await client.query('SELECT id FROM categorias WHERE LOWER(nome) = LOWER($1)', [nome]);
    let id;
    if (rows.length > 0) id = rows[0].id;
    else if (!dryRun) { const r = await client.query('INSERT INTO categorias (nome) VALUES ($1) RETURNING id', [nome]); id = r.rows[0].id; console.log(`  ➕ Categoria criada: ${nome}`); }
    else id = `(nova:${nome})`;
    cacheCategoria.set(chave, id);
    return id;
  };

  const acharOuCriarSubCategoria = async (nome, categoriaId) => {
    const chave = `${categoriaId}::${nome.toLowerCase()}`;
    if (cacheSubCategoria.has(chave)) return cacheSubCategoria.get(chave);
    const { rows } = await client.query('SELECT id FROM sub_categorias WHERE LOWER(nome) = LOWER($1) AND categoria_id = $2', [nome, typeof categoriaId === 'number' ? categoriaId : -1]);
    let id;
    if (rows.length > 0) id = rows[0].id;
    else if (!dryRun) { const r = await client.query('INSERT INTO sub_categorias (nome, categoria_id) VALUES ($1, $2) RETURNING id', [nome, categoriaId]); id = r.rows[0].id; console.log(`  ➕ Subcategoria criada: ${nome}`); }
    else id = `(nova:${nome})`;
    cacheSubCategoria.set(chave, id);
    return id;
  };

  for (let i = 0; i < dados.length; i++) {
    const linhaNum = i + 2;
    const l = dados[i];
    const get = (nome) => (col(nome) !== -1 ? (l[col(nome)] ?? '').trim() : '');

    const nome = get('nome');
    const descricao = get('descricao');
    const preco = paraNumero(get('preco'));
    const precoPromo = paraNumero(get('preco_promocional'));
    const estoque = paraNumero(get('quantidade_estoque'));
    const categoria = get('categoria');
    const subCategoria = get('sub_categoria');
    const urlImagem = get('url_imagem') || null;

    if (!nome || !descricao || preco === null || estoque === null || !categoria || !subCategoria) {
      erros++; detalhesErro.push(`Linha ${linhaNum}: campos obrigatórios faltando.`); continue;
    }
    if (preco <= 0) { erros++; detalhesErro.push(`Linha ${linhaNum} ("${nome}"): preço deve ser maior que zero.`); continue; }
    if (precoPromo !== null && precoPromo > 0 && precoPromo >= preco) { erros++; detalhesErro.push(`Linha ${linhaNum} ("${nome}"): promocional deve ser menor que o preço.`); continue; }

    try {
      const existe = await client.query('SELECT id FROM produtos WHERE LOWER(nome) = LOWER($1) AND deletado_em IS NULL', [nome]);
      if (existe.rows.length > 0) { pulados++; console.log(`  ⏭️  Já existe, pulando: ${nome}`); continue; }

      const categoriaId = await acharOuCriarCategoria(categoria);
      const subCategoriaId = await acharOuCriarSubCategoria(subCategoria, categoriaId);

      if (!dryRun) {
        await client.query(
          `INSERT INTO produtos (nome, descricao, preco, preco_promocional, quantidade_estoque, sub_categoria_id, url_imagem, esta_ativo)
           VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)`,
          [nome, descricao, preco, precoPromo, Math.round(estoque), subCategoriaId, urlImagem]
        );
      }
      inseridos++;
      console.log(`  ✅ ${dryRun ? '[simulado] ' : ''}${nome}`);
    } catch (err) {
      erros++; detalhesErro.push(`Linha ${linhaNum} ("${nome}"): ${err.message}`);
    }
  }

  client.release();
  await pool.end();

  console.log('\n──────────── RESUMO ────────────');
  console.log(`✅ Inseridos: ${inseridos}`);
  console.log(`⏭️  Pulados (já existiam): ${pulados}`);
  console.log(`❌ Com erro: ${erros}`);
  if (detalhesErro.length > 0) { console.log('\nErros:'); detalhesErro.forEach(e => console.log('  - ' + e)); }
  if (dryRun) console.log('\n🧪 DRY-RUN — nada foi gravado. Rode sem --dry-run para valer.');
  console.log('');
}

main().catch(err => { console.error('Erro fatal na importação:', err); process.exit(1); });