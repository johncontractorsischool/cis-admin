import { staffRequest } from "./staff-api";
import type { BrochureConversionInput, MessageCustomer, MessageFilters, MessagePagination, MessageStaffOption, MessageUpdateInput, StaffMessage } from "./message-center";

function queryString(filters: MessageFilters) {
  const query = new URLSearchParams({
    folder: filters.folder,
    answer: filters.answer,
    priority: filters.priority,
    page: String(filters.page),
    per_page: String(filters.perPage),
  });
  if (filters.search.trim()) query.set("search", filters.search.trim());
  if (filters.adminId !== undefined) query.set("admin_id", String(filters.adminId));
  return query.toString();
}

export function listMessages(filters: MessageFilters) {
  return staffRequest<{ data: { items: StaffMessage[]; counts: { inbox: number; archive: number } }; meta: { pagination: MessagePagination }; message: string }>(`/message_center?${queryString(filters)}`);
}

export function getMessage(id: number) {
  return staffRequest<{ data: { message: StaffMessage; staff: MessageStaffOption[] }; message: string }>(`/message_center/${id}`);
}

export function getMessageOptions() {
  return staffRequest<{ data: { staff: MessageStaffOption[]; classifications: string[] }; message: string }>("/message_center/create");
}

export function searchMessageCustomers(search: string) {
  return staffRequest<{ data: { items: MessageCustomer[] }; message: string }>(`/message_center/customers?search=${encodeURIComponent(search)}`);
}

export function updateMessage(id: number, input: MessageUpdateInput) {
  return staffRequest<{ data: StaffMessage; message: string }>(`/message_center/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function setMessageArchived(id: number, archived: boolean) {
  return staffRequest<{ data: StaffMessage; message: string }>(`/message_center/${id}/${archived ? "archive" : "unarchive"}`, { method: "POST" });
}

export function getBrochureConversion(id: number) {
  return staffRequest<{ data: { message: StaffMessage; defaults: BrochureConversionInput; classifications: string[] }; message: string }>(`/message_center/${id}/brochure`);
}

export function convertMessageToBrochure(id: number, input: BrochureConversionInput) {
  return staffRequest<{ data: { message: StaffMessage; brochure: { id: number; href: string } }; message: string }>(`/message_center/${id}/brochure`, { method: "POST", body: JSON.stringify(input) });
}
