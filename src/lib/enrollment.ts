import { prisma } from "./prisma";
import { Store } from "./store";
import { businessInput } from "./business-input";
import { normalizeEmail } from "./auth";
import { ApiError, textField } from "./api";
import { inviteAccount } from "./invitations";
import { productLimitError } from "./catalog-plan";
import { attachMedia, hostedMediaUrl, mediaReferences } from "./media-storage";
import { phoneField } from "./business-input";
import { enrollmentMediaHash, claimEnrollmentMedia } from "./enrollment-media";

export async function enrollBusiness(
  body: Record<string, unknown>,
  admin = false,
  uploaderId?: string,
  mediaToken?: string,
) {
  const fields = businessInput(body);
  const sellerType = body.sellerType || "SHOPFRONT";
  if (!["SHOPFRONT", "COMRADE"].includes(String(sellerType)))
    throw new ApiError(400, "Choose a shopfront or comrade seller.");
  fields.sellerType = sellerType as "SHOPFRONT" | "COMRADE";
  fields.verificationVisitRequested =
    !admin && body.verificationVisitRequested === true;
  if (
    !admin &&
    (!fields.services ||
      fields.services.filter((item) => item.priceFrom !== undefined).length <
        (sellerType === "COMRADE" ? 1 : 3))
  )
    throw new ApiError(
      400,
      "Add at least three core items with prices so students can compare.",
    );
  if (
    sellerType === "COMRADE" &&
    !admin &&
    !fields.verificationVisitRequested &&
    (!body.proofId || !fields.photos?.length)
  )
    throw new ApiError(
      400,
      "Add your private student ID and a public product/workspace photo, or request a free verification visit.",
    );
  if (
    !admin &&
    sellerType === "SHOPFRONT" &&
    !fields.photos?.length &&
    !fields.verificationVisitRequested
  )
    throw new ApiError(
      400,
      "Add a shop photo or request a free ambassador visit.",
    );
  const ref = textField(body.referralCode, "Referral code", 100);
  const ambassador = ref
    ? await prisma.account.findFirst({
        where: {
          id: ref,
          role: { in: ["ADMIN", "AMBASSADOR"] },
          emailVerifiedAt: { not: null },
        },
      })
    : null;
  if (ref && !ambassador)
    throw new ApiError(400, "This ambassador referral is invalid.");
  if (!fields.description || fields.description.length < 20)
    throw new ApiError(400, "Describe the business in at least 20 characters");
  if (!fields.serviceModes?.length)
    throw new ApiError(400, "Choose at least one service mode");
  if (
    admin &&
    (body.fieldVisitConfirmed !== true || body.ownerConsentConfirmed !== true)
  )
    throw new ApiError(
      400,
      "Confirm your shop visit and the owner’s permission before publishing a verified listing",
    );
  const urls = mediaReferences({
    photos: fields.photos || [],
    coverPhoto: fields.coverPhoto || "",
    services: fields.services || [],
  });
  if (urls.some((url) => !hostedMediaUrl(url)))
    throw new ApiError(400, "Use images uploaded through MoiMashinani");
  if (!fields.landmark && !fields.mapPin)
    throw new ApiError(400, "Enter a nearby landmark or choose a map pin.");
  if (!fields.landmark && fields.mapPin)
    fields.landmark = "Location shown on map";
  const limitError = productLimitError({}, [], fields.services || []);
  if (limitError) throw new ApiError(409, limitError);
  const signedInOwner =
    uploaderId && !admin
      ? await prisma.account.findUnique({ where: { id: uploaderId } })
      : null;
  if (
    signedInOwner &&
    (signedInOwner.role !== "BUSINESS" || !signedInOwner.emailVerifiedAt)
  )
    throw new ApiError(403, "Verify your email before enrolling.");
  const ownerEmail = signedInOwner?.email || normalizeEmail(body.ownerEmail);
  if (sellerType === "COMRADE")
    fields.listingExpiresAt = new Date(Date.now() + 30 * 864e5).toISOString();
  const ownerName = textField(body.ownerName, "Owner name", 120, true);
  const business = await prisma.$transaction(async (tx) => {
    const fingerprint = [fields.name?.trim().toLowerCase(), fields.zone].join(
      "|",
    );
    await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtext(${fingerprint}))) AS guard`;
    const nearby = await tx.business.findMany({
      where: {
        zone: fields.zone,
        OR: [{ phone: fields.phone }, { ownerEmail }],
      },
      select: { name: true, phone: true, ownerEmail: true },
    });
    if (
      nearby.some(
        (item) =>
          item.name.trim().toLowerCase() ===
            fields.name?.trim().toLowerCase() &&
          (item.phone === fields.phone || item.ownerEmail === ownerEmail),
      )
    )
      throw new ApiError(
        409,
        "This business appears to be listed already. Open the existing listing instead of submitting again.",
      );
    const owner =
      signedInOwner ||
      (await tx.account.upsert({
        where: { email: ownerEmail },
        create: {
          email: ownerEmail,
          name: ownerName,
          role: "BUSINESS",
        },
        update: {},
      }));
    if (owner.role !== "BUSINESS")
      throw new ApiError(
        400,
        "Use a business owner email separate from administrator or ambassador accounts",
      );
    const created = await Store.createBusiness(
      {
        ...fields,
        ambassadorId: admin ? uploaderId : ambassador?.id,
        ownerId: owner.id,
        ownerEmail,
        ownerName,
        ownerPhone:
          signedInOwner?.phone ||
          (body.ownerPhone ? phoneField(body.ownerPhone) : fields.phone),
        status: admin ? "ACTIVE" : "PENDING",
        verificationLevel: admin ? "L2" : "L0",
        isClaimed: Boolean(signedInOwner),
        activeTier: "NONE",
      },
      tx,
    );
    if (body.proofId) {
      const proof = await tx.verificationProof.updateMany({
        where: {
          id: textField(body.proofId, "Student proof", 100, true),
          sessionHash: enrollmentMediaHash(mediaToken) || "",
          businessId: null,
          createdAt: { gte: new Date(Date.now() - 864e5) },
        },
        data: { businessId: created.id },
      });
      if (proof.count !== 1)
        throw new ApiError(
          403,
          "Reupload your student ID in this browser before submitting.",
        );
    }
    await claimEnrollmentMedia(
      tx,
      mediaToken,
      mediaReferences(created),
      owner.id,
      created.id,
    );
    await attachMedia(tx, created.id, [], mediaReferences(created), uploaderId);
    await tx.businessAudit.create({
      data: {
        businessId: created.id,
        actorId: admin ? uploaderId || null : null,
        action: admin ? "FIELD_ENROLLED" : "SELF_ENROLLED",
        details: admin
          ? "Field visit and owner consent confirmed"
          : "Awaiting owner acceptance",
      },
    });
    return created;
  });
  const invitation = signedInOwner
    ? { sent: true }
    : await inviteAccount(business.ownerId!, business.id);
  return { business: await Store.getBusinessById(business.id), invitation };
}
