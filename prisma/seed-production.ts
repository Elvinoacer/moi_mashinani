import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { CATEGORIES, ZONES } from '../src/lib/constants';

async function main() {
  // Insert reference data only. Preserve any categories/zones edited by administrators.
  await prisma.$transaction(async tx => {
    for (const category of CATEGORIES) await tx.category.upsert({
      where: { id: category.id }, update: {},
      create: {
        id: category.id, slug: category.slug, name: category.name,
        icon: category.icon, description: category.description, color: category.color, count: 0,
      },
    });
    for (const zone of ZONES) await tx.zone.upsert({
      where: { id: zone.id }, update: {},
      create: {
        id: zone.id, slug: zone.slug, name: zone.name,
        landmarkHint: zone.landmarkHint, description: zone.description,
        center: zone.center ? { lat: zone.center.lat, lng: zone.center.lng } : undefined,
        walkTimeFromGate: zone.walkTimeFromGate,
        distanceFromGateMeters: zone.distanceFromGateMeters,
      },
    });
  }, { maxWait: 20000, timeout: 60000 });
  console.log(`Production reference data ready: ${CATEGORIES.length} categories and ${ZONES.length} zones. Existing records preserved.`);
}

main().catch(error => {
  console.error('Production reference data setup failed.', error instanceof Error ? error.name : 'Unknown error',
    error && typeof error === 'object' && 'code' in error ? error.code : '');
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
