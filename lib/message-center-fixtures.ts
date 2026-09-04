import type { MessageCustomer, MessageStaffOption, StaffMessage } from "./message-center";

export const messageStaffFixtures: MessageStaffOption[] = [
  { id: 1, name: "Alex Morgan" },
  { id: 2, name: "Jordan Lee" },
  { id: 3, name: "Casey Patel" },
];

export const messageCustomerFixtures: MessageCustomer[] = [
  { id: 48219, name: "Jamie Rivera", email: "jamie.rivera@example.test", phone: "(916) 555-0142", href: "/staff/students/48219" },
  { id: 48218, name: "Riley Garcia", email: "riley.garcia@example.test", phone: "(805) 555-0187", href: "/staff/students/48218" },
  { id: 48217, name: "Taylor Kim", email: "taylor.kim@example.test", phone: "(310) 555-0166", href: "/staff/students/48217" },
];

export const initialMessageFixtures: StaffMessage[] = [
  {
    id: 9412, full_name: "Jamie Rivera", email: "jamie.rivera@example.test", phone: "(916) 555-0142", phone_extension: null,
    subject: "B General Building course", body: "I am ready to enroll but would like a brochure with the weekend schedule and financing information.", received_at: "09/04/2026 8:42 AM",
    answered: false, priority: "Urgent", archived: false, webhook_lead: true, receive_sms: true, assignment: null,
    customer: messageCustomerFixtures[0], brochure: null, brochure_converted_at: null,
  },
  {
    id: 9411, full_name: "Morgan Chen", email: "morgan.chen@example.test", phone: "(415) 555-0188", phone_extension: "24",
    subject: "Law course question", body: "Can someone confirm whether the next online law class includes live instructor sessions?", received_at: "09/04/2026 8:10 AM",
    answered: false, priority: "Normal", archived: false, webhook_lead: false, receive_sms: false, assignment: messageStaffFixtures[1],
    customer: null, brochure: null, brochure_converted_at: null,
  },
  {
    id: 9409, full_name: "Riley Garcia", email: "riley.garcia@example.test", phone: "(805) 555-0187", phone_extension: null,
    subject: "Brochure follow-up", body: "Thank you for sending the materials. I have everything I need.", received_at: "09/03/2026 3:25 PM",
    answered: true, priority: "Normal", archived: true, webhook_lead: false, receive_sms: true, assignment: messageStaffFixtures[0],
    customer: messageCustomerFixtures[1], brochure: { id: 8812, name: "Riley Garcia", href: "/staff/brochures/8812" }, brochure_converted_at: "2026-09-03T22:28:00Z",
  },
];
