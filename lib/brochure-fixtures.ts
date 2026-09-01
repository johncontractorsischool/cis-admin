import type { BrochureOptions, BrochureRecord, BrochureTemplate } from "./brochures";

export const brochureOptionsFixture: BrochureOptions = {
  admins: [
    { id: 1, name: "Alex Morgan", active: true },
    { id: 2, name: "Jordan Ellis", active: true },
    { id: 3, name: "Taylor Reed", active: true },
    { id: 8, name: "Sam Patel", active: false },
  ],
  ad_sources: ["Google", "Yahoo", "Bing", "Link from a website", "Word of mouth", "Other"],
  classifications: [
    { id: 43, name: "A | General Engineering Contractor" },
    { id: 44, name: "B | General Building Contractor" },
    { id: 59, name: "C-10 | Electrical Contractor" },
    { id: 75, name: "C-36 | Plumbing Contractor" },
  ],
  statuses: ["active", "archived", "all"],
  types: ["new", "today", "all"],
};

export const brochureFixtures: BrochureRecord[] = [
  { id: 8812, first_name: "Riley", last_name: "Garcia", full_name: "Riley Garcia", address: "501 Market St", city: "San Diego", state: "CA", zip: "92101", email: "riley.garcia@example.test", phone: "+16195550155", phone_extension: "24", ad: "Google", ad_other: null, classification: "B | General Building Contractor", classification_id: 44, notes: "Interested in online and home-study options.", memo: "Call after 2 PM", do_not_mail: false, orig_date: "09/01/2026", followup_date: "09/01/2026", letter_date: null, admin: "Jordan Ellis", admin_id: 2, is_active: true, created_by_admin: true, receive_sms: true, referral: "brochure_create_page", language: "en" },
  { id: 8811, first_name: "Casey", last_name: "Nguyen", full_name: "Casey Nguyen", address: "80 Fulton Ave", city: "Fresno", state: "CA", zip: "93721", email: "casey.nguyen@example.test", phone: "+15595550112", phone_extension: null, ad: "Word of mouth", ad_other: null, classification: "C-10 | Electrical Contractor", classification_id: 59, notes: "Requested Spanish follow-up.", memo: "Hot lead", do_not_mail: false, orig_date: "08/31/2026", followup_date: "09/01/2026", letter_date: "08/31/2026", admin: "Taylor Reed", admin_id: 3, is_active: true, created_by_admin: false, receive_sms: true, referral: "website", language: "es" },
  { id: 8810, first_name: "Devon", last_name: "Brooks", full_name: "Devon Brooks", address: "400 Pine St", city: "Sacramento", state: "CA", zip: "95814", email: "devon.brooks@example.test", phone: "+19165550170", phone_extension: null, ad: "Other", ad_other: "Trade show", classification: "A | General Engineering Contractor", classification_id: 43, notes: null, memo: "Brochure mailed", do_not_mail: false, orig_date: "08/29/2026", followup_date: "09/05/2026", letter_date: "08/30/2026", admin: "Alex Morgan", admin_id: 1, is_active: false, created_by_admin: true, receive_sms: false, referral: "brochure_create_page", language: "en" },
];

export const brochureTemplateFixtures: BrochureTemplate[] = [
  { id: 51, admin_id: 1, title: "Brochure follow-up", subject: "Your {classification} license information", content: "Hi {firstname},\n\nI’m following up on the brochure you requested. Let me know how I can help.", status: true, created_at: "2026-08-20T16:00:00Z", updated_at: "2026-08-20T16:00:00Z" },
  { id: 52, admin_id: 1, title: "Second follow-up", subject: "Any questions, {firstname}?", content: "Hi {firstname},\n\nDo you have any questions about getting started?", status: false, created_at: "2026-08-21T16:00:00Z", updated_at: "2026-08-21T16:00:00Z" },
];
