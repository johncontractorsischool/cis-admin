import { staffRequest } from "./staff-api";
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
