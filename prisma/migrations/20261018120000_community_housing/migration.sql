CREATE TYPE "HousingIntent" AS ENUM ('LOOKING', 'VACANCY');
ALTER TABLE "ServiceRequest" ADD COLUMN "housingIntent" "HousingIntent";
-- Existing requests retain their original verified-seller contact consent.

UPDATE "Zone" SET "name" = 'All Moi campuses & areas',
  "landmarkHint" = 'Main Campus, other Moi campuses & surroundings',
  "description" = 'Across Moi University campuses and surrounding communities'
WHERE "slug" = 'all';
UPDATE "Zone" SET "name" = 'Stage & surroundings' WHERE "slug" = 'stage';

INSERT INTO "Zone" ("id", "slug", "name", "landmarkHint", "description") VALUES
('campus-interior', 'campus-interior', 'Campus interior / hostels', 'Inside Main Campus, university hostels and halls', 'Housing, services and student spaces inside Moi Main Campus'),
('engineering-aerospace', 'engineering-aerospace', 'School of Engineering / Aerospace & surroundings', 'Engineering, Aerospace and nearby residences', 'The Engineering and Aerospace area and surrounding community'),
('mabs', 'mabs', 'Mabs', 'Mabs and surrounding residences', 'Community housing and businesses around Mabs'),
('chebarus', 'chebarus', 'Chebarus', 'Chebarus and surrounding residences', 'Community housing and businesses around Chebarus'),
('chs', 'chs', 'CHS / College of Health Sciences', 'Health Sciences, medical campus and surrounding residences', 'Moi University Health Sciences community and nearby housing'),
('other-campus', 'other-campus', 'Other Moi campus / area', 'Your area is welcome — include your campus and landmark in the details', 'Any other Moi University campus or surrounding area')
ON CONFLICT DO NOTHING;
