import type { Metadata } from "next";
import { loadStaffSession } from "../../../../lib/staff-session";
import { StaffPortal } from "../../staff-portal";

export const metadata: Metadata = { title: "Search Brochures" };
export const dynamic = "force-dynamic";
export default async function SearchBrochuresPage() { const session = await loadStaffSession(); return <StaffPortal initialSession={session.bootstrap} fixtureMode={session.fixtureMode} fixtureScenarios={session.fixtureScenarios} fixturePersonas={session.fixturePersonas} initialPage="brochures" brochureView="search" />; }
