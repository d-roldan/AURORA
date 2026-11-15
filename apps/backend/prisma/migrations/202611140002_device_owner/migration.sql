ALTER TABLE "Device" ADD CONSTRAINT "Device_single_owner" CHECK (("crewMemberId" IS NOT NULL)::int + ("habitatId" IS NOT NULL)::int = 1);
