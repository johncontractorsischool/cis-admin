import { staffRequest } from "./staff-api";
import type {
  ApplicationSearchRecord,
  GlobalSearchPayload,
  OrderSearchRecord,
} from "./global-search";

export function searchStaff(query: string) {
  return staffRequest<GlobalSearchPayload>(`/search?q=${encodeURIComponent(query.trim())}`);
}

export function getOrderRecord(id: number) {
  return staffRequest<{ data: OrderSearchRecord; message: string }>(`/orders/${id}`);
}

export function getApplicationRecord(id: number) {
  return staffRequest<{ data: ApplicationSearchRecord; message: string }>(`/applications/${id}`);
}
