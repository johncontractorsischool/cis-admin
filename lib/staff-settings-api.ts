import { staffRequest } from "./staff-api";
import type {
  CheckoutVisibility,
  ClassLocation,
  EnrollmentAgreement,
  FirewallEntry,
  FirstTimeOption,
  OfficeLocation,
  SettingsList,
  StaffProfileSettings,
  StaffSku,
  ValidIp,
} from "./staff-settings";

type Result<T> = { data: T; message: string };

export const getProfile = () => staffRequest<Result<StaffProfileSettings>>("/profile");
export const updateProfile = (input: Omit<StaffProfileSettings, "id" | "username">) =>
  staffRequest<Result<StaffProfileSettings>>("/profile", { method: "PATCH", body: JSON.stringify(input) });
export const updatePassword = (input: { current_password: string; new_password: string; new_password_confirmation: string }) =>
  staffRequest<Result<{ other_sessions_revoked: number }>>("/profile/password", { method: "PUT", body: JSON.stringify(input) });

export const listOffices = () => staffRequest<SettingsList<OfficeLocation>>("/office_location?per_page=100");
export const createOffice = (input: Omit<OfficeLocation, "id">) => staffRequest<Result<OfficeLocation>>("/office_location", { method: "POST", body: JSON.stringify(input) });
export const updateOffice = (id: number, input: Partial<Omit<OfficeLocation, "id">>) => staffRequest<Result<OfficeLocation>>(`/office_location/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteOffice = (id: number) => staffRequest<Result<null>>(`/office_location/${id}`, { method: "DELETE" });

export const listClassLocations = () => staffRequest<SettingsList<ClassLocation>>("/settings/class-locations?per_page=100");
export const createClassLocation = (input: Record<string, unknown>) => staffRequest<Result<ClassLocation>>("/settings/class-locations", { method: "POST", body: JSON.stringify(input) });
export const updateClassLocation = (id: number, input: Record<string, unknown>) => staffRequest<Result<ClassLocation>>(`/settings/class-locations/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteClassLocation = (id: number) => staffRequest<Result<null>>(`/settings/class-locations/${id}`, { method: "DELETE" });

export const listValidIps = () => staffRequest<SettingsList<ValidIp>>("/manage_valid_ips?per_page=100");
export const createValidIp = (ip: string) => staffRequest<Result<ValidIp>>("/manage_valid_ips", { method: "POST", body: JSON.stringify({ ip }) });
export const deleteValidIp = (id: number) => staffRequest<Result<null>>(`/manage_valid_ips/${id}`, { method: "DELETE" });

export const listFirewallEntries = () => staffRequest<{ data: { items: FirewallEntry[]; current_ip: string }; message: string }>("/settings/firewall?per_page=100");
export const createFirewallEntry = (ip_address: string, whitelisted: boolean) => staffRequest<Result<FirewallEntry>>("/settings/firewall", { method: "POST", body: JSON.stringify({ ip_address, whitelisted }) });
export const updateFirewallEntry = (id: number, input: { whitelisted: boolean }) => staffRequest<Result<FirewallEntry>>(`/settings/firewall/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteFirewallEntry = (id: number) => staffRequest<Result<null>>(`/settings/firewall/${id}`, { method: "DELETE" });

export const getCheckoutVisibility = () => staffRequest<Result<CheckoutVisibility>>("/settings/checkout-payment-methods");
export const updateCheckoutVisibility = (value: CheckoutVisibility) => staffRequest<Result<CheckoutVisibility>>("/settings/checkout-payment-methods", {
  method: "PUT",
  body: JSON.stringify({
    google_pay: value.customer_checkout.google_pay,
    apple_pay: value.customer_checkout.apple_pay,
    paypal: value.customer_checkout.paypal,
    staff_card: value.staff_checkout.card,
    staff_check: value.staff_checkout.check,
    staff_cash: value.staff_checkout.cash,
  }),
});

export const listSkus = () => staffRequest<SettingsList<StaffSku>>("/settings/skus?status=all&per_page=100");
export const createSku = (input: Omit<StaffSku, "id">) => staffRequest<Result<StaffSku>>("/settings/skus", { method: "POST", body: JSON.stringify(input) });
export const updateSku = (id: number, input: Partial<Omit<StaffSku, "id" | "sku">>) => staffRequest<Result<StaffSku>>(`/settings/skus/${id}`, { method: "PATCH", body: JSON.stringify(input) });

export const listAgreements = () => staffRequest<{ data: { items: EnrollmentAgreement[]; first_time_options: FirstTimeOption[] }; message: string }>("/settings/enrollment-agreements?per_page=100");
export const createAgreement = (input: Omit<EnrollmentAgreement, "id">) => staffRequest<Result<EnrollmentAgreement>>("/settings/enrollment-agreements", { method: "POST", body: JSON.stringify(input) });
export const updateAgreement = (id: number, input: Omit<EnrollmentAgreement, "id">) => staffRequest<Result<EnrollmentAgreement>>(`/settings/enrollment-agreements/${id}`, { method: "PATCH", body: JSON.stringify(input) });

