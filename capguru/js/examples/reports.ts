/**
 * Report a previous task id. Does not create a captcha.
 *
 *   CAPGURU_API_KEY=... npx tsx examples/reports.ts good TASK_ID
 *   CAPGURU_API_KEY=... npx tsx examples/reports.ts bad TASK_ID
 */
import { CapGuruClient } from '../src/index.js';

async function main(): Promise<void> {
  const apiKey = process.env.CAPGURU_API_KEY;
  const which = process.argv[2];
  const taskId = process.argv[3];
  if (!apiKey || !taskId || (which !== 'good' && which !== 'bad')) {
    console.error('Usage: reports.ts <good|bad> TASK_ID');
    process.exit(1);
  }
  const client = new CapGuruClient(apiKey);
  const ok = which === 'good' ? await client.reportGood(taskId) : await client.reportBad(taskId);
  console.log(ok);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
