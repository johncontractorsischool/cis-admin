export type StaffCapability = string;

export interface StaffPrincipal {
  id: number;
  username: string;
  name: string;
  email: string;
  staffType: string | null;
  capabilities: StaffCapability[];
  navigationBadges?: {
    questionFeedback?: number;
    newSurveys?: number;
  };
}

export interface OtpChallenge {
  id: string;
  maskedDestination: string;
  expiresAt: string;
  resendAt: string;
  attemptsRemaining: number;
}

export type StaffAuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_INACTIVE"
  | "OFFSITE_DISABLED"
  | "INVALID_OTP"
  | "CHALLENGE_EXPIRED"
  | "RATE_LIMITED"
  | "SESSION_EXPIRED"
  | "AUTH_UNAVAILABLE"
  | "VALIDATION_ERROR";

export interface StaffApiErrorBody {
  error: {
    code: StaffAuthErrorCode;
    message: string;
    attemptsRemaining?: number;
  };
}

export type StaffLoginResult =
  | { status: "authenticated"; principal: StaffPrincipal }
  | { status: "otp_required"; challenge: OtpChallenge };

export interface StaffAuthenticatedResult {
  status: "authenticated";
  principal: StaffPrincipal;
}

export function can(
  principal: StaffPrincipal,
  capability: StaffCapability,
): boolean {
  return principal.capabilities.includes(capability);
}

export interface NavigationItem {
  label: string;
  glyph: string;
  capability: StaffCapability;
  badge?: "questionFeedback" | "newSurveys";
}

export interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

export const staffNavigation: NavigationGroup[] = [
  {
    label: "Workspace",
    items: [{ label: "Dashboard", glyph: "01", capability: "dashboard.view" }],
  },
  {
    label: "Customer operations",
    items: [
      { label: "Order History", glyph: "02", capability: "orders.view" },
      { label: "New Orders", glyph: "NO", capability: "new-orders.view" },
      { label: "Message Center", glyph: "03", capability: "messages.view" },
      { label: "Students", glyph: "04", capability: "students.view" },
      { label: "Customer Devices", glyph: "DV", capability: "customer-devices.view" },
      { label: "Brochures", glyph: "05", capability: "brochures.manage" },
      { label: "Shipping", glyph: "06", capability: "shipping.access" },
    ],
  },
  {
    label: "Teaching & content",
    items: [
      {
        label: "Instructors",
        glyph: "07",
        capability: "instruction.access",
        badge: "questionFeedback",
      },
      { label: "Online Courses", glyph: "08", capability: "content.manage" },
      { label: "Translations", glyph: "09", capability: "content.translate" },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Reports", glyph: "10", capability: "reports.view" },
      { label: "Settings", glyph: "12", capability: "settings.manage" },
      { label: "Admin Users", glyph: "13", capability: "admin-users.manage" },
    ],
  },
];
