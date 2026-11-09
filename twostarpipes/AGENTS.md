<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Company contact details and product catalog live in `src/lib/site.ts`; pages read from it so details change in one place.
- Quote/dealer form submissions are inserted by the `submitQuote` server function into the `quote_requests` table (anon insert-only RLS, no public reads) so every lead is stored.
- Phone installability is manifest-only (`public/manifest.webmanifest` + icons); no service worker, since offline was not requested.
- Location maps use the OpenStreetMap embed URL in `SITE.mapEmbed`; Google's keyless map iframe is blocked (ERR_BLOCKED_BY_RESPONSE) on the owner's network.
