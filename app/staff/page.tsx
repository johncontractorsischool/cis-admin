import type { Metadata } from "next";
import { StaffPortal } from "./staff-portal";

export const metadata: Metadata = {
  title: "Staff sign in",
};

export default function StaffPage() {
  return <StaffPortal />;
}
