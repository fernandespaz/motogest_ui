// Gera src/lib/permissoesPorEndpoint.ts a partir dos @PreAuthorize dos controllers do backend.
// Uso: npm run gen:perms [-- <pasta infrastructure/web do backend>]. Rode sempre que um endpoint protegido mudar no backend.
const fs = require('fs');
const path = require('path');
const root =
  process.argv[2] ?? path.join(__dirname, "../../../motogest_api/src/main/java/com/motogest/api/infrastructure/web");
const saida = path.join(__dirname, "../src/lib/permissoesPorEndpoint.ts");
const out = [];
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (p.endsWith('Controller.java')) parse(p);
  }
}
function authsOf(expr) {
  return [...expr.matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);
}
function parse(f) {
  const src = fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
  const cls = src.match(/@RequestMapping\(\s*(?:value\s*=\s*)?"([^"]*)"/);
  const base = cls ? cls[1] : '';
  const classPre = src.slice(0, src.indexOf('class ')).match(/@PreAuthorize\("([^"]*)"\)/);
  const re = /((?:[ \t]*@\w+(?:\((?:[^()]|\([^()]*\))*\))?[ \t]*\n)+)[ \t]*(?:public|protected)\s+[^\n]*\(/g;
  let m;
  while ((m = re.exec(src))) {
    const ann = m[1];
    const map = ann.match(/@(Get|Post|Put|Delete|Patch)Mapping(?:\(\s*(?:value\s*=\s*)?(?:\{\s*)?(?:"([^"]*)")?[^)]*\))?/);
    if (!map) continue;
    const pre = ann.match(/@PreAuthorize\("([^"]*)"\)/) || classPre;
    if (!pre) continue;
    const auths = authsOf(pre[1]);
    if (!auths.length) continue;
    out.push({ m: map[1].toUpperCase(), p: (base + (map[2] || '')).split('//').join('/'), a: auths });
  }
}
walk(root);
out.sort((x, y) => x.p.localeCompare(y.p) || x.m.localeCompare(y.m));
const seen = new Set();
const rows = out.filter((r) => {
  const k = r.m + r.p;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});
const body = rows.map((r) => `  ['${r.m}', '${r.p}', [${r.a.map((a) => `'${a}'`).join(', ')}]],`).join('\n');
fs.writeFileSync(
  saida,
  `/**
 * GERADO a partir dos @PreAuthorize dos controllers do backend (método, rota, permissões aceitas — basta UMA delas).
 * O 403 do backend não diz qual permissão faltou, então o diálogo de "sem permissão" usa esta tabela pra explicar.
 * Ao criar/alterar um endpoint protegido no backend, regere com: npm run gen:perms (scripts/gen-permissoes.cjs).
 */
export const PERMISSOES_POR_ENDPOINT: ReadonlyArray<readonly [string, string, readonly string[]]> = [
${body}
];
`,
);
console.log(rows.length + ' endpoints');
