import { staffRequest } from "./staff-api";
import type { BrochureEmailHistory, BrochureInput, BrochureOptions, BrochurePagination, BrochureRecord, BrochureTemplate, BrochureTemplateInput } from "./brochures";

export interface BrochureFilters {
  type?: "new" | "today" | "all";
  status?: "active" | "archived" | "all";
  search?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  followupDate?: string;
  letterDate?: string;
  adminId?: number;
  page?: number;
  perPage?: number;
}

function brochureQuery(filters: BrochureFilters) {
  const query = new URLSearchParams();
  if (filters.type) query.set("type", filters.type);
  if (filters.status) query.set("status", filters.status);
  if (filters.search) query.set("search", filters.search);
  if (filters.firstName) query.set("First_Name", filters.firstName);
  if (filters.lastName) query.set("Last_Name", filters.lastName);
  if (filters.phone) query.set("Phone", filters.phone);
  if (filters.email) query.set("Email", filters.email);
  if (filters.followupDate) query.set("followup_date", filters.followupDate);
  if (filters.letterDate) query.set("letter_date", filters.letterDate);
  if (filters.adminId) query.set("admin_id", String(filters.adminId));
  query.set("page", String(filters.page ?? 1));
  query.set("per_page", String(filters.perPage ?? 25));
  return query;
}

export function listBrochures(filters: BrochureFilters) {
  return staffRequest<{ data: { items: BrochureRecord[] }; meta: { pagination: BrochurePagination }; message: string }>(`/brochures?${brochureQuery(filters)}`);
}
export function getBrochureOptions() { return staffRequest<{ data: BrochureOptions; message: string }>("/brochures/create"); }
export function getBrochure(id: number) { return staffRequest<{ data: { brochure: BrochureRecord; options: BrochureOptions }; message: string }>(`/brochures/${id}/edit`); }
export function createBrochure(input: BrochureInput) { return staffRequest<{ data: BrochureRecord; message: string }>("/brochures", { method: "POST", body: JSON.stringify(input) }); }
export function updateBrochure(id: number, input: BrochureInput) { return staffRequest<{ data: BrochureRecord; message: string }>(`/brochures/${id}`, { method: "PATCH", body: JSON.stringify(input) }); }
export function toggleBrochureStatus(id: number) { return staffRequest<{ data: BrochureRecord; message: string }>(`/brochures/${id}/status`, { method: "PUT" }); }
export function moveBrochureCallbacks(selected: number[], followupDate: string, adminId: number) { return staffRequest<{ data: { updated: number }; message: string }>("/brochures/move_selected_callbacks", { method: "POST", body: JSON.stringify({ selected, Followup_date: followupDate, admin_id: adminId }) }); }

export function listBrochureTemplates(page = 1) { return staffRequest<{ data: { items: BrochureTemplate[] }; meta: { pagination: BrochurePagination }; message: string }>(`/brochure_email_templates?page=${page}&per_page=25`); }
export function createBrochureTemplate(input: BrochureTemplateInput) { return staffRequest<{ data: BrochureTemplate; message: string }>("/brochure_email_templates", { method: "POST", body: JSON.stringify(input) }); }
export function updateBrochureTemplate(id: number, input: BrochureTemplateInput) { return staffRequest<{ data: BrochureTemplate; message: string }>(`/brochure_email_templates/${id}`, { method: "PATCH", body: JSON.stringify(input) }); }
export function deleteBrochureTemplate(id: number) { return staffRequest<{ data: null; message: string }>(`/brochure_email_templates/${id}`, { method: "DELETE" }); }
export function testBrochureTemplate(id: number, email: string) { return staffRequest<{ data: { email: string; template_id: number }; message: string }>(`/brochure_email_template/${id}/test_email`, { method: "POST", body: JSON.stringify({ email }) }); }
export function resolveBrochureTemplate(templateId: number, brochureId: number) { return staffRequest<{ data: BrochureTemplate; message: string }>(`/brochure_email_template/${templateId}/${brochureId}`); }
export function sendBrochureEmail(brochureId: number, input: { email_template_id?: number; email_subject: string; email_content: string }) { return staffRequest<{ data: { history_id: number }; message: string }>(`/brochures/${brochureId}/send_email`, { method: "POST", body: JSON.stringify(input) }); }
export function getBrochureEmailHistory(brochureId: number) { return staffRequest<{ data: { items: BrochureEmailHistory[] }; message: string }>(`/brochure/email_history/${brochureId}`); }

export function brochureExportUrl(filters: BrochureFilters) { return `/api/v1/staff/brochures/export?${brochureQuery({ ...filters, page: undefined, perPage: undefined })}`; }
