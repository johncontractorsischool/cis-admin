import { staffRequest } from "./staff-api";
import type { EnrollmentAddress, EnrollmentOptions, EnrollmentOrderResult, EnrollmentPayment, EnrollmentQuote } from "./staff-enrollments";

export function getEnrollmentOptions(customerId: number) {
  return staffRequest<{ data: EnrollmentOptions; message: string }>(`/enrollments/options?customer_id=${encodeURIComponent(customerId)}`);
}

export function createEnrollmentQuote(input: {
  customer_id: number;
  sku: string;
  classification_id: number;
  shipping_method: string;
  discount: { type: string; value?: number; reason?: string };
}) {
  return staffRequest<{ data: EnrollmentQuote; message: string }>("/enrollments/quote", { method: "POST", body: JSON.stringify(input) });
}

export function createEnrollmentOrder(input: {
  quote_id: string;
  idempotency_key: string;
  payment: EnrollmentPayment;
  billing: EnrollmentAddress;
  shipping: EnrollmentAddress;
  order_instructions?: string;
}) {
  return staffRequest<{ data: EnrollmentOrderResult; message: string }>("/enrollments/orders", { method: "POST", body: JSON.stringify(input) });
}
