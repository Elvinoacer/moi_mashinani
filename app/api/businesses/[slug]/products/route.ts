import { NextRequest, NextResponse } from "next/server";
import { Store, computeProfileStrength, mapPrismaBusiness } from "@/lib/store";
import { prisma } from "@/lib/prisma";
import { requireBusinessAccess } from "@/lib/auth";
import {
  ApiError,
  apiError,
  assertSameOrigin,
  jsonBody,
  textField,
} from "@/lib/api";
import { businessInput } from "@/lib/business-input";
import { productLimitError } from "@/lib/catalog-plan";
import {
  attachMedia,
  cleanRemovedMedia,
  hostedMediaUrl,
  mediaReferences,
  queueRemovedMedia,
} from "@/lib/media-storage";
import { withNotificationDelivery } from "@/lib/notification-response";
import {
  isEligibleBroadcastPlan,
  queueCampusBroadcast,
} from "@/lib/public-push";
import type { ServiceItem } from "@/lib/types";

async function mutate(
  req: NextRequest,
  props: { params: Promise<{ slug: string }> },
  method: "POST" | "PATCH" | "DELETE",
) {
  try {
    assertSameOrigin(req);
    const { slug } = await props.params;
    const initial = await Store.getBusinessBySlug(slug);
    if (!initial) throw new ApiError(404, "Business not found");
    const user = await requireBusinessAccess(req, initial);
    const body = await jsonBody(req);
    const item =
      method !== "DELETE"
        ? businessInput({ services: [body] }, true).services![0]
        : null;
    const id = item?.id || textField(body.id, "Product ID", 100, true);
    // Reject new arbitrary external URLs; keep already saved legacy assets editable.
    if (
      item?.photo &&
      !mediaReferences(initial).includes(item.photo) &&
      !hostedMediaUrl(item.photo)
    )
      throw new ApiError(400, "Upload a product photo through MoiMashinani");
    let matchedRestockDevices = 0;
    await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${initial.id} FOR UPDATE`;
        const business = await tx.business.findUniqueOrThrow({
          where: { id: initial.id },
        });
        const before = Array.isArray(business.services)
          ? (business.services as unknown as ServiceItem[])
          : [];
        const previousItem = before.find((p) => p.id === id);
        if (method === "PATCH" && item && item.inStock === undefined)
          item.inStock = previousItem?.inStock;
        const existing = Boolean(previousItem);
        if (method === "POST" && existing)
          throw new ApiError(409, "This product already exists");
        if (method !== "POST" && !existing)
          throw new ApiError(404, "Product not found");
        let services =
          method === "POST"
            ? [...before, item!]
            : method === "PATCH"
              ? before.map((product) => (product.id === id ? item! : product))
              : before.filter((product) => product.id !== id);
        if (method === "PATCH" && body.publishFirst === true)
          services = [
            services.find((product) => product.id === id)!,
            ...services.filter((product) => product.id !== id),
          ];
        const error = productLimitError(
          { proEndsAt: business.proEndsAt?.toISOString() },
          before,
          services,
        );
        if (error) throw new ApiError(409, error);
        await attachMedia(
          tx,
          business.id,
          mediaReferences(business),
          mediaReferences({ ...business, services }),
          user.id,
        );
        await queueRemovedMedia(
          tx,
          business.id,
          mediaReferences(business),
          mediaReferences({ ...business, services }),
          user.id,
        );
        const mapped = mapPrismaBusiness(business);
        const profileStrength = computeProfileStrength({
          ...mapped,
          services,
        });
        await tx.business.update({
          where: { id: business.id },
          data: {
            services: JSON.parse(JSON.stringify(services)),
            profileStrength,
          },
        });

        const isNewOrRestocked =
          item &&
          item.inStock !== false &&
          (method === "POST" ||
            (method === "PATCH" && previousItem?.inStock === false));

        if (
          isNewOrRestocked &&
          business.status === "ACTIVE" &&
          !business.isTemporarilyClosed &&
          isEligibleBroadcastPlan({
            proEndsAt: business.proEndsAt,
            featuredUntil: business.tierEndsAt,
            dealBlastEndsAt: business.dealBlastEndsAt,
            activeTier: business.activeTier,
          })
        ) {
          const hourKey = new Date().toISOString().slice(0, 13);
          const broadcast = await queueCampusBroadcast(tx, {
            excludeAccountId: business.ownerId,
            eventKey: `restock/${business.id}/${item.id}/${hourKey}`,
            content: {
              kind: "RESTOCK_ALERT",
              title: `${method === "PATCH" ? "Back in stock" : "New on campus"}: ${item.name}`,
              body: `${business.name} now has ${item.name}${item.priceFrom !== undefined ? ` from KES ${item.priceFrom.toLocaleString("en-KE")}` : ""} available.`,
              path: `/b/${business.slug}#service-${encodeURIComponent(item.id)}`,
              button: "View item & order",
            },
            filter: {
              keywordMatchOnly: true,
              zone: business.zone,
              servesZones: mapped.servesZones,
              businessId: business.id,
              category: business.primaryCategory,
              text: `${item.name} ${item.note || ""} ${business.name}`,
            },
          });
          matchedRestockDevices = broadcast.matchedDevices;
        }
        return mediaReferences(business);
      },
      { maxWait: 20000, timeout: 30000 },
    );
    const updated = await Store.getBusinessById(initial.id);
    const mediaCleanup = await cleanRemovedMedia(initial.id);
    const response = NextResponse.json({
      ...updated,
      mediaCleanup,
      matchedRestockDevices,
    });
    return matchedRestockDevices > 0
      ? withNotificationDelivery(response)
      : response;
  } catch (error) {
    return apiError(error);
  }
}
export const POST = (
  req: NextRequest,
  props: { params: Promise<{ slug: string }> },
) => mutate(req, props, "POST");
export const PATCH = (
  req: NextRequest,
  props: { params: Promise<{ slug: string }> },
) => mutate(req, props, "PATCH");
export const DELETE = (
  req: NextRequest,
  props: { params: Promise<{ slug: string }> },
) => mutate(req, props, "DELETE");
