import { staffRequest } from "./staff-api";
import type {
  StudentDetailPayload,
  StudentInput,
  StudentListPayload,
  StudentSummary,
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
  return staffRequest<StudentDetailPayload>(`/students/${id}`);
}

export function createStudent(input: StudentInput & { password?: string }) {
  return staffRequest<{ data: StudentSummary; message: string }>("/students", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateStudent(id: number, input: StudentInput) {
  return staffRequest<{ data: StudentSummary; message: string }>(`/students/${id}`, {
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

export function sendStudentEmail(id: number, subject: string, content: string) {
  return staffRequest<{ data: { student_id: number }; message: string }>(`/students/${id}/send_email`, {
    method: "POST",
    body: JSON.stringify({ email_subject: subject, email_content: content }),
  });
}
