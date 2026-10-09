import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { CATEGORIES, ZONES } from '../src/lib/constants';

async function main() {
  // Insert reference data only. Preserve any categories/zones edited by administrators.
  await prisma.$transaction([
    ...CATEGORIES.map(category => prisma.category.upsert({
      where: { id: category.id }, update: {},
      create: {
        id: category.id, slug: category.slug, name: category.name,
        icon: category.icon, description: category.description, color: category.color, count: 0,
      },
    })),
    ...ZONES.map(zone => prisma.zone.upsert({
      where: { id: zone.id }, update: {},
      create: {
        id: zone.id, slug: zone.slug, name: zone.name,
        landmarkHint: zone.landmarkHint, description: zone.description,
        center: zone.center ? { lat: zone.center.lat, lng: zone.center.lng } : undefined,
        walkTimeFromGate: zone.walkTimeFromGate,
        distanceFromGateMeters: zone.distanceFromGateMeters,
      },
    })),
  ]);
  console.log(`Production reference data ready: ${CATEGORIES.length} categories and ${ZONES.length} zones. Existing records preserved.`);
}

main().catch(() => {
  console.error('Production reference data setup failed. Check the database connection and migration status.');
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
