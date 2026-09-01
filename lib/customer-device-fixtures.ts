import type { CustomerDevice } from "./customer-devices";

export const customerDeviceFixtures: CustomerDevice[] = [
  { id: 8806, customer_id: 48221, email: "jamie.rivera@example.test", device_type: "desktop", fingerprint: "6d7f-42a1-91c8", ip_address: "192.0.2.44", location: "Sacramento, California, US", user_agent: "Chrome 128 · macOS 14", created_at: "2026-08-31T16:42:00Z", updated_at: "2026-08-31T16:42:00Z" },
  { id: 8805, customer_id: 48221, email: "jamie.rivera@example.test", device_type: "mobile", fingerprint: "c900-2e61-a106", ip_address: "192.0.2.51", location: "Sacramento, California, US", user_agent: "Mobile Safari · iOS 18", created_at: "2026-08-30T22:18:00Z", updated_at: "2026-08-30T22:18:00Z" },
  { id: 8804, customer_id: 47719, email: "morgan.lee@example.test", device_type: "tablet", fingerprint: "0f44-11b2-7a38", ip_address: "198.51.100.18", location: "Fresno, California, US", user_agent: "Chrome Mobile · Android 15", created_at: "2026-08-30T18:05:00Z", updated_at: "2026-08-30T18:05:00Z" },
  { id: 8803, customer_id: 46902, email: "avery.chen@example.test", device_type: "desktop", fingerprint: "b27a-a660-019f", ip_address: "203.0.113.9", location: "San Diego, California, US", user_agent: "Edge 128 · Windows 11", created_at: "2026-08-29T14:31:00Z", updated_at: "2026-08-29T14:31:00Z" },
  { id: 8802, customer_id: 46902, email: "avery.chen@example.test", device_type: "mobile", fingerprint: "90d3-774c-06b2", ip_address: "203.0.113.14", location: "San Diego, California, US", user_agent: "Chrome Mobile · Android 15", created_at: "2026-08-28T09:12:00Z", updated_at: "2026-08-28T09:12:00Z" },
];
