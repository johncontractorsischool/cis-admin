import type {
  OtpChallenge,
  StaffAuthErrorCode,
  StaffPrincipal,
} from "./staff";

export type PersonaKey =
  | "superadmin"
  | "staff-standard"
  | "staff-shipping"
  | "translator"
  | "instructor"
  | "staff-restricted";

export interface FixtureScenario {
  label: string;
  username: string;
}

export const fixtureScenarios: FixtureScenario[] = [
  { label: "Approved IP", username: "approved" },
  { label: "Offsite + OTP", username: "offsite" },
  { label: "Invalid login", username: "denied" },
  { label: "Blocked account", username: "blocked" },
  { label: "Offsite disabled", username: "offsite-disabled" },
  { label: "Service failure", username: "service" },
];

export const fixturePersonaOptions: Array<{
  key: PersonaKey;
  label: string;
}> = [
  { key: "superadmin", label: "Superadmin" },
  { key: "staff-standard", label: "Standard staff" },
  { key: "staff-shipping", label: "Shipping staff" },
  { key: "translator", label: "Translator" },
  { key: "instructor", label: "Instructor" },
  { key: "staff-restricted", label: "Restricted staff" },
];

const capabilitySets: Record<PersonaKey, string[]> = {
  superadmin: [
    "staff.access",
    "dashboard.view",
    "students.view",
    "students.create",
    "customer-devices.view",
    "customer-devices.delete",
    "orders.view",
    "new-orders.view",
    "messages.view",
    "brochures.manage",
    "shipping.access",
    "shipping.export",
    "instruction.access",
    "content.manage",
    "reports.view",
    "reports.revenue.view",
    "settings.manage",
    "admin-users.manage",
  ],
  "staff-standard": [
    "staff.access",
    "dashboard.view",
    "students.view",
    "students.create",
    "customer-devices.view",
    "orders.view",
    "new-orders.view",
    "messages.view",
    "brochures.manage",
  ],
  "staff-shipping": [
    "staff.access",
    "dashboard.view",
    "students.view",
    "orders.view",
    "new-orders.view",
    "messages.view",
    "shipping.access",
    "shipping.export",
  ],
  translator: ["staff.access", "dashboard.view", "content.translate"],
  instructor: [
    "staff.access",
    "dashboard.view",
    "students.view",
    "instruction.access",
    "content.manage",
  ],
  "staff-restricted": ["staff.access", "dashboard.view"],
};

const personaNames: Record<PersonaKey, [string, string]> = {
  superadmin: ["Alex Morgan", "Superadmin"],
  "staff-standard": ["Jordan Ellis", "Staff member"],
  "staff-shipping": ["Taylor Reed", "Shipping staff"],
  translator: ["Cameron Vega", "Translator"],
  instructor: ["Riley Brooks", "Instructor"],
  "staff-restricted": ["Casey Lane", "Restricted staff"],
};

export function isFixtureAuthEnabled(): boolean {
  return __STAFF_FIXTURE_AUTH__;
}

export function isPersonaKey(value: string): value is PersonaKey {
  return Object.prototype.hasOwnProperty.call(capabilitySets, value);
}

export function createFixturePrincipal(persona: PersonaKey): StaffPrincipal {
  const [name, staffType] = personaNames[persona];
  return {
    id: Object.keys(capabilitySets).indexOf(persona) + 1,
    username: persona,
    name,
    email: `${persona}@example.test`,
    staffType,
    capabilities: capabilitySets[persona],
    navigationBadges: {
      questionFeedback: persona === "instructor" ? 8 : 3,
      newSurveys: persona === "instructor" ? 5 : 1,
    },
  };
}

export function fixtureChallenge(): OtpChallenge {
  const now = Date.now();
  return {
    id: "fixture-offsite-challenge",
    maskedDestination: "o••••••@example.test",
    expiresAt: new Date(now + 10 * 60 * 1000).toISOString(),
    resendAt: new Date(now + 3 * 60 * 1000).toISOString(),
    attemptsRemaining: 3,
  };
}

export function fixtureLoginError(username: string): {
  status: number;
  code: StaffAuthErrorCode;
  message: string;
} | null {
  switch (username) {
    case "denied":
      return {
        status: 401,
        code: "INVALID_CREDENTIALS",
        message: "We couldn’t verify those sign-in details. Check them and try again.",
      };
    case "blocked":
      return {
        status: 403,
        code: "ACCOUNT_INACTIVE",
        message: "This staff account is inactive. Contact an administrator for help.",
      };
    case "offsite-disabled":
      return {
        status: 403,
        code: "OFFSITE_DISABLED",
        message: "This account can’t sign in outside an approved office location.",
      };
    case "service":
      return {
        status: 503,
        code: "AUTH_UNAVAILABLE",
        message: "The sign-in service is temporarily unavailable. Please retry.",
      };
    default:
      return null;
  }
}
