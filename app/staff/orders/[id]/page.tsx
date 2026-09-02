import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loadStaffSession } from "../../../../lib/staff-session";
import { StaffPortal } from "../../staff-portal";

export const metadata: Metadata = { title: "Order record" };
export const dynamic = "force-dynamic";

export default async function OrderRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recordId = Number(id);
  if (!Number.isInteger(recordId) || recordId <= 0) redirect("/staff");
  const session = await loadStaffSession();
  return <StaffPortal initialSession={session.bootstrap} fixtureMode={session.fixtureMode} fixtureScenarios={session.fixtureScenarios} fixturePersonas={session.fixturePersonas} initialPage="order-detail" recordId={recordId} />;
}
