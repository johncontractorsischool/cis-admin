import { handleStaffApiRequest } from "@/lib/staff-gateway";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return handleStaffApiRequest(
    request,
    `/auth/challenges/${encodeURIComponent(id)}/resend`,
  );
}
