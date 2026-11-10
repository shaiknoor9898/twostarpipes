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
- Quote/dealer submissions pass Turnstile and persistent Redis limits in the submitQuote server function, then insert into quote_requests using a dedicated server-only quote_writer JWT. The security/ SQL drafts replace anonymous INSERT with writer-only column grants and RLS; they require a coordinated, reviewed staging cutover and have not been applied. Preserve denial of public lead reads/updates/deletes.
- Phone installability is manifest-only (`public/manifest.webmanifest` + icons); no service worker, since offline was not requested.
- Location maps use the OpenStreetMap embed URL in `SITE.mapEmbed`; Google's keyless map iframe is blocked (ERR_BLOCKED_BY_RESPONSE) on the owner's network.
