-- Disposable staging AFTER 003. Owner connection, psql -v ON_ERROR_STOP=1
-- Supply two dedicated existing Auth user UUIDs: -v admin_uuid=... -v user_uuid=...
-- Every fixture and allowlist membership is rolled back. Never use customer identities.
BEGIN;
SELECT set_config('test.admin_uuid', :'admin_uuid', true);
SELECT set_config('test.user_uuid', :'user_uuid', true);
DO $$ BEGIN
 IF current_setting('test.admin_uuid')=current_setting('test.user_uuid') THEN RAISE EXCEPTION 'Use different test users'; END IF;
 IF EXISTS(SELECT 1 FROM public.admin_members WHERE user_id=current_setting('test.user_uuid')::uuid) THEN RAISE EXCEPTION 'Nonadmin fixture already has admin access'; END IF;
END $$;
INSERT INTO public.admin_members(user_id) VALUES(current_setting('test.admin_uuid')::uuid) ON CONFLICT DO NOTHING;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',json_build_object('sub',current_setting('test.user_uuid'),'role','authenticated')::text,true);
SELECT set_config('request.jwt.claim.sub',current_setting('test.user_uuid'),true);
DO $$ BEGIN
 IF public.is_admin() THEN RAISE EXCEPTION 'Nonadmin treated as admin'; END IF;
 IF EXISTS(SELECT 1 FROM public.quote_requests) THEN RAISE EXCEPTION 'Nonadmin can read leads'; END IF;
 IF EXISTS(SELECT 1 FROM public.admin_audit) THEN RAISE EXCEPTION 'Nonadmin can read audit'; END IF;
 IF EXISTS(SELECT 1 FROM public.notification_settings) THEN RAISE EXCEPTION 'Nonadmin can read recipients'; END IF;
 UPDATE public.quote_requests SET status='Closed'; IF FOUND THEN RAISE EXCEPTION 'Nonadmin can edit leads'; END IF;
 BEGIN PERFORM public.admin_metrics(); RAISE EXCEPTION 'Nonadmin metrics allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.claim_notification_jobs('x','https://example.com'); RAISE EXCEPTION 'Nonadmin worker access'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claims',json_build_object('sub',current_setting('test.admin_uuid'),'role','authenticated')::text,true);
SELECT set_config('request.jwt.claim.sub',current_setting('test.admin_uuid'),true);
DO $$ BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Allowlisted admin denied'; END IF;
 PERFORM public.admin_metrics();
 BEGIN INSERT INTO public.quote_requests(name,phone,product) VALUES('Forbidden admin insert','1234567890','PVC Pipes'); RAISE EXCEPTION 'Admin bypasses public submission gateway'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.quote_requests SET phone='1234567890'; RAISE EXCEPTION 'Admin can rewrite contact data'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM 1 FROM public.quote_requests; RAISE EXCEPTION 'Anonymous leads readable'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.is_admin(); RAISE EXCEPTION 'Anonymous role helper executable'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.quote_requests(name,phone,product) VALUES('Bypass','1234567890','PVC Pipes'); RAISE EXCEPTION 'Anonymous direct insert'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
