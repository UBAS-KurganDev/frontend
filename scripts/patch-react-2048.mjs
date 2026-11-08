import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const packageRoot = new URL('../node_modules/react-2048/', import.meta.url);
const metadata = JSON.parse(await readFile(new URL('package.json', packageRoot), 'utf8'));
if (metadata.version !== '1.1.0') {
  throw new Error('Review the 2048 animation fix before changing react-2048@1.1.0.');
}

const marker = '// UBAS: keep input locked until tile cleanup has committed.';
const updates = [];
for (const filename of ['dist/index.js', 'dist/index.cjs']) {
  const file = new URL(filename, packageRoot);
  let source = await readFile(file, 'utf8');
  if (source.includes(marker)) continue;
  const prefix = filename.endsWith('.cjs') ? 'react.' : '';
  const replacements = [
    [
      `  const lastCall = ${prefix}useRef(0);`,
      `  ${marker}\n  const movePending = ${prefix}useRef(false);\n  const lastCall = ${prefix}useRef(0);`,
    ],
    [
      '      if (gameState.status !== "ongoing") return;',
      '      if (gameState.status !== "ongoing" || movePending.current) return;',
    ],
    [
      '        lastCall.current = now;\n        dispatch({ type });',
      '        lastCall.current = now;\n        movePending.current = true;\n        dispatch({ type });',
    ],
    [
      '  const startGame = () => {',
      `  ${prefix}useEffect(() => {\n    if (!gameState.hasChanged) movePending.current = false;\n  }, [gameState.hasChanged, gameState.moves]);\n  const startGame = () => {`,
    ],
  ];
  for (const [before, after] of replacements) {
    if (source.split(before).length !== 2) {
      throw new Error(`Unexpected react-2048 code in ${filename}; animation fix was not applied.`);
    }
    source = source.replace(before, after);
  }
  updates.push({ file, source });
}
for (const { file, source } of updates) {
  await writeFile(file, source, 'utf8');
  console.log(`Applied 2048 animation fix: ${fileURLToPath(file)}`);
}
