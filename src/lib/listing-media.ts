import type { Business } from "./types";

type ListingMedia = Pick<Business, "coverPhoto" | "photos" | "services">;

/** Product-only listings still need a recognizable image in discovery and profiles. */
export function listingCoverPhoto(business: ListingMedia): string {
  return business.coverPhoto || business.photos[0] || business.services.find((item) => item.photo)?.photo || "";
}

export function listingGalleryPhotos(business: ListingMedia): string[] {
  const gallery = [business.coverPhoto, ...business.photos].filter(Boolean);
  return Array.from(new Set(gallery.length ? gallery : business.services.map((item) => item.photo).filter((photo): photo is string => Boolean(photo))));
}
