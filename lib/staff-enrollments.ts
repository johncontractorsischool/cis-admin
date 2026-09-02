export interface EnrollmentAddress {
  first_name: string;
  last_name: string;
  company: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
}

export interface EnrollmentCustomer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company: string;
  address: Omit<EnrollmentAddress, "first_name" | "last_name" | "company">;
}

export interface EnrollmentProduct { sku: string; name: string; price: string; requires_shipping: boolean; popular: boolean }
export interface EnrollmentClassification { id: number; code: string; name: string }
export interface EnrollmentShippingMethod { id: "none" | "ground" | "two_day" | "next_day"; label: string; price: string }
export interface EnrollmentPaymentMethod { id: "card" | "check" | "cash"; label: string; enabled: boolean }

export interface CardTokenizationConfig {
  enabled: boolean;
  login_id: string | null;
  client_key: string | null;
  script_url: string | null;
}

export interface EnrollmentOptions {
  customer: EnrollmentCustomer;
  products: EnrollmentProduct[];
  classifications: EnrollmentClassification[];
  shipping_methods: EnrollmentShippingMethod[];
  payment_methods: EnrollmentPaymentMethod[];
  card_tokenization: CardTokenizationConfig;
  maximum_discount_percent: number;
}

export interface EnrollmentQuote {
  id: string;
  sku: string;
  product_name: string;
  classification_id: number;
  classification: string;
  shipping_method: EnrollmentShippingMethod["id"];
  requires_shipping: boolean;
  items: Array<{ description: string; price_cents: number; price: string }>;
  amounts: { list_subtotal: string; discount: string; subtotal: string; tax: string; shipping: string; total: string; total_cents: number };
  discount: { type: "none" | "fixed" | "percent"; reason: string | null };
  expires_at: string;
}

export type EnrollmentPayment =
  | { method: "card"; opaque_data_descriptor: string; opaque_data_value: string }
  | { method: "check"; bank_name: string; check_number: string }
  | { method: "cash"; cash_acknowledged: true };

export interface EnrollmentOrderResult {
  order_id: number;
  customer_id: number;
  quote_id: string;
  sku: string;
  classification: string;
  total: string;
  payment: { method: string; transaction_id: string | null; account_type: string | null; account_last_four: string | null };
  idempotent_replay: boolean;
}
