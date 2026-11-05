// Try names against the real filter:
//   npm run names                      -> runs every list in test/nameCases.ts
//   npm run names -- "Some Name" "x"   -> checks just the names you type
// It compiles src/validation.ts on the fly, so edits to src/nameRules.ts show up immediately.
import { buildSync } from 'esbuild';
import { pathToFileURL } from 'node:url';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = join(mkdtempSync(join(tmpdir(), 'names-')), 'v.mjs');
const cases = join(mkdtempSync(join(tmpdir(), 'names-')), 'c.mjs');
buildSync({ entryPoints: ['src/validation.ts'], bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error' });
buildSync({ entryPoints: ['test/nameCases.ts'], bundle: true, platform: 'node', format: 'esm', outfile: cases, logLevel: 'error' });
const { validatePlayerName } = await import(pathToFileURL(out).href);
const { blocked, allowed, badShape } = await import(pathToFileURL(cases).href);

const verdict = (name) => {
  try { return { ok: true, name: validatePlayerName(name) }; } catch (e) { return { ok: false, why: e.message }; }
};
const show = (name, expect) => {
  const v = verdict(name);
  const result = v.ok ? 'ACCEPTED' : 'REFUSED ';
  const flag = expect === undefined ? '' : (expect === v.ok ? '  ok' : '  <-- UNEXPECTED');
  console.log(`${result}  ${JSON.stringify(name).padEnd(34)}${v.ok ? '' : v.why}${flag}`);
  return expect === undefined || expect === v.ok;
};

const typed = process.argv.slice(2);
let bad = 0;
if (typed.length) {
  typed.forEach((n) => show(n));
} else {
  console.log('--- should be REFUSED (curse words / slurs) ---');
  blocked.forEach((n) => { if (!show(n, false)) bad++; });
  console.log('\n--- should be ACCEPTED (innocent names) ---');
  allowed.forEach((n) => { if (!show(n, true)) bad++; });
  console.log('\n--- should be REFUSED (bad characters / length) ---');
  badShape.forEach((n) => { if (!show(n, false)) bad++; });
  console.log(bad ? `\n${bad} unexpected result(s).` : '\nAll as expected.');
}
process.exit(bad ? 1 : 0);
