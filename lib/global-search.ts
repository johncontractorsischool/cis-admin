export type GlobalSearchType = "student" | "order" | "brochure" | "application";

export interface GlobalSearchResult {
  key: string;
  type: GlobalSearchType;
  record_id: string;
  title: string;
  subtitle: string;
  identifier: string;
  href: string;
}

export interface GlobalSearchGroups {
  students: GlobalSearchResult[];
  orders: GlobalSearchResult[];
  brochures: GlobalSearchResult[];
  applications: GlobalSearchResult[];
}

export interface GlobalSearchPayload {
  data: {
    query: string;
    groups: GlobalSearchGroups;
    total: number;
  };
  message: string;
}

export interface OrderSearchRecord {
  id: number;
  order_number: string;
  customer_name: string;
  email: string;
  phone: string;
  company: string;
  sku: string;
  classification: string;
  salesperson: string;
  order_date: string;
  ship_date: string;
  tracking_number: string;
  shipping_type: string;
  subtotal: string | number | null;
  shipping_price: string | number | null;
  sales_tax: string | number | null;
  grand_total: string | number | null;
  item_description: string;
  instructions: string;
  shipped: boolean;
}

export interface ApplicationSearchRecord {
  id: number;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  application_number: string;
  source_student_id: string;
  app_fee_number: string;
  packet_type: string;
  status: string;
  stage: string;
  law_exam_scheduled_at: string | null;
  trade_exam_scheduled_at: string | null;
  license_number: string;
  source_updated_at: string | null;
  synced_at: string | null;
}
