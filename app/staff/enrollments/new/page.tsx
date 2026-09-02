import type { Metadata } from "next";
import { loadStaffSession } from "../../../../lib/staff-session";
import { StaffPortal } from "../../staff-portal";

export const metadata: Metadata = { title: "Create customer order" };
export const dynamic = "force-dynamic";

export default async function StaffEnrollmentPage() {
  const { bootstrap, fixtureMode, fixtureScenarios, fixturePersonas } = await loadStaffSession();
  return <StaffPortal initialSession={bootstrap} fixtureMode={fixtureMode} fixtureScenarios={fixtureScenarios} fixturePersonas={fixturePersonas} initialPage="enrollment-new" />;
}
