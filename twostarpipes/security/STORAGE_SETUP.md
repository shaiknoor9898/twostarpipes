# Product Storage setup: prepare locally, execute only after approval

The application uploads through Supabase Storage, not by writing managed metadata.
Migration 003 now reads bucket configuration only. No bucket was created or changed
on Supabase during this work. Do not perform this setup before the preflight gate
and explicit staging configuration approval.

## Required configuration

| Setting | Required value |
| --- | --- |
| Bucket ID/name | product-assets |
| Public retrieval | Enabled, deliberately: approved product images and brochures only |
| Maximum file size | 5,242,880 bytes (5 MiB) |
| Allowed MIME types | image/jpeg, image/png, image/webp, application/pdf |

Use the confirmed staging project's **Storage** bucket creation/settings interface.
Enter the exact name, enable public retrieval, and configure the size/type restrictions.
If the UI represents size in rounded units, verify the stored byte value below.
An owner-controlled Storage API operation is another supported option; no API keys
or service credentials should be placed in SQL, frontend code or chat to do this.
Do not create a second bucket or delete an existing one to resolve a mismatch.

After separately approved setup, verify using this one read-only SQL query:

```sql
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets WHERE id='product-assets';
```

Expect one row with the exact settings above. No row or any different value makes
migration 003 stop without creating its application tables. Local regression tests
verify missing/private/wrong-size/wrong-type configurations and ensure the migration
cannot INSERT/UPDATE/DELETE bucket records.

## Policy review

Run `staging-checks/10_storage_and_defaults.sql` and inspect all existing Storage
policies. Migration 003 deliberately stops if ANY existing INSERT/UPDATE/DELETE/ALL
policy exists on storage.objects; other permissive write policies could otherwise
bypass the new admin restriction. If another bucket has legitimate policies, review
their scope and prepare an explicit reviewed compatibility change. Never disable
RLS or blindly remove policies to make the migration pass.

The new policy grants only authenticated, allowlisted admins INSERT into this
bucket. It grants no public uploads, no overwrite and no delete workflow. Public
retrieval is intentional; customer records, credentials and private documents must
never be uploaded. The application also checks decoded size, MIME and file signatures.
Those checks are not a malware scan or complete file parser. Untrusted editor access
would require a separately reviewed scanning/quarantine workflow.

Owner/member permissions to create policies on managed Storage must be verified
through Supabase's supported setup. Do not change managed table ownership or grant
the application a service-role key. After approval, test real uploads/downloads with
an admin, a nonadmin and an anonymous client; embedded PostgreSQL tests model the
RLS rules, not the hosted Storage service.

References: [Storage schema](https://supabase.com/docs/guides/storage/schema/design),
[bucket creation](https://supabase.com/docs/guides/storage/buckets/creating-buckets),
[Storage access control](https://supabase.com/docs/guides/storage/security/access-control).
