import { handleStaffApiRequest } from "@/lib/staff-gateway";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return handleStaffApiRequest(request, "/logout");
}
