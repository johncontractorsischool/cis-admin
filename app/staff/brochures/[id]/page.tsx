import type { Metadata } from "next";
import { loadStaffSession } from "../../../../lib/staff-session";
import { StaffPortal } from "../../staff-portal";

export const metadata: Metadata = { title: "Brochure Details" };
export const dynamic = "force-dynamic";
export default async function BrochureDetailsPage({ params }: { params: Promise<{ id: string }> }) { const [{ id }, session] = await Promise.all([params, loadStaffSession()]); return <StaffPortal initialSession={session.bootstrap} fixtureMode={session.fixtureMode} fixtureScenarios={session.fixtureScenarios} fixturePersonas={session.fixturePersonas} initialPage="brochures" brochureView="detail" brochureId={Number(id)} />; }
