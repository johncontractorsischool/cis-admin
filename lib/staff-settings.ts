export interface StaffProfileSettings {
  id: number;
  username: string;
  name: string;
  last_name: string;
  email: string;
  mail_form_name: string;
  signature: string;
}

export interface OfficeLocation {
  id: number;
  address: string;
  city: string;
  state: string;
  zip: string;
  sales_tax: number | null;
  phone: string | null;
  email: string | null;
}

export interface ClassLocation {
  id: number;
  name: string;
  room: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  trade_time: string;
  law_time: string;
  max_size: number | null;
  spanish: boolean;
}

export interface ValidIp { id: number; ip: string }

export interface FirewallEntry {
  id: number;
  ip_address: string;
  mode: "allow" | "block";
  whitelisted: boolean;
  created_at: string | null;
}

export interface CheckoutVisibility {
  customer_checkout: { google_pay: boolean; apple_pay: boolean; paypal: boolean };
  staff_checkout: { card: boolean; check: boolean; cash: boolean };
}

export interface StaffSku {
  id: number;
  sku: string;
  name: string;
  staff_name: string;
  description: string;
  subtotal: string;
  sales_tax: string;
  active: boolean;
  staff_visible: boolean;
  requires_shipping: boolean;
  popular: boolean;
}

export interface EnrollmentAgreement {
  id: number;
  first_time: string;
  revision_date: string;
  body: string;
  active: boolean;
}

export interface FirstTimeOption { value: string; label: string }

export interface SettingsList<T> {
  data: { items: T[] };
  message: string;
}

