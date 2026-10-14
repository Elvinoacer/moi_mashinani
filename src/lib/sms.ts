import { formatKenyanPhone } from "./payments";
// Africa's Talking contract: https://africastalkingltd.gitbooks.io/mobile-communication-apis/content/downloads.html
export function smsConfigured() {
  return Boolean(process.env.AT_USERNAME && process.env.AT_API_KEY);
}
export async function sendRequestSms(
  phone: string,
  message: string,
  fetcher: typeof fetch = fetch,
  env: Record<string, string | undefined> = process.env,
) {
  const digits = formatKenyanPhone(phone);
  if (!/^254[17]\d{8}$/.test(digits)) throw new Error("Invalid SMS recipient");
  if (!env.AT_USERNAME || !env.AT_API_KEY)
    throw new Error("SMS alerts are not configured");
  const body = new URLSearchParams({
    username: env.AT_USERNAME,
    to: "+" + digits,
    message,
  });
  if (env.AT_SENDER_ID) body.set("from", env.AT_SENDER_ID);
  const host =
    env.AT_USERNAME === "sandbox"
      ? "api.sandbox.africastalking.com"
      : "api.africastalking.com";
  const response = await fetcher(`https://${host}/version1/messaging`, {
    method: "POST",
    headers: {
      apikey: env.AT_API_KEY,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("SMS provider unavailable");
  const data = (await response.json()) as {
    SMSMessageData?: {
      Recipients?: Array<{ statusCode: number; number: string }>;
    };
  };
  if (
    !data.SMSMessageData?.Recipients?.some(
      (r) => r.statusCode === 101 && formatKenyanPhone(r.number) === digits,
    )
  )
    throw new Error("SMS provider did not accept delivery");
}
