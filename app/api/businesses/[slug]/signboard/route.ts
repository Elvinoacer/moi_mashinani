import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { Store } from "@/lib/store";
import { requireBusinessAccess } from "@/lib/auth";
import { apiError, ApiError } from "@/lib/api";
import { applicationUrl } from "@/lib/mail";
import { escapeHtml } from "@/lib/notification-content";
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params,
      business = await Store.getBusinessBySlug(slug);
    if (!business) throw new ApiError(404, "Business not found");
    if (business.status !== "ACTIVE")
      await requireBusinessAccess(req, business);
    const url = `${applicationUrl()}/b/${business.slug}`;
    const qr = await QRCode.toString(url, {
      type: "svg",
      width: 420,
      margin: 4,
      errorCorrectionLevel: "M",
    });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800"><rect width="600" height="800" rx="24" fill="#f7f8f2"/><rect width="600" height="150" fill="#183e35"/><text x="300" y="75" text-anchor="middle" fill="white" font-family="sans-serif" font-size="38" font-weight="bold">Moi Mashinani</text><text x="300" y="115" text-anchor="middle" fill="#d9f279" font-family="sans-serif" font-size="20">Your campus price list</text><text x="300" y="210" text-anchor="middle" fill="#183e35" font-family="sans-serif" font-size="26" font-weight="bold">${escapeHtml(business.name.slice(0, 32))}</text><g transform="translate(90 240)">${qr}</g><text x="300" y="695" text-anchor="middle" fill="#183e35" font-family="sans-serif" font-size="24">Scan for prices &amp; WhatsApp orders</text><text x="300" y="738" text-anchor="middle" fill="#183e35" font-family="sans-serif" font-size="13">${escapeHtml(url)}</text><text x="300" y="772" text-anchor="middle" fill="#667064" font-family="sans-serif" font-size="15">Moi University · Kesses</text></svg>`;
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Content-Disposition": `attachment; filename="${business.slug}-signboard.svg"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
