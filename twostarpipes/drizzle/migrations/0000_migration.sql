CREATE TABLE public.quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  city text,
  customer_type text NOT NULL DEFAULT 'farmer',
  product text NOT NULL,
  quantity text,
  message text
);

GRANT INSERT ON public.quote_requests TO anon, authenticated;
GRANT ALL ON public.quote_requests TO service_role;

ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a quote request"
ON public.quote_requests FOR INSERT TO anon, authenticated
WITH CHECK (
  char_length(name) BETWEEN 1 AND 100
  AND char_length(phone) BETWEEN 6 AND 20
  AND char_length(product) BETWEEN 1 AND 100
  AND (message IS NULL OR char_length(message) <= 1000)
);