import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loadStaffSession } from "../../../../lib/staff-session";
import { StaffPortal } from "../../staff-portal";

export const metadata: Metadata = { title: "Student details" };
export const dynamic = "force-dynamic";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const studentId = Number(id);
  if (!Number.isInteger(studentId) || studentId <= 0) redirect("/staff/students");
  const { bootstrap, fixtureMode, fixtureScenarios, fixturePersonas } = await loadStaffSession();
  return <StaffPortal initialSession={bootstrap} fixtureMode={fixtureMode} fixtureScenarios={fixtureScenarios} fixturePersonas={fixturePersonas} initialPage="student-detail" studentId={studentId} />;
}
