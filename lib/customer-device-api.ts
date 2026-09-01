import { StaffApiError, staffRequest } from "./staff-api";
import type { CustomerDeviceListPayload } from "./customer-devices";

export interface CustomerDeviceFilters {
  search?: string;
  page?: number;
  perPage?: number;
}

function listQuery(filters: CustomerDeviceFilters) {
  const query = new URLSearchParams();
  if (filters.search) query.set("search", filters.search);
  query.set("page", String(filters.page ?? 1));
  query.set("per_page", String(filters.perPage ?? 25));
  return query.toString();
}

export function listCustomerDevices(filters: CustomerDeviceFilters) {
  return staffRequest<CustomerDeviceListPayload>(`/customer-devices?${listQuery(filters)}`);
}

export function deleteCustomerDevice(id: number) {
  return staffRequest<{ data: { id: number }; message: string }>(`/customer-devices/${id}`, {
    method: "DELETE",
  });
}

export async function downloadCustomerDevices(startDate: string, endDate: string) {
  const query = new URLSearchParams({ start_date: startDate, end_date: endDate });
  let response: Response;
  try {
    response = await fetch(`/api/v1/staff/customer-devices/export-customer-devices?${query}`, {
      credentials: "include",
      headers: { accept: "text/csv, application/json" },
    });
  } catch {
    throw new StaffApiError("AUTH_UNAVAILABLE", "The export service is temporarily unavailable. Please retry.", 503);
  }

  if (!response.ok) {
    let message = "Customer devices could not be exported. Please retry.";
    try {
      const payload = (await response.json()) as { error?: { message?: string }; message?: string };
      message = payload.error?.message ?? payload.message ?? message;
    } catch {
      // Preserve the stable fallback for an upstream non-JSON response.
    }
    throw new StaffApiError(response.status === 422 ? "VALIDATION_ERROR" : "AUTH_UNAVAILABLE", message, response.status);
  }

  const disposition = response.headers.get("content-disposition") ?? "";
  const filename = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i)?.[1] ??
    `customer_devices_from_${startDate}-to-${endDate}.csv`;
  return { blob: await response.blob(), filename: decodeURIComponent(filename.replace(/^"|"$/g, "")) };
}
