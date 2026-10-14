// Loaded only by the isolated workflow harness. Never sends external email.
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
if (
  process.env.RESEND_API_KEY !== "re_test_harness" ||
  !(
    process.env.APP_URL === "http://127.0.0.1:3100" ||
    (process.env.TEST_SERVER_MODE === "production" &&
      process.env.APP_URL === "https://127.0.0.1:3100")
  )
) {
  throw new Error("Resend capture requires the isolated workflow harness");
}
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
  const url = input instanceof Request ? input.url : String(input);
  if (url !== "https://api.resend.com/emails")
    return originalFetch(input, options);
  const request = new Request(input, options);
  if (
    request.method !== "POST" ||
    request.headers.get("Authorization") !== "Bearer re_test_harness"
  ) {
    return Response.json(
      { message: "Invalid test email request" },
      { status: 401 },
    );
  }
  const email = await request.json();
  const mailPath = "/tmp/moimashinani-test-mail.json";
  const messages = JSON.parse(readFileSync(mailPath, "utf8"));
  messages.push({ to: email.to, message: email.text });
  writeFileSync(mailPath, JSON.stringify(messages, null, 2), { mode: 0o600 });
  return Response.json({ id: randomUUID() });
};

// Never use production object storage during the isolated test harness.
import { S3Client } from "@aws-sdk/client-s3";
import {
  mkdirSync,
  readFileSync as readImage,
  writeFileSync as writeImage,
  unlinkSync,
  existsSync,
} from "node:fs";
import { createHash } from "node:crypto";
const imageDir = "/tmp/moimashinani-test-images";
mkdirSync(imageDir, { recursive: true });
const imagePath = (key) =>
  `${imageDir}/${createHash("sha256").update(key).digest("hex")}.webp`;
S3Client.prototype.send = async function (command) {
  if (process.env.R2_BUCKET_NAME !== "workflow-fixtures")
    throw new Error("Test object storage requires the fixture bucket");
  const input = command.input;
  if (command.constructor.name === "PutObjectCommand") {
    writeImage(imagePath(input.Key), Buffer.from(input.Body));
    return { ETag: "test-upload" };
  }
  if (command.constructor.name === "DeleteObjectCommand") {
    try {
      unlinkSync(imagePath(input.Key));
    } catch {}
    return {};
  }
  throw new Error("Unsupported test object storage command");
};
const emailFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.origin === "https://r2.test.invalid") {
    const path = imagePath(url.pathname.slice(1));
    return existsSync(path)
      ? new Response(readImage(path), {
          headers: { "Content-Type": "image/webp" },
        })
      : new Response(null, { status: 404 });
  }
  return emailFetch(input, options);
};
