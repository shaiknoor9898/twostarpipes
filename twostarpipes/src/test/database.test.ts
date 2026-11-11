// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, afterAll, expect, it } from "vitest";
const sql = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
// Exercise operator inspection in a database-enforced READ ONLY transaction.
// These are metadata/aggregate queries, not a claim about live Supabase state.
async function stagingChecks(database: PGlite) {
  const results: Record<string, Awaited<ReturnType<PGlite["exec"]>>> = {};
  await database.exec("BEGIN READ ONLY");
  try {
    const files = readdirSync(resolve(process.cwd(), "security/staging-checks"))
      .filter((file) => file.endsWith(".sql"))
      .sort();
    for (const file of files) {
      const result = await database.exec(sql(`security/staging-checks/${file}`));
      expect(result).toHaveLength(1);
      results[file] = result;
    }
    return results;
  } finally {
    await database.exec("ROLLBACK");
  }
}
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
 -- Synthetic fixture standing in for a bucket created via the Storage Dashboard/API.
 INSERT INTO storage.buckets VALUES('product-assets','product-assets',true,5242880,ARRAY['image/jpeg','image/png','image/webp','application/pdf']);
 CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text,owner uuid);
 ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 GRANT USAGE ON SCHEMA storage TO anon,authenticated;
 GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO anon,authenticated;`);
  await db.exec(sql("drizzle/migrations/0000_migration.sql"));
}, 30000);
afterAll(async () => {
  await db?.close();
});
it("hardens a restricted staging bootstrap with no original policy while preserving rows", async () => {
  const staging = new PGlite();
  try {
    await staging.exec(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
      CREATE ROLE authenticator NOLOGIN NOINHERIT;
      GRANT USAGE ON SCHEMA public TO anon, authenticated;`);
    // Match the owner's CREATE TABLE-only setup, without the original public grants/policy.
    const original = sql("drizzle/migrations/0000_migration.sql");
    await staging.exec(original.slice(0, original.indexOf("GRANT INSERT")));
    await staging.exec(`INSERT INTO public.quote_requests(name,phone,product)
      VALUES('Preserved staging fixture','1234567890','PVC Pipes');
      ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.quote_requests FORCE ROW LEVEL SECURITY;
      REVOKE ALL ON public.quote_requests FROM PUBLIC, anon, authenticated;`);
    const before = await staging.query<{ id: string }>("SELECT id FROM public.quote_requests");
    const policies = await staging.query<{ count: number }>(
      "SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='quote_requests'",
    );
    expect(policies.rows[0]!.count).toBe(0);
    const preflight = await stagingChecks(staging);
    expect(preflight["01_status.sql"]![0]!.rows[0]).toMatchObject({
      column_count: 10,
      policy_count: 0,
      rls_enabled: true,
      force_rls: true,
    });
    const grants = preflight["04_effective_column_grants.sql"]![0]!.rows;
    expect(grants).toHaveLength(20);
    for (const row of grants) {
      expect(row).toMatchObject({
        can_select_column: false,
        can_insert_column: false,
        can_update_column: false,
        can_reference_column: false,
        can_delete_table: false,
        can_truncate_table: false,
      });
    }
    await staging.exec(sql("security/001_quote_hardening.sql"));
    const hardened = await stagingChecks(staging);
    expect(hardened["01_status.sql"]![0]!.rows[0]).toMatchObject({
      column_count: 10,
      policy_count: 1,
      rls_enabled: true,
      force_rls: true,
    });
    const writerGrants = hardened["04_effective_column_grants.sql"]![0]!.rows.filter(
      (row) => row["role_name"] === "quote_writer",
    );
    expect(writerGrants.filter((row) => row["can_insert_column"])).toHaveLength(8);
    expect(writerGrants.every((row) => row["can_select_column"] === false)).toBe(true);
    await staging.exec(sql("security/quote-rls-check.sql"));
    await staging.exec(sql("security/002_validate_constraints.sql"));
    const validated = await stagingChecks(staging);
    const checks = validated["06_constraints.sql"]![0]!.rows.filter(
      (row) => row["constraint_type"] === "c",
    );
    expect(checks).toHaveLength(5);
    expect(checks.every((row) => row["validated"] === true)).toBe(true);
    const after = await staging.query<{ id: string }>("SELECT id FROM public.quote_requests");
    expect(after.rows).toEqual(before.rows);
    const settings = await staging.query<{ enabled: boolean; forced: boolean }>(
      "SELECT relrowsecurity AS enabled, relforcerowsecurity AS forced FROM pg_class WHERE oid='public.quote_requests'::regclass",
    );
    expect(settings.rows[0]).toEqual({ enabled: true, forced: true });
  } finally {
    await staging.close();
  }
}, 30000);
it("executes quotation hardening and all rollback-only constraints/RLS assertions", async () => {
  await db.exec(sql("security/001_quote_hardening.sql"));
  await db.exec(sql("security/quote-rls-check.sql"));
  await db.exec(sql("security/002_validate_constraints.sql"));
  const result = await db.query<{ count: string }>("SELECT count(*) FROM public.quote_requests");
  expect(result.rows[0]!.count).toBe(0);
}, 30000);
it.each([
  ["missing", "id='unrelated-bucket'"],
  ["private", "public=false"],
  ["unbounded size", "file_size_limit=NULL"],
  ["wrong size", "file_size_limit=10485760"],
  ["missing MIME types", "allowed_mime_types=NULL"],
  [
    "extra MIME types",
    "allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp','application/pdf','image/svg+xml']",
  ],
])(
  "migration 003 rejects a %s bucket and rolls back application DDL",
  async (_label, change) => {
    await db.exec(`BEGIN; UPDATE storage.buckets SET ${change} WHERE id='product-assets';`);
    try {
      await expect(db.exec(sql("security/003_admin_catalogue_notifications.sql"))).rejects.toThrow(
        "Configure product-assets",
      );
    } finally {
      await db.exec("ROLLBACK");
    }
    const result = await db.query<{ table_name: string | null }>(
      "SELECT to_regclass('public.admin_members')::text AS table_name",
    );
    expect(result.rows[0]!.table_name).toBeNull();
  },
  30000,
);
it("migration 003 stops on an existing permissive Storage write policy", async () => {
  await db.exec(
    "BEGIN; CREATE POLICY fixture_conflicting_policy ON storage.objects FOR INSERT TO anon WITH CHECK(true);",
  );
  try {
    await expect(db.exec(sql("security/003_admin_catalogue_notifications.sql"))).rejects.toThrow(
      "Storage write policies require review",
    );
  } finally {
    await db.exec("ROLLBACK");
  }
}, 30000);
it("executes admin/catalogue/notification drafts and rejects nonadmin access", async () => {
  // If the migration tries to mutate managed bucket records, fail this test.
  await db.exec(`CREATE FUNCTION storage.reject_fixture_bucket_writes() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Managed bucket metadata must stay read-only'; END $$;
    CREATE TRIGGER fixture_bucket_write_guard BEFORE INSERT OR UPDATE OR DELETE ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.reject_fixture_bucket_writes();`);
  await db.exec(sql("security/003_admin_catalogue_notifications.sql"));
  const afterAdmin = await stagingChecks(db);
  expect(afterAdmin["01_status.sql"]![0]!.rows[0]).toMatchObject({
    column_count: 14,
    policy_count: 3,
    rls_enabled: true,
    force_rls: true,
  });
  expect(
    afterAdmin["06_constraints.sql"]![0]!.rows.find(
      (row) => row["constraint_name"] === "quote_product_check",
    ),
  ).toMatchObject({ validated: false });
  await db.exec(sql("security/004_submission_idempotency.sql"));
  const afterRequests = await stagingChecks(db);
  expect(afterRequests["01_status.sql"]![0]!.rows[0]).toMatchObject({
    column_count: 15,
    policy_count: 3,
    rls_enabled: true,
    force_rls: true,
  });
  expect(
    afterRequests["04_effective_column_grants.sql"]![0]!.rows.find(
      (row) => row["role_name"] === "quote_writer" && row["column_name"] === "request_id",
    ),
  ).toMatchObject({ can_insert_column: true, can_select_column: false });
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
it("enforces published managed product names without breaking preserved products or history", async () => {
  await db.exec(`BEGIN; INSERT INTO public.products(slug,name,category,short,description,image,published)
 VALUES('managed-fixture','Managed fixture','Pipes','Fixture short','Fixture description','builtin:pvc',true),
 ('draft-fixture','Unpublished fixture','Pipes','Fixture short','Fixture description','builtin:pvc',false);
 SET LOCAL ROLE quote_writer;
 INSERT INTO public.quote_requests(name,phone,product) VALUES('Product fixture','1234567890','Managed fixture');`);
  for (const product of ["Unpublished fixture", "Not in catalogue"]) {
    await db.exec("SAVEPOINT invalid_product");
    await expect(
      db.query(
        "INSERT INTO public.quote_requests(name,phone,product) VALUES('Invalid fixture','1234567890',$1)",
        [product],
      ),
    ).rejects.toMatchObject({ code: "23514", constraint: "quote_product_catalogue_check" });
    await db.exec("ROLLBACK TO SAVEPOINT invalid_product");
  }
  await db.exec(`RESET ROLE; UPDATE public.products SET published=false WHERE slug='managed-fixture';
 UPDATE public.quote_requests SET status='Contacted' WHERE product='Managed fixture';`);
  const history = await db.query(
    "SELECT status FROM public.quote_requests WHERE product='Managed fixture'",
  );
  expect(history.rows[0]).toEqual({ status: "Contacted" });
  await db.exec("ROLLBACK;");
}, 30000);
it("cancels stale follow-up jobs and ignores acknowledgements from an expired lease", async () => {
  await db.exec(`BEGIN; UPDATE public.notification_settings SET enabled=true,recipients=ARRAY['fixture@example.com'];
 INSERT INTO public.quote_requests(name,phone,product,follow_up_at) VALUES('Lease fixture','1234567890','PVC Pipes',now()-interval '1 minute');
 SET LOCAL ROLE notification_worker;`);
  const batch = await db.query<{
    batch: { jobs: { id: string; kind: string; lease_id: string }[] };
  }>("SELECT public.claim_notification_jobs('sales@example.com','https://example.com') AS batch");
  const followup = batch.rows[0]!.batch.jobs.find((job) => job.kind === "followup")!;
  expect(followup).toBeDefined();
  await db.query("SELECT public.finish_notification_job($1,$2,true,'untrusted-ack')", [
    followup.id,
    "99999999-9999-4999-8999-999999999999",
  ]);
  await db.exec(
    `RESET ROLE; UPDATE public.quote_requests SET status='Closed'; UPDATE public.notification_outbox SET lease_until=now()-interval '1 minute'; SET LOCAL ROLE notification_worker;`,
  );
  await db.query(
    "SELECT public.claim_notification_jobs('sales@example.com','https://example.com')",
  );
  await db.exec("RESET ROLE");
  const result = await db.query(
    "SELECT state,provider_id FROM public.notification_outbox WHERE id=$1",
    [followup.id],
  );
  expect(result.rows[0]).toEqual({ state: "cancelled", provider_id: null });
  await db.exec("ROLLBACK;");
}, 30000);
