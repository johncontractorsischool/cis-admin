export type StudentRecordValue = string | number | boolean | null;

export interface StudentSummary {
  customerid: number;
  name: string;
  lname: string | null;
  email: string;
  mobilenum: string | null;
  Classification: string | null;
  account_type: number | string | null;
  account_status: number | string | null;
  disabled: boolean | number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  firsttime: number | string | null;
  orderdate: string | null;
  extension_date: string | null;
  re_enrollment_date: string | null;
  Notes: string | null;
  test_date_law: string | null;
  test_date_trade: string | null;
  new_test_date: string | null;
  created_at: string | null;
}

export interface StudentDetail extends StudentSummary {
  previous_email: string | null;
  mobilenum_extension: string | null;
  company_name: string | null;
  fee_license: string | null;
  application_date: string | null;
  app_review_expiration_date: string | null;
  es_access: number | string | null;
  iapp_access: number | string | null;
  prescreen_choice: string | null;
  apps_account_created: boolean | number | null;
  documents: Array<Record<string, StudentRecordValue>>;
  online_courses: Array<Record<string, StudentRecordValue>>;
  live_classes: Array<Record<string, StudentRecordValue>>;
  class_managements: Array<Record<string, StudentRecordValue>>;
  subscribed_tests: Array<Record<string, StudentRecordValue>>;
  notes: Array<Record<string, StudentRecordValue>>;
  corporation: Record<string, StudentRecordValue> | null;
}

export interface StudentPagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface StudentListPayload {
  data: { items: StudentSummary[] };
  meta: { pagination: StudentPagination };
  message: string;
}

export interface StudentDetailPayload {
  data: StudentDetail;
  meta: Record<string, unknown>;
  message: string;
}

export type StudentInput = Partial<
  Pick<
    StudentDetail,
    | "name"
    | "lname"
    | "email"
    | "previous_email"
    | "mobilenum"
    | "mobilenum_extension"
    | "Classification"
    | "company_name"
    | "fee_license"
    | "account_type"
    | "account_status"
    | "address"
    | "city"
    | "state"
    | "zip"
    | "firsttime"
    | "extension_date"
    | "re_enrollment_date"
    | "application_date"
    | "app_review_expiration_date"
    | "Notes"
    | "test_date_law"
    | "test_date_trade"
    | "new_test_date"
    | "es_access"
    | "iapp_access"
  >
>;
