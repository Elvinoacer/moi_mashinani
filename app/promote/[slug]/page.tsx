import { redirect } from "next/navigation";
export default async function LegacyCheckout({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const { slug } = await params;
  const { payment } = await searchParams;
  redirect(
    `/dashboard/${encodeURIComponent(slug)}?tab=billing${payment ? `&payment=${encodeURIComponent(payment)}` : ""}`,
  );
}
