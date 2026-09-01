export type CustomerDeviceValue = string | number | null;

export interface CustomerDevice {
  id: number;
  customer_id: number;
  email: string | null;
  device_type: string | null;
  fingerprint: string | null;
  ip_address: string | null;
  location: string | null;
  user_agent: string | null;
  created_at: string | null;
  updated_at?: string | null;
}
export interface CustomerDevicePagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface CustomerDeviceListPayload {
  data: { items: CustomerDevice[] };
  meta: { pagination: CustomerDevicePagination };
  message: string;
}
