import { test } from "node:test";
import assert from "node:assert/strict";
import { sendRequestSms } from "../src/lib/sms";
test("SMS uses server credentials, sandbox host, encoded recipient and acceptance response", async () => {
  let calls = 0;
  await sendRequestSms(
    "0712345678",
    "Need charger & repair",
    async (url, init) => {
      calls++;
      assert.equal(
        String(url),
        "https://api.sandbox.africastalking.com/version1/messaging",
      );
      assert.equal(
        (init?.headers as Record<string, string>).apikey,
        "test-secret",
      );
      const body = new URLSearchParams(String(init?.body));
      assert.equal(body.get("to"), "+254712345678");
      assert.equal(body.get("message"), "Need charger & repair");
      return Response.json({
        SMSMessageData: {
          Recipients: [{ number: "+254712345678", statusCode: 101 }],
        },
      });
    },
    { AT_USERNAME: "sandbox", AT_API_KEY: "test-secret" },
  );
  assert.equal(calls, 1);
});
test("rejected SMS responses are not marked as accepted", async () => {
  await assert.rejects(() =>
    sendRequestSms(
      "0712345678",
      "Need charger",
      async () =>
        Response.json({
          SMSMessageData: {
            Recipients: [{ number: "+254712345678", statusCode: 403 }],
          },
        }),
      { AT_USERNAME: "sandbox", AT_API_KEY: "test-secret" },
    ),
  );
});
test("invalid recipients and absent credentials never make provider requests", async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return Response.json({});
  };
  await assert.rejects(() => sendRequestSms("123", "test", fetcher, {}));
  await assert.rejects(() => sendRequestSms("0712345678", "test", fetcher, {}));
  assert.equal(calls, 0);
});
