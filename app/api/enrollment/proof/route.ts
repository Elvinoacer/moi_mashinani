import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, apiError, assertSameOrigin } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth";
import {
  ENROLLMENT_MEDIA_COOKIE,
  enrollmentMediaHash,
} from "@/lib/enrollment-media";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await rateLimit(req, "private-proof", 10, 3600);
    if (Number(req.headers.get("content-length")) > 6 * 1024 * 1024)
      throw new ApiError(413, "Use a photo under 5 MB.");
    // Bound streamed bodies too, before decoding multipart data.
    if (!req.body) throw new ApiError(400, "Choose your student ID photo.");
    const reader = req.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > 6 * 1024 * 1024) {
        await reader.cancel();
        throw new ApiError(413, "Use a photo under 5 MB.");
      }
      chunks.push(part.value);
    }
    const form = await new Request(req.url, {
      method: "POST",
      headers: { "Content-Type": req.headers.get("content-type") || "" },
      body: Buffer.concat(chunks),
    }).formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024)
      throw new ApiError(400, "Choose a student ID photo under 5 MB.");
    let content: Buffer;
    try {
      content = await sharp(Buffer.from(await file.arrayBuffer()), {
        limitInputPixels: 25000000,
      })
        .rotate()
        .resize({
          width: 1400,
          height: 1400,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer();
    } catch {
      throw new ApiError(400, "Use a valid JPG, PNG or WebP image.");
    }
    const previous = req.cookies.get(ENROLLMENT_MEDIA_COOKIE)?.value;
    const token = enrollmentMediaHash(previous)
      ? previous!
      : randomBytes(32).toString("hex");
    const sessionHash = enrollmentMediaHash(token)!;
    await prisma.verificationProof.deleteMany({
      where: { sessionHash, businessId: null },
    });
    const proof = await prisma.verificationProof.create({
      data: { sessionHash, content: new Uint8Array(content) },
    });
    const response = NextResponse.json({ proofId: proof.id }, { status: 201 });
    response.cookies.set(ENROLLMENT_MEDIA_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 86400,
    });
    return response;
  } catch (error) {
    return apiError(error);
  }
}
export async function GET(req: NextRequest) {
  try {
    const proof = await prisma.verificationProof.findUnique({
      where: { id: req.nextUrl.searchParams.get("id") || "" },
    });
    if (!proof) throw new ApiError(404, "Proof not found.");
    const user = await getCurrentUser(req);
    const business = proof.businessId
      ? await prisma.business.findUnique({
          where: { id: proof.businessId },
          select: { ownerId: true, verificationVisitRequested: true },
        })
      : null;
    const stagingAccess =
      !proof.businessId &&
      proof.createdAt.getTime() > Date.now() - 864e5 &&
      proof.sessionHash ===
        enrollmentMediaHash(req.cookies.get(ENROLLMENT_MEDIA_COOKIE)?.value);
    if (
      user?.role !== "ADMIN" &&
      !(user?.role === "AMBASSADOR" && business?.verificationVisitRequested) &&
      !(user && business?.ownerId === user.id) &&
      !stagingAccess
    )
      throw new ApiError(403, "Private verification evidence.");
    return new NextResponse(new Uint8Array(proof.content), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
