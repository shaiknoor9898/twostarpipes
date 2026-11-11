# WhatsApp, Telugu and header update

Implemented locally on `fix/quotation-supabase-security`.

- Every existing WhatsApp link uses exactly `https://wa.me/919505503550` and opens a new tab. This includes the enquiry workspace link, now labelled “Open company WhatsApp”. Customer phone numbers and other contact details are unchanged.
- The header has a compact English / Telugu selector at the top right beside the mobile menu; the anniversary logo is centered. English is the initial language. Language persists in local storage (`two-star-language`). The site uses light appearance only; old saved theme preferences are cleared.
- Public pages, navigation, catalogue copy, quotation labels, validation messages, privacy controls and page metadata have Telugu translations. Form option values remain unchanged for server validation. Telugu product search also works.
- Dark, Light and System theme options were removed at the owner's request. The original light palette is retained.

## Files changed for this request

Paths are relative to the project directory. Other existing uncommitted security/database work was preserved.

| Files                                             | Change                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------- |
| `src/lib/site.ts`                                 | Shared company WhatsApp destination                                 |
| `src/lib/telugu.ts` (new)                         | Telugu dictionary and translation helpers                           |
| `src/lib/site-preferences.ts` (new)               | Language context                                                    |
| `src/components/site/SitePreferences.tsx` (new)   | Persistent language, compact selector and translated text           |
| `src/components/site/LocalizedMetadata.tsx` (new) | Public document titles and descriptions                             |
| `src/components/site/SiteHeader.tsx`              | Centered anniversary logo, top-right language selector and translated navigation |
| `src/components/site/SiteFooter.tsx`              | Footer and mobile action translations                               |
| `src/components/site/FloatingActions.tsx`         | Floating action translations                                        |
| `src/components/site/CelebrationBadge.tsx`        | Translated accessible description                                   |
| `src/components/site/HeroSlider.tsx`              | Hero copy and accessible controls                                   |
| `src/components/site/PageHeader.tsx`              | Shared translated page headings                                     |
| `src/components/site/PrivacyControls.tsx`         | Privacy copy                                                        |
| `src/components/site/QuoteForm.tsx`               | Presentation translations; submission logic and values unchanged    |
| `src/components/site/Turnstile.tsx`               | Translated unavailable message; verification unchanged              |
| `src/components/admin/AdminWorkspace.tsx`         | Company WhatsApp link and clear label only                          |
| `src/routes/__root.tsx`                           | Preference provider, early theme script and Telugu font             |
| `src/routes/index.tsx`                            | Home page translations                                              |
| `src/routes/about.tsx`                            | About page translations                                             |
| `src/routes/products.tsx`                         | Catalogue translations, translated search and wrapping mobile CTA   |
| `src/routes/dealers.tsx`                          | Dealer page translations                                            |
| `src/routes/contact.tsx`                          | Contact translations and new-tab WhatsApp link                      |
| `src/styles.css`                                  | Light appearance, Telugu typography and header scroll clearance     |
| `src/test/site-preferences.test.tsx` (new)        | Six language, light-appearance and WhatsApp regression tests        |
| `src/test/admin-workspace.test.tsx`               | Company link and retained customer-phone assertions                 |
| `e2e/preferences.spec.ts` (new)                   | Public page/browser checks at 390, 768, 1024 and 1440 pixels        |
| `docs/UI_UPDATE.md` (new)                         | This handoff                                                        |

## Validation

- TypeScript: passed.
- Vitest: 137 tests passed in 13 files, including existing security/database tests executed locally.
- Playwright: all 9 tests passed. External HTTPS requests were blocked; these tests inspect WhatsApp destinations without contacting WhatsApp or sending enquiries. They check all five public pages in Telugu/light mode, language persistence, English restoration, translated document titles, light appearance despite a dark system preference, responsive widths and existing quotation validation/navigation.
- Lint: passed with zero errors and six existing Fast Refresh warnings in shared UI components.
- Production build: passed. Existing warnings remain about large chunks, redundant `vite-tsconfig-paths` configuration and ignored `inlineDynamicImports` configuration.
- Public bundle boundary check: passed.
- `git diff --check`: passed.
- Inspected the generated mobile Telugu/light screenshot. Browser screenshots are local artifacts in ignored `test-results/`.

## Setup and limits

No new environment variables, packages or database setup are required. No SQL, Supabase configuration, authentication, server business logic, customer records or credentials were changed for this request. No push, merge or deployment was performed.

Existing product content is translated. Future custom catalogue names/descriptions/specifications entered through administration need corresponding dictionary entries; unknown text displays its source value. Proper names, email/phone details and technical measurements retain their original values. The private administration interface remains English. Third-party map/CAPTCHA content is controlled by its provider and was not contacted during browser QA.

Before publishing, the owner can review Telugu wording and confirm the company WhatsApp account opens on their device. Publishing remains a separate approval step.
