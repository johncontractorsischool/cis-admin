import type { Metadata } from "next";
import { loadStaffSession } from "../../../../lib/staff-session";
import { StaffPortal } from "../../staff-portal";

export const metadata: Metadata = { title: "New Brochures" };
export const dynamic = "force-dynamic";
export default async function NewBrochuresPage() { const session = await loadStaffSession(); return <StaffPortal initialSession={session.bootstrap} fixtureMode={session.fixtureMode} fixtureScenarios={session.fixtureScenarios} fixturePersonas={session.fixturePersonas} initialPage="brochures" brochureView="new" />; }
