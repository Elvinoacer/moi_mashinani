import { merchantActionPreview } from "@/lib/merchant-actions";
import { MerchantActionButton } from "@/components/MerchantActionButton";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Merchant quick action",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function ActionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let preview;
  try {
    preview = await merchantActionPreview(token);
  } catch {
    /* Expired/private capability. */
  }
  if (!preview)
    return (
      <main className="mx-auto max-w-lg p-6">
        <h1 className="text-xl font-bold">This action link is unavailable</h1>
        <p>
          It may have expired, already been used, or the listing has changed.
          Open your dashboard for a new action.
        </p>
      </main>
    );
  const { business, action } = preview;
  return (
    <main className="mx-auto max-w-lg space-y-5 p-6">
      <h1 className="text-2xl font-bold">{business.name}</h1>
      <p>
        This private link lets you complete one action without signing in. Keep
        it private.
      </p>
      <MerchantActionButton
        token={token}
        label={
          action.kind === "OPEN"
            ? "Confirm I am open now"
            : action.kind === "BOOKING"
              ? "Accept request & reply on WhatsApp"
              : "Reply with price on WhatsApp"
        }
      />
    </main>
  );
}
