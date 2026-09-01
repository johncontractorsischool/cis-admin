import { handleStaffApiRequest } from "@/lib/staff-gateway";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return handleStaffApiRequest(request, "/me");
}
