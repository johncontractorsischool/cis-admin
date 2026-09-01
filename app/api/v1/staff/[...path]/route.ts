import { handleStaffApiRequest } from "@/lib/staff-gateway";

export const dynamic = "force-dynamic";

async function handle(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return handleStaffApiRequest(
    request,
    `/${path.map((part) => encodeURIComponent(part)).join("/")}`,
  );
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
