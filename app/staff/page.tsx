import type { Metadata } from "next";
import { loadStaffSession } from "../../lib/staff-session";
import { StaffPortal } from "./staff-portal";

export const metadata: Metadata = {
  title: "Staff workspace",
};

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const { bootstrap, fixtureMode, fixtureScenarios, fixturePersonas } =
    await loadStaffSession();

  return (
    <StaffPortal
      initialSession={bootstrap}
      fixtureMode={fixtureMode}
      fixtureScenarios={fixtureScenarios}
      fixturePersonas={fixturePersonas}
    />
  );
}
