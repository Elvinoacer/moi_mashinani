import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { sendVerificationEmail } from "../src/lib/mail";

const originalEnv = { ...process.env };
beforeEach(() => {
  Object.assign(process.env, {
    APP_URL: "https://moimashinani.test.invalid",
    RESEND_API_KEY: "re_test_only",
    EMAIL_FROM: "Moi Mashinani <support@gtss.software>",
  });
});
afterEach(() => {
  mock.restoreAll();
  process.env = { ...originalEnv };
});

test("verification uses Resend authentication, configured sender and one-use link", async () => {
  const fetchMock = mock.method(
    globalThis,
    "fetch",
    async (input: string, options: RequestInit) => {
      assert.equal(input, "https://api.resend.com/emails");
      assert.equal(options.method, "POST");
      const headers = new Headers(options.headers);
      assert.equal(headers.get("Authorization"), "Bearer re_test_only");
      assert.equal(headers.get("Content-Type"), "application/json");
      assert.equal(options.cache, "no-store");
      assert.ok(options.signal);
      const body = JSON.parse(String(options.body));
      assert.equal(body.from, process.env.EMAIL_FROM);
      assert.deepEqual(body.to, ["owner@test.invalid"]);
      assert.equal(body.subject, "Verify your MoiMashinani business account");
      assert.ok(body.text.includes("Hello Owner,"));
      assert.ok(body.text.includes("/verify?token=token%2Bwith%2Fcharacters"));
      return Response.json({ id: "accepted-id" });
    },
  );
  await sendVerificationEmail(
    "owner@test.invalid",
    "Owner",
    "token+with/characters",
    "INVITE",
  );
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("password resets preserve their distinct subject and instructions", async () => {
  mock.method(
    globalThis,
    "fetch",
    async (_input: string, options: RequestInit) => {
      const body = JSON.parse(String(options.body));
      assert.equal(body.subject, "Reset your MoiMashinani password");
      assert.ok(body.text.includes("Use this link to reset your password"));
      return Response.json({ id: "reset-id" });
    },
  );
  await sendVerificationEmail(
    "owner@test.invalid",
    "Owner",
    "reset-token",
    "RESET",
  );
});

test("missing key or sender fails before calling the provider", async () => {
  const fetchMock = mock.method(globalThis, "fetch", () => {
    throw new Error("Must not call the provider");
  });
  process.env.RESEND_API_KEY = "";
  await assert.rejects(
    sendVerificationEmail("owner@test.invalid", "Owner", "token", "INVITE"),
    { status: 503 },
  );
  process.env.RESEND_API_KEY = "re_test_only";
  process.env.EMAIL_FROM = "";
  await assert.rejects(
    sendVerificationEmail("owner@test.invalid", "Owner", "token", "INVITE"),
    { status: 503 },
  );
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("provider rejection and missing acceptance ID are not reported as delivery success", async () => {
  mock.method(globalThis, "fetch", async () =>
    Response.json({ message: "private provider response" }, { status: 403 }),
  );
  await assert.rejects(
    sendVerificationEmail("owner@test.invalid", "Owner", "token", "INVITE"),
    {
      status: 503,
      message: "The email provider did not accept the invitation",
    },
  );
  mock.restoreAll();
  mock.method(globalThis, "fetch", async () => Response.json({}));
  await assert.rejects(
    sendVerificationEmail("owner@test.invalid", "Owner", "token", "INVITE"),
    { status: 503 },
  );
});

test("network and timeout failures expose a recoverable message without provider secrets", async () => {
  mock.method(globalThis, "fetch", async () => {
    throw new Error("private provider details");
  });
  await assert.rejects(
    sendVerificationEmail("owner@test.invalid", "Owner", "token", "INVITE"),
    {
      status: 503,
      message:
        "Email delivery is temporarily unavailable. Please resend the invitation.",
    },
  );
});

test("public verification links require HTTPS", async () => {
  process.env.APP_URL = "http://unsafe.test.invalid";
  const fetchMock = mock.method(globalThis, "fetch", () => {
    throw new Error("Must not call the provider");
  });
  await assert.rejects(
    sendVerificationEmail("owner@test.invalid", "Owner", "token", "INVITE"),
    { status: 503, message: "APP_URL must use HTTPS" },
  );
  assert.equal(fetchMock.mock.callCount(), 0);
});
