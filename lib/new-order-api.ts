import { StaffApiError, staffRequest } from "./staff-api";
import type { NewOrderDetail, NewOrderInput, NewOrderPagination, NewOrderSummary, SalespersonOption } from "./new-orders";

export interface NewOrderFilters { search?: string; page?: number; perPage?: number }

export function listNewOrders(filters: NewOrderFilters) {
  const query = new URLSearchParams();
  if (filters.search) query.set("search", filters.search);
  query.set("page", String(filters.page ?? 1));
  query.set("per_page", String(filters.perPage ?? 50));
  return staffRequest<{ data: { items: NewOrderSummary[] }; meta: { pagination: NewOrderPagination }; message: string }>(`/new_order?${query}`);
}
export function getNewOrder(id: number) {
  return staffRequest<{ data: { order: NewOrderDetail; salespeople: SalespersonOption[] }; message: string }>(`/new_order/${id}`);
}

export function updateNewOrder(id: number, input: NewOrderInput) {
  return staffRequest<{ data: NewOrderDetail; message: string }>(`/new_order/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function markNewOrderShipped(id: number) {
  return staffRequest<{ data: { id: number; shipped: boolean }; message: string }>(`/new_order/shipped/${id}`, { method: "POST" });
}

export function markNewOrdersShipped(ids: number[]) {
  return staffRequest<{ data: { ids: number[]; updated: number }; message: string }>("/new_order/shipped_selected", { method: "POST", body: JSON.stringify({ ids }) });
}

export async function getNewOrderPrintDocument(kind: "labels" | "invoices", ids: number[]) {
  let response: Response;
  try {
    response = await fetch(`/api/v1/staff/new_order/${kind}`, {
      method: "POST",
      credentials: "include",
      headers: { accept: "text/html", "content-type": "application/json" },
      body: JSON.stringify({ ids }),
    });
  } catch {
    throw new StaffApiError("AUTH_UNAVAILABLE", "The print service is temporarily unavailable. Please retry.", 503);
  }
  if (response.ok) return response.text();

  let message = "The selected orders could not be prepared for printing.";
  try {
    const body = await response.json() as { error?: { message?: string }; message?: string };
    message = body.error?.message ?? body.message ?? message;
  } catch {
    // Keep the stable message when an upstream proxy returns a non-JSON error.
  }
  throw new StaffApiError(
    response.status === 401 ? "SESSION_EXPIRED" : response.status === 403 ? "FORBIDDEN" : response.status === 422 ? "VALIDATION_ERROR" : "AUTH_UNAVAILABLE",
    message,
    response.status,
  );
}
