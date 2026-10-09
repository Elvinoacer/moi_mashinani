// Loaded only by the isolated workflow harness. Never sends external email.
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
if (process.env.RESEND_API_KEY !== 're_test_harness' || process.env.APP_URL !== 'http://127.0.0.1:3100') {
  throw new Error('Resend capture requires the isolated workflow harness');
}
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
  const url = input instanceof Request ? input.url : String(input);
  if (url !== 'https://api.resend.com/emails') return originalFetch(input, options);
  const request = new Request(input, options);
  if (request.method !== 'POST' || request.headers.get('Authorization') !== 'Bearer re_test_harness') {
    return Response.json({ message: 'Invalid test email request' }, { status: 401 });
  }
  const email = await request.json();
  const mailPath = '/tmp/moimashinani-test-mail.json';
  const messages = JSON.parse(readFileSync(mailPath, 'utf8'));
  messages.push({ to: email.to, message: email.text });
  writeFileSync(mailPath, JSON.stringify(messages, null, 2), { mode: 0o600 });
  return Response.json({ id: randomUUID() });
};
