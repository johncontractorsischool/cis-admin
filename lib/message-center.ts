export interface MessageCustomer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  href: string;
}

export interface MessageStaffOption {
  id: number;
  name: string;
}

export interface StaffMessage {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  phone_extension: string | null;
  subject: string | null;
  body: string | null;
  received_at: string | null;
  answered: boolean;
  priority: "Urgent" | "Normal";
  archived: boolean;
  webhook_lead: boolean;
  receive_sms: boolean;
  assignment: MessageStaffOption | null;
  customer: MessageCustomer | null;
  brochure: { id: number; name: string; href: string } | null;
  brochure_converted_at: string | null;
}

export interface MessagePagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface MessageFilters {
  folder: "inbox" | "archive" | "all";
  search: string;
  answer: "all" | "answered" | "unanswered";
  priority: "all" | "Urgent" | "Normal";
  adminId?: number;
  page: number;
  perPage: number;
}

export interface MessageUpdateInput {
  full_name: string;
  email: string;
  phone_number: string;
  phone_number_extension: string;
  message: string;
  answer: "answered" | "unanswered";
  priority: "Urgent" | "Normal";
  admin_id: number | null;
  customer_id: number | null;
  receive_sms: boolean;
}

export interface BrochureConversionInput {
  first_name: string;
  last_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  email: string;
  phone: string;
  phone_extension: string;
  classification: string;
  ad: string;
  notes: string;
  receive_sms: boolean;
}
