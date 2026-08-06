export type StaffCapability = string;

export type PersonaKey =
  | "superadmin"
  | "staff-standard"
  | "staff-shipping"
  | "translator"
  | "instructor"
  | "staff-restricted";

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

const capabilitySets: Record<PersonaKey, StaffCapability[]> = {
  superadmin: [
    "staff.access",
    "dashboard.view",
    "students.view",
    "students.create",
    "orders.view",
    "messages.view",
    "brochures.manage",
    "shipping.access",
    "shipping.export",
    "instruction.access",
    "content.manage",
    "reports.view",
    "reports.revenue.view",
    "payroll.manage",
    "settings.manage",
    "admin-users.manage",
  ],
  "staff-standard": [
    "staff.access",
    "dashboard.view",
    "students.view",
    "students.create",
    "orders.view",
    "messages.view",
    "brochures.manage",
  ],
  "staff-shipping": [
    "staff.access",
    "dashboard.view",
    "students.view",
    "orders.view",
    "messages.view",
    "shipping.access",
    "shipping.export",
  ],
  translator: [
    "staff.access",
    "dashboard.view",
    "content.translate",
  ],
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

export function createPrincipal(persona: PersonaKey): StaffPrincipal {
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
      { label: "Message Center", glyph: "03", capability: "messages.view" },
      { label: "Students", glyph: "04", capability: "students.view" },
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
      { label: "Payroll", glyph: "11", capability: "payroll.manage" },
      { label: "Settings", glyph: "12", capability: "settings.manage" },
      { label: "Admin Users", glyph: "13", capability: "admin-users.manage" },
    ],
  },
];

export const personaOptions: Array<{ key: PersonaKey; label: string }> = [
  { key: "superadmin", label: "Superadmin" },
  { key: "staff-standard", label: "Standard staff" },
  { key: "staff-shipping", label: "Shipping staff" },
  { key: "translator", label: "Translator" },
  { key: "instructor", label: "Instructor" },
  { key: "staff-restricted", label: "Restricted staff" },
];
