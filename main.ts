// Potboard — a fast, accessible make.fun frontend (Node 22, standard library only).
//
// The app itself is the static site in app/: index.html plus ES modules and one
// stylesheet, no build step, reading make.fun's public API at runtime. This
// program is only the courier: it copies app/ and screenshots/ into the output
// directory and writes dossier.json there with the vendored dossier library,
// exactly as the bounty requires. vendor/makefun-frontend.ts stays untouched —
// the scorer rebuilds the dossier with its own copy and compares byte for byte.
//
// Local check:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// In the grader MAKEFUN_OUTPUT_DIR is unset and the output directory is /output.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });

const shotsDir = join(outputDir, 'screenshots');
mkdirSync(shotsDir, { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), shotsDir, { recursive: true });
}

// The caps mirror the gate's own limits, so a local run fails loudly on the
// same entries the scorer would refuse instead of handing in a bad dossier.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 3, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`Potboard handed in: app/ + screenshots/ copied to ${outputDir}, dossier.json written (${dossier.length} bytes).`);
