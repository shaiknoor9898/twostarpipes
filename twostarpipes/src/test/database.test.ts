// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, afterAll, expect, it } from "vitest";
const sql = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
const admin = "11111111-1111-4111-8111-111111111111",
  user = "22222222-2222-4222-8222-222222222222";
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS; CREATE ROLE authenticator NOLOGIN NOINHERIT;
 GRANT anon,authenticated,service_role TO authenticator;
 GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
 CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
 INSERT INTO auth.users VALUES('${admin}'),('${user}');
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE SQL STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 GRANT USAGE ON SCHEMA auth TO anon,authenticated;
 CREATE SCHEMA storage;
 CREATE TABLE storage.buckets(id text PRIMARY KEY,name text NOT NULL,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text,owner uuid);
 ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 GRANT USAGE ON SCHEMA storage TO anon,authenticated;
 GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO anon,authenticated;`);
  await db.exec(sql("drizzle/migrations/0000_migration.sql"));
}, 30000);
afterAll(async () => {
  await db?.close();
});
it("executes quotation hardening and all rollback-only constraints/RLS assertions", async () => {
  await db.exec(sql("security/001_quote_hardening.sql"));
  await db.exec(sql("security/quote-rls-check.sql"));
  await db.exec(sql("security/002_validate_constraints.sql"));
  const result = await db.query<{ count: string }>("SELECT count(*) FROM public.quote_requests");
  expect(result.rows[0]!.count).toBe(0);
}, 30000);
it("executes admin/catalogue/notification drafts and rejects nonadmin access", async () => {
  await db.exec(sql("security/003_admin_catalogue_notifications.sql"));
  await db.exec(sql("security/004_submission_idempotency.sql"));
  await db.exec(
    sql("security/admin-rls-check.sql")
      .replaceAll(":'admin_uuid'", `'${admin}'`)
      .replaceAll(":'user_uuid'", `'${user}'`),
  );
  await db.exec(sql("security/idempotency-check.sql"));
  const result = await db.query<{ count: number }>("SELECT count(*) FROM public.admin_members");
  expect(result.rows[0]!.count).toBe(0);
}, 30000);
it("enforces catalogue publication, immutable slugs, audit and restricted uploads", async () => {
  await db.exec(`BEGIN; INSERT INTO public.admin_members(user_id) VALUES('${admin}'); SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${admin}',true);
 INSERT INTO public.products(slug,name,category,short,description,image,published) VALUES('fixture','Fixture','Pipes','Fixture short','Fixture description','builtin:pvc',false);
 INSERT INTO storage.objects(bucket_id,name) VALUES('product-assets','image/fixture.png');`);
  await db.exec("SAVEPOINT immutable_slug");
  await expect(
    db.exec("UPDATE public.products SET slug='changed' WHERE slug='fixture'"),
  ).rejects.toThrow("immutable");
  await db.exec("ROLLBACK TO SAVEPOINT immutable_slug");
  const audit = await db.query<{ count: number }>(
    "SELECT count(*) FROM public.admin_audit WHERE entity_type='products'",
  );
  expect(audit.rows[0]!.count).toBe(1);
  await db.exec(`SELECT set_config('request.jwt.claim.sub','${user}',true);`);
  await db.exec("SAVEPOINT denied_upload");
  await expect(
    db.exec(
      "INSERT INTO storage.objects(bucket_id,name) VALUES('product-assets','image/forbidden.png')",
    ),
  ).rejects.toMatchObject({ code: "42501" });
  await db.exec("ROLLBACK TO SAVEPOINT denied_upload");
  const hidden = await db.query("SELECT * FROM public.products");
  expect(hidden.rows).toHaveLength(0);
  await db.exec("ROLLBACK;");
}, 30000);
it("queues once per enquiry, leases jobs to one worker and deduplicates reminders", async () => {
  await db.exec(`BEGIN; UPDATE public.notification_settings SET enabled=true,recipients=ARRAY['fixture@example.com'];
 SET LOCAL ROLE quote_writer;
 INSERT INTO public.quote_requests(request_id,name,phone,product) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Queue fixture','1234567890','PVC Pipes');
 RESET ROLE;
 UPDATE public.quote_requests SET follow_up_at=now()-interval '1 minute';
 SET LOCAL ROLE notification_worker;`);
  const first = await db.query<{ batch: { jobs: unknown[] } }>(
    "SELECT public.claim_notification_jobs('sales@example.com','https://example.com') AS batch",
  );
  expect(first.rows[0]!.batch.jobs).toHaveLength(2);
  const second = await db.query<{ batch: { jobs: unknown[] } }>(
    "SELECT public.claim_notification_jobs('other@example.com','https://example.com') AS batch",
  );
  expect(second.rows[0]!.batch.jobs).toHaveLength(0);
  await db.exec("ROLLBACK;");
}, 30000);
