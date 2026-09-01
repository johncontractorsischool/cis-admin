interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

declare const __STAFF_FIXTURE_AUTH__: boolean;

// Cloudflare supplies the concrete D1 interface at runtime. The database layer
// remains opt-in and schema-free in this project.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type D1Database = any;

declare module "cloudflare:workers" {
  export const env: { DB?: D1Database };
}
