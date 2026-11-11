// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
const sql = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
async function fixture() {
  const database = new PGlite();
  await database.exec(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
 CREATE ROLE service_role NOLOGIN BYPASSRLS; CREATE ROLE authenticator NOLOGIN NOINHERIT;
 GRANT USAGE ON SCHEMA public TO anon,authenticated;`);
  await database.exec(sql("drizzle/migrations/0000_migration.sql"));
  return database;
}
it.each([
  ["name", " ", "quote_name_check"],
  ["phone", "------", "quote_phone_check"],
  ["email", "not-an-email", "quote_optional_check"],
  ["customer_type", "root", "quote_customer_check"],
  ["product", "invented", "quote_product_check"],
  ["city", "x".repeat(101), "quote_optional_check"],
  ["quantity", "x".repeat(101), "quote_optional_check"],
  ["message", "x".repeat(1001), "quote_optional_check"],
])(
  "002 rejects legacy invalid %s, rolls back validation flags and preserves the row",
  async (field, value, constraint) => {
    const database = await fixture();
    try {
      const data: Record<string, string> = {
        name: "Legacy fixture",
        phone: "1234567890",
        email: "",
        customer_type: "farmer",
        product: "PVC Pipes",
        city: "",
        quantity: "",
        message: "",
        [field!]: value!,
      };
      await database.query(
        "INSERT INTO public.quote_requests(name,phone,email,customer_type,product,city,quantity,message) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
        [
          data["name"],
          data["phone"],
          data["email"],
          data["customer_type"],
          data["product"],
          data["city"],
          data["quantity"],
          data["message"],
        ],
      );
      const before = await database.query("SELECT * FROM public.quote_requests");
      await database.exec(sql("security/001_quote_hardening.sql"));
      await expect(database.exec(sql("security/002_validate_constraints.sql"))).rejects.toThrow(
        constraint,
      );
      await database.exec("ROLLBACK");
      const flags = await database.query<{ convalidated: boolean }>(
        "SELECT convalidated FROM pg_constraint WHERE conrelid='public.quote_requests'::regclass AND contype='c'",
      );
      expect(flags.rows).toHaveLength(5);
      expect(flags.rows.every((r) => !r.convalidated)).toBe(true);
      expect((await database.query("SELECT * FROM public.quote_requests")).rows).toEqual(
        before.rows,
      );
    } finally {
      await database.close();
    }
  },
  30000,
);
it("004 rolls back its new column/default on an index-name conflict without changing existing data", async () => {
  const database = await fixture();
  try {
    await database.exec(
      "INSERT INTO public.quote_requests(name,phone,product) VALUES('Retained fixture','1234567890','PVC Pipes')",
    );
    const before = await database.query("SELECT * FROM public.quote_requests");
    await database.exec(sql("security/001_quote_hardening.sql"));
    await database.exec("CREATE INDEX quote_request_id_unique ON public.quote_requests(id)");
    await expect(database.exec(sql("security/004_submission_idempotency.sql"))).rejects.toThrow(
      "already exists",
    );
    await database.exec("ROLLBACK");
    const columns = await database.query(
      "SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quote_requests' AND column_name='request_id'",
    );
    expect(columns.rows).toHaveLength(0);
    expect((await database.query("SELECT * FROM public.quote_requests")).rows).toEqual(before.rows);
    const rls = await database.query(
      "SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid='public.quote_requests'::regclass",
    );
    expect(rls.rows[0]).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
  } finally {
    await database.close();
  }
}, 30000);
