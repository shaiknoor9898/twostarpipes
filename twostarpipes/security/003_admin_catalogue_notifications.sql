-- VERSIONED REVIEW DRAFT. Apply once in disposable staging AFTER 001 and 002.
-- Does not grant the website service_role or bypass-RLS credentials.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
CREATE TABLE public.admin_members(user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.admin_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_members FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.admin_members WHERE user_id=auth.uid());
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
ALTER TABLE public.quote_requests
 ADD COLUMN status text NOT NULL DEFAULT 'New' CHECK(status IN ('New','Contacted','Quotation Sent','Converted','Closed')),
 ADD COLUMN internal_notes text NOT NULL DEFAULT '' CHECK(char_length(internal_notes)<=5000),
 ADD COLUMN follow_up_at timestamptz,
 ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX quote_status_created_idx ON public.quote_requests(status,created_at DESC,id);
CREATE INDEX quote_follow_up_idx ON public.quote_requests(follow_up_at) WHERE follow_up_at IS NOT NULL;
GRANT SELECT ON public.quote_requests TO authenticated;
GRANT UPDATE(status,internal_notes,follow_up_at) ON public.quote_requests TO authenticated;
CREATE POLICY admin_read_quotes ON public.quote_requests FOR SELECT TO authenticated USING(public.is_admin());
CREATE POLICY admin_update_quotes ON public.quote_requests FOR UPDATE TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin());
CREATE TABLE public.admin_audit(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor uuid DEFAULT auth.uid(),
 action text NOT NULL CHECK(action IN ('created','updated','deleted','export')),
 entity_type text NOT NULL CHECK(entity_type IN ('quote_requests','products','notification_settings')),
 entity_id text, old_status text, new_status text, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.admin_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_audit FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.admin_audit TO authenticated;
GRANT INSERT(action,entity_type,entity_id) ON public.admin_audit TO authenticated;
CREATE POLICY admin_read_audit ON public.admin_audit FOR SELECT TO authenticated USING(public.is_admin());
CREATE POLICY admin_export_audit ON public.admin_audit FOR INSERT TO authenticated WITH CHECK(public.is_admin() AND actor=auth.uid() AND action='export' AND entity_type='quote_requests');
CREATE FUNCTION public.bounded_product_lines(value text[]) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT coalesce(cardinality(value)<=50 AND NOT EXISTS(SELECT 1 FROM unnest(value) AS line WHERE line IS NULL OR char_length(btrim(line)) NOT BETWEEN 1 AND 300),false);
$$;
CREATE TABLE public.products(
 slug text PRIMARY KEY CHECK(char_length(slug)<=80 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 name text NOT NULL UNIQUE CHECK(char_length(btrim(name)) BETWEEN 1 AND 100),
 category text NOT NULL CHECK(char_length(btrim(category)) BETWEEN 1 AND 80),
 short text NOT NULL CHECK(char_length(btrim(short)) BETWEEN 1 AND 200),
 description text NOT NULL CHECK(char_length(btrim(description)) BETWEEN 1 AND 5000),
 image text NOT NULL CHECK(char_length(image)<=2000 AND image ~ '^(https://|/assets/|builtin:)'),
 uses text[] NOT NULL DEFAULT '{}' CHECK(public.bounded_product_lines(uses)),
 sizes text[] NOT NULL DEFAULT '{}' CHECK(public.bounded_product_lines(sizes)),
 gauges text[] NOT NULL DEFAULT '{}' CHECK(public.bounded_product_lines(gauges)),
 advantages text[] NOT NULL DEFAULT '{}' CHECK(public.bounded_product_lines(advantages)),
 specifications text NOT NULL DEFAULT '' CHECK(char_length(specifications)<=5000),
 brochure text NOT NULL DEFAULT '' CHECK(char_length(brochure)<=2000 AND (brochure='' OR brochure ~ '^https://')),
 published boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.products FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.products TO anon,authenticated;
GRANT INSERT(slug,name,category,short,description,image,uses,sizes,gauges,advantages,specifications,brochure,published),
 UPDATE(slug,name,category,short,description,image,uses,sizes,gauges,advantages,specifications,brochure,published), DELETE ON public.products TO authenticated;
CREATE POLICY public_catalogue ON public.products FOR SELECT TO anon USING(published);
CREATE POLICY authenticated_catalogue ON public.products FOR SELECT TO authenticated USING(published OR public.is_admin());
CREATE POLICY admin_insert_products ON public.products FOR INSERT TO authenticated WITH CHECK(public.is_admin());
CREATE POLICY admin_update_products ON public.products FOR UPDATE TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin());
CREATE POLICY admin_delete_products ON public.products FOR DELETE TO authenticated USING(public.is_admin());
ALTER TABLE public.quote_requests DROP CONSTRAINT quote_product_check;
ALTER TABLE public.quote_requests ADD CONSTRAINT quote_product_check CHECK(char_length(btrim(product)) BETWEEN 1 AND 100) NOT VALID;
-- No new public inserts: the server validates currently published product names.
CREATE FUNCTION public.record_admin_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE entity text; old_s text; new_s text;
BEGIN
 IF TG_TABLE_NAME='quote_requests' THEN
  entity=NEW.id::text; new_s=NEW.status;
  IF TG_OP='UPDATE' THEN old_s=OLD.status; END IF;
 ELSIF TG_TABLE_NAME='notification_settings' THEN entity='default';
 ELSE
  IF TG_OP='DELETE' THEN entity=OLD.slug; ELSE entity=NEW.slug; END IF;
 END IF;
 INSERT INTO public.admin_audit(actor,action,entity_type,entity_id,old_status,new_status)
 VALUES(auth.uid(),CASE TG_OP WHEN 'INSERT' THEN 'created' WHEN 'UPDATE' THEN 'updated' ELSE 'deleted' END,TG_TABLE_NAME,entity,old_s,new_s);
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.record_admin_change() FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN IF TG_TABLE_NAME='products' AND to_jsonb(OLD)->>'slug' IS DISTINCT FROM to_jsonb(NEW)->>'slug' THEN RAISE EXCEPTION 'Product slug is immutable'; END IF; NEW.updated_at=clock_timestamp(); RETURN NEW; END $$;
CREATE TRIGGER quote_touch BEFORE UPDATE ON public.quote_requests FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER product_touch BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER quote_audit AFTER INSERT OR UPDATE ON public.quote_requests FOR EACH ROW EXECUTE FUNCTION public.record_admin_change();
CREATE TRIGGER product_audit AFTER INSERT OR UPDATE OR DELETE ON public.products FOR EACH ROW EXECUTE FUNCTION public.record_admin_change();
CREATE FUNCTION public.admin_metrics() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 RETURN (SELECT jsonb_build_object('total',count(*),'new',count(*) FILTER(WHERE status='New'),'contacted',count(*) FILTER(WHERE status='Contacted'),'pending',count(*) FILTER(WHERE status IN ('New','Contacted')),'sent',count(*) FILTER(WHERE status='Quotation Sent'),'converted',count(*) FILTER(WHERE status='Converted'),'overdue',count(*) FILTER(WHERE follow_up_at<=now() AND status NOT IN ('Closed','Converted'))) FROM public.quote_requests);
END $$;
REVOKE ALL ON FUNCTION public.admin_metrics() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_metrics() TO authenticated;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('product-assets','product-assets',true,5242880,ARRAY['image/jpeg','image/png','image/webp','application/pdf']);
CREATE POLICY admin_asset_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='product-assets' AND public.is_admin());
-- Immutable paths prevent accidental replacement of live catalogue assets.
CREATE TABLE public.notification_settings(id boolean PRIMARY KEY DEFAULT true CHECK(id),enabled boolean NOT NULL DEFAULT false,recipients text[] NOT NULL DEFAULT '{}' CHECK(cardinality(recipients)<=10));
INSERT INTO public.notification_settings DEFAULT VALUES;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_settings FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.notification_settings TO authenticated;
GRANT UPDATE(enabled,recipients) ON public.notification_settings TO authenticated;
CREATE POLICY admin_notification_settings ON public.notification_settings FOR ALL TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin());
CREATE TRIGGER notification_settings_audit AFTER UPDATE ON public.notification_settings FOR EACH ROW EXECUTE FUNCTION public.record_admin_change();
CREATE TABLE public.notification_outbox(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), enquiry_id uuid NOT NULL REFERENCES public.quote_requests(id),kind text NOT NULL DEFAULT 'new' CHECK(kind IN ('new','followup')),followup_on timestamptz,recipients text[] NOT NULL,sender text,site_origin text,UNIQUE NULLS NOT DISTINCT(enquiry_id,kind,followup_on), created_at timestamptz NOT NULL DEFAULT now(), state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sending','sent','failed')), attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(), lease_id uuid, lease_until timestamptz, provider_id text);
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_outbox FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.notification_outbox TO authenticated;
CREATE POLICY admin_notification_jobs ON public.notification_outbox FOR SELECT TO authenticated USING(public.is_admin());
CREATE FUNCTION public.queue_enquiry_notification() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF (SELECT enabled FROM public.notification_settings WHERE id) THEN INSERT INTO public.notification_outbox(enquiry_id,recipients) VALUES(NEW.id,(SELECT recipients FROM public.notification_settings WHERE id)) ON CONFLICT(enquiry_id,kind,followup_on) DO NOTHING; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.queue_enquiry_notification() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER enquiry_notification AFTER INSERT ON public.quote_requests FOR EACH ROW EXECUTE FUNCTION public.queue_enquiry_notification();
CREATE ROLE notification_worker NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
GRANT notification_worker TO authenticator;
GRANT USAGE ON SCHEMA public TO notification_worker;
CREATE FUNCTION public.claim_notification_jobs(sender_address text, site_address text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE jobs jsonb; BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.notification_settings WHERE id AND enabled) THEN RETURN '[]'; END IF;
 INSERT INTO public.notification_outbox(enquiry_id,kind,followup_on,recipients) SELECT q.id,'followup',q.follow_up_at,s.recipients FROM public.quote_requests q CROSS JOIN public.notification_settings s WHERE s.id AND s.enabled AND q.follow_up_at<=now() AND q.status NOT IN ('Converted','Closed') ON CONFLICT(enquiry_id,kind,followup_on) DO NOTHING;
 UPDATE public.notification_outbox SET state='failed' WHERE state IN ('pending','sending') AND (attempts>=8 OR created_at<now()-interval '23 hours');
 WITH candidates AS (SELECT id FROM public.notification_outbox WHERE attempts<8 AND created_at>now()-interval '23 hours' AND ((state='pending' AND available_at<=now()) OR (state='sending' AND lease_until<now())) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 10), claimed AS (UPDATE public.notification_outbox j SET state='sending',sender=coalesce(j.sender,sender_address),site_origin=coalesce(j.site_origin,site_address),attempts=attempts+1,lease_id=gen_random_uuid(),lease_until=now()+interval '5 minutes' FROM candidates c WHERE j.id=c.id RETURNING j.id,j.enquiry_id,j.lease_id,j.kind,j.recipients,j.sender,j.site_origin)
 SELECT coalesce(jsonb_agg(to_jsonb(claimed)),'[]') INTO jobs FROM claimed;
 RETURN jsonb_build_object('jobs',jobs);
END $$;
CREATE FUNCTION public.finish_notification_job(job_id uuid, lease uuid, delivered boolean, provider text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 UPDATE public.notification_outbox SET state=CASE WHEN delivered THEN 'sent' WHEN attempts>=8 THEN 'failed' ELSE 'pending' END, provider_id=CASE WHEN delivered THEN left(provider,200) ELSE NULL END, available_at=now()+make_interval(secs=>least(3600,power(2,attempts)::integer*30)),lease_until=NULL
 WHERE id=job_id AND lease_id=lease AND state='sending';
END $$;
REVOKE ALL ON FUNCTION public.claim_notification_jobs(text,text),public.finish_notification_job(uuid,uuid,boolean,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_jobs(text,text),public.finish_notification_job(uuid,uuid,boolean,text) TO notification_worker;
COMMIT;
