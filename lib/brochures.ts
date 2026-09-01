export type BrochureView = "new" | "followups" | "request" | "search" | "templates" | "detail";

export interface BrochureRecord {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  email: string;
  phone: string | null;
  phone_extension: string | null;
  ad: string | null;
  ad_other: string | null;
  classification: string | null;
  classification_id: number | null;
  notes: string | null;
  memo: string | null;
  do_not_mail: boolean;
  orig_date: string | null;
  followup_date: string | null;
  letter_date: string | null;
  admin: string | null;
  admin_id: number | null;
  is_active: boolean;
  created_by_admin: boolean;
  receive_sms: boolean;
  referral: string | null;
  language: "en" | "es" | null;
}

export interface BrochureAdminOption { id: number; name: string; active: boolean }
export interface BrochureClassificationOption { id: number; name: string }
export interface BrochureOptions {
  admins: BrochureAdminOption[];
  ad_sources: string[];
  classifications: BrochureClassificationOption[];
  statuses?: string[];
  types?: string[];
}
export interface BrochurePagination { current_page: number; per_page: number; total: number; last_page: number }

export interface BrochureInput {
  First_Name: string;
  Last_Name: string;
  Address?: string;
  City?: string;
  State?: string;
  Zip?: string;
  Email: string;
  Phone?: string;
  phone_extension?: string;
  Notes?: string;
  memo?: string;
  Ad?: string;
  ad_other?: string;
  Classification?: string;
  do_not_mail?: boolean;
  Orig_Date?: string;
  Followup_date?: string;
  letter_date?: string;
  admin_id?: number | null;
  language?: "en" | "es";
}

export interface BrochureTemplate {
  id: number;
  admin_id: number;
  title: string;
  subject: string;
  content: string;
  status: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface BrochureTemplateInput { title: string; subject: string; content: string; status: boolean }
export interface BrochureEmailHistory {
  id: number;
  brochure_id: number;
  admin_id: number | null;
  email_content: { content?: string; subject?: string; to_email?: string } | string | null;
  admin: { id?: number; name?: string; last_name?: string; email?: string } | string | null;
  created_at: string | null;
}
