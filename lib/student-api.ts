import { staffRequest, staffResponse } from "./staff-api";
import type {
  StudentDetailPayload,
  StudentInput,
  StudentListPayload,
  StudentSummary,
  StudentAccessKind,
  StudentAccessOptions,
  StudentRecordValue,
  StudentSyncResults,
  StudentDocument,
  StudentEmailRecord,
} from "./students";

export interface StudentFilters {
  search?: string;
  accountType?: string;
  accountStatus?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  perPage?: number;
}

function queryString(filters: StudentFilters) {
  const query = new URLSearchParams();
  if (filters.search) query.set("search", filters.search);
  if (filters.accountType) query.set("account_type", filters.accountType);
  if (filters.accountStatus) query.set("account_status", filters.accountStatus);
  if (filters.startDate) query.set("start_date", filters.startDate);
  if (filters.endDate) query.set("end_date", filters.endDate);
  query.set("page", String(filters.page ?? 1));
  query.set("per_page", String(filters.perPage ?? 25));
  return query.toString();
}

export function listStudents(filters: StudentFilters) {
  return staffRequest<StudentListPayload>(`/students?${queryString(filters)}`);
}

export function getStudent(id: number) {
  return staffRequest<StudentDetailPayload>(`/students/${id}`).then((response) => ({
    ...response,
    data: {
      ...response.data,
      documents: response.data.documents ?? [],
      online_courses: response.data.online_courses ?? [],
      live_classes: response.data.live_classes ?? [],
      class_managements: response.data.class_managements ?? [],
      subscribed_tests: response.data.subscribed_tests ?? [],
      notes: response.data.notes ?? [],
      corporation: response.data.corporation ?? null,
    },
  }));
}

export function studentProfileOptions() {
  return staffRequest<{ data: { classifications: Array<{ id: number; label: string }>; first_times: Array<{ id: number; label: string }> } }>("/students/create");
}

export function createStudent(input: StudentInput & { password?: string }) {
  return staffRequest<{ data: StudentSummary; message: string }>("/students", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateStudent(id: number, input: StudentInput) {
  return staffRequest<{ data: StudentSummary; message: string; meta?: { synchronization?: StudentSyncResults } }>(`/students/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function toggleStudent(id: number) {
  return staffRequest<{ data: StudentSummary; message: string }>(`/students/enable_disable/${id}`, { method: "POST" });
}

export function copyStudentToPbia(id: number) {
  return staffRequest<{ data: { student_id: number; status: string }; message: string }>(`/students/copy-customer-pbia/${id}`, { method: "POST" });
}

export function updateStudentPassword(id: number, newPassword: string) {
  return staffRequest<{ data: { id: number }; message: string }>(`/students/update-password/${id}`, {
    method: "POST",
    body: JSON.stringify({ new_password: newPassword }),
  });
}

export function sendStudentEmail(id: number, subject: string, content: string, idempotencyKey: string, templateId?: number) {
  return staffRequest<{ data: { history_id: number; delivery_status: string }; message: string }>(`/students/${id}/send_email`, {
    method: "POST",
    body: JSON.stringify({ email_subject: subject, email_content: content, idempotency_key: idempotencyKey, email_template_id: templateId }),
  });
}

export function studentAccessOptions(id: number) {
  return staffRequest<{ data: StudentAccessOptions }>(`/students/${id}/access-options`);
}
export function saveStudentAccess(id: number, kind: StudentAccessKind, values: Record<string, StudentRecordValue>, record?: number) {
  return staffRequest<{ data: Record<string, StudentRecordValue>; message: string }>(`/students/${id}/access/${kind}${record ? `/${record}` : ""}`, { method: record ? "PATCH" : "POST", body: JSON.stringify(values) });
}
export function removeStudentAccess(id: number, kind: StudentAccessKind, record: number) {
  return staffRequest<{ message: string }>(`/students/${id}/access/${kind}/${record}`, { method: "DELETE" });
}
export function addStudentNote(id: number, notes: string) {
  return staffRequest<{ message: string }>(`/students/${id}/notes`, { method: "POST", body: JSON.stringify({ notes }) });
}
export function uploadStudentDocument(id: number, file: File, description: string) {
  const body = new FormData(); body.set("file", file); body.set("description", description);
  return staffRequest<{ data: StudentDocument; message: string }>(`/students/${id}/documents`, { method: "POST", body });
}
export async function downloadStudentDocument(id: number, document: StudentDocument) {
  const response = await staffResponse(`/students/${id}/documents/${document.kind}/${document.id}`);
  return response.blob();
}
export function removeStudentDocument(id: number, document: StudentDocument) {
  return staffRequest<{ message: string }>(`/students/${id}/documents/${document.kind}/${document.id}`, { method: "DELETE" });
}
export function studentEmailHistory(id: number) {
  return staffRequest<{ data: { items: StudentEmailRecord[] } }>(`/students/email_history/${id}`);
}
export function studentEmailTemplates(id: number) {
  return staffRequest<{ data: { items: Array<{ id: number; title: string }> } }>(`/students/${id}/email-templates`);
}
export function studentEmailTemplate(id: number, template: number) {
  return staffRequest<{ data: { subject: string; content: string } }>(`/student_brochure_email_template/${template}/${id}`);
}
export function synchronizeStudent(id: number) {
  return staffRequest<{ data: StudentSyncResults; message: string }>(`/students/${id}/synchronize`, { method: "POST" });
}
export function saveStudentPrescreen(id: number, hasLicense: "yes" | "no") {
  return staffRequest<{ data: StudentSummary; meta: { synchronization: StudentSyncResults }; message: string }>(`/students/${id}/iapplication-prescreen`, { method: "POST", body: JSON.stringify({ has_license: hasLicense }) });
}
