import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Capture CLI secrets in memory and pass them only to the backend child process.
const cwd = fileURLToPath(new URL('..', import.meta.url));
let status;
try {
  status = JSON.parse(execFileSync('npx', ['supabase@2.119.0', 'status', '-o', 'json'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
} catch {
  // Do not print an execFile error object: stdout can include captured credentials.
  throw new Error('Cannot read local Supabase status. Start the backend local stack before running test:local.');
}
const run = spawnSync(process.execPath, [fileURLToPath(new URL('./smoke.mjs', import.meta.url))], {
  cwd,
  stdio: 'inherit',
  env: { ...process.env, SUPABASE_URL: status.API_URL, SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY, SUPABASE_ANON_KEY: status.ANON_KEY },
});
if (run.error) throw run.error;
process.exitCode = run.status ?? 1;
