// GIVEN (not part of the course): runs one lecture's demo.   Usage: npm run lesson 03
// It finds demos/03-*.ts (or .tsx) and runs it with Node + tsx (tsx lets Node run TypeScript and JSX).
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const number = (process.argv[2] ?? '').padStart(2, '0');
const demo = readdirSync(new URL('../demos/', import.meta.url)).find((file) => file.startsWith(`${number}-`));

if (!process.argv[2] || !demo) {
  console.log('Usage: npm run lesson <number>     for example: npm run lesson 03');
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--import', 'tsx', `demos/${demo}`], {
  stdio: 'inherit',
  cwd: new URL('..', import.meta.url),
});
process.exit(result.status ?? 1);
