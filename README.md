# Tasting Atlas

A private, note-first tasting archive for wine, tea, coffee, whisky and other drinks. Korean UI with English category and navigation labels. Starts empty; no imported catalog or sample records.

## Run locally

Requires Node 22.13+ and pnpm (the project pins its package manager).

```sh
pnpm install
cp .env.example .env.local
pnpm dev
```

The App Router application uses the supplied Vinext/Cloudflare Workers build, React, strict TypeScript, Tailwind, Lucide, MapLibre and Supabase. The framework adapts Next.js App Router APIs for Workers. `pnpm build` produces `dist/client` and `dist/server` for Sites. For conventional Next.js hosting, use `next dev` / `next build` / `next start` and adapt the host configuration; `.openai/hosting.json` is Sites-specific.

## Storage modes

- **Local Demo Mode** is selected only when both Supabase public config values are absent. Actual CRUD, photos and normalized entity arrays are persisted transactionally in IndexedDB. It is browser-local: no login, no cloud backup, no cross-device sync. Drafts use a separate IndexedDB store and are offered for recovery. Clearing browser data removes these records. Export JSON regularly.
- **Cloud mode** uses Supabase Auth, PostgreSQL and a private Storage bucket. No local/cloud mixing or automatic migration. Cloud data loads only with an authenticated session. Drafts remain local and are namespaced by account ID. Do not use a service-role key in frontend config.
- Mode changes do not copy data. Export local records first. A JSON import/migration UI is not part of this version.

## Supabase setup

1. Create a new Supabase project.
2. Run the SQL files in `supabase/migrations/` in filename order in the SQL editor (or use Supabase CLI migrations). The migration creates normalized tables, constraints, all owner policies, atomic save RPCs and a private `tasting-photos` bucket.
3. Enable Email auth. Configure Site URL and allowed redirect URLs to include your actual deployment origin and `/archive`, plus local development origin when needed. Review email delivery configuration and rate limits.
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the project URL and publishable/anon key. These are public config values. Never use a secret/service-role key.
5. On Sites, set these variables through the site's runtime environment settings, then deploy a new version. They are passed from the server route to the browser; no secret values are exposed.
6. Verify login and RLS with two separate users. The same SQL functions run with invoker rights; all tables enforce owner RLS. Composite owner foreign keys prevent linking another account's beverage, origin, tasting, tag or photo.

One new beverage and its first tasting are committed by a single PostgreSQL transaction (`save_tasting`). Photo uploads happen first, are removed if the transaction fails, and replaced/deleted image objects are cleaned up after committed database changes. If object cleanup fails, unused private objects can remain and should be removed administratively; successful records remain intact. No fake save-success is shown before the database confirms completion.

## Data model and UX

Products and experiences have separate IDs. Repeating a tasting reuses the beverage but starts with empty notes, aroma tags, sensory measurements and infusions. Previous tea/coffee brewing recipes can be copied only explicitly. Product edits propagate to linked tasting views. No automatic name matching or merging.

Optional product metadata and brewing fields are JSONB; origins, tasting infusions, aroma tags and photos are relational. Missing sensory values remain absent, not zero or a default midpoint. Five-step controls describe intensity, never quality. Wine color and sparkling status remain independent. Category changes retain notes, photos and aroma tags; populated incompatible fields require confirmation before clearing.

Archive supports beverages/tastings, list/grid, photos in both, Korean/English search, intersecting filters, and sorting. Tea infusions are explicitly added. Product and tasting detail pages, edit/delete confirmations, origin corrections, data-based Insights and Settings are included.

## Maps

MapLibre defaults to OpenFreeMap Positron (`https://tiles.openfreemap.org/styles/positron`) with provider attribution. No token needed. Optionally set `NEXT_PUBLIC_MAP_STYLE_URL` to another compliant HTTPS style URL and configure any required public token in that URL. Keep required attribution in its sources. Never put a secret token here.

Only saved origins connected to the current user's products appear. Unconfirmed/missing coordinates are excluded from markers but remain available in the origin list. Approximate regional/country coordinates are labelled; exact coordinates require explicit user confirmation. The atlas represents production, never where a drink was consumed. It clusters markers, supports category filters and has a keyboard-accessible origin list beside the interactive map. No public Nominatim autocomplete is used. A network/provider/WebGL failure shows a retry state; origin records remain accessible.

## Photos and exports

JPG, PNG and WebP files up to 20 MB are decoded and compressed to JPEG with a maximum 1600-pixel edge. HEIC is not supported and produces an explicit conversion message. Up to 12 photos per tasting; preview, reorder, cover selection and deletion are supported. Cover/related photos appear in both list and grid. Photos belong to the tasting in this UI and are aggregated on the beverage page.

Local JSON exports contain image data. Cloud JSON exports contain only private storage references and expiring signed URLs, **not photo files**. CSV exports include tasting rows and scalar/JSON fields but exclude photo binaries and detailed infusion rows. CSV text is escaped against spreadsheet formula execution. A complete archive ZIP and a bulk importer are not included.

## Checks

```sh
pnpm typecheck
pnpm test
pnpm build
```

Tests cover first/repeated tasting identity, independent edits, optional sensory fields, tea infusions, category-aware aroma suggestions, cross-field filtering, origin coordinate validation, cascade deletion, export semantics and IndexedDB persistence after repository recreation. Run the critical scenarios with a real browser at 375, 768, 1280 and 1440 pixels before treating cross-browser behavior as verified. The implementation includes responsive rules for these sizes, but browser QA requires an available browser environment.

Cloud auth, actual Supabase policies/storage and real map rendering must be verified against configured services. Code/build tests do not prove a live cloud configuration. The initial deployed version uses Local Demo Mode when no Supabase credentials are provided.

## GitHub and publishing

The configured source repository is `ryoodayeon/howtokeepinmind`. See [DEPLOYMENT.md](DEPLOYMENT.md) for the Supabase and GitHub Pages setup. `pnpm build:pages` produces a static frontend in `dist-pages`; the existing Worker frontend remains available through the Sites workflow.


The Sites source remote is managed separately from GitHub. To mirror into a new empty GitHub repository, add its URL as a second remote and push `main`. Never replace a remote or force-push an unrelated existing repository.

```sh
git remote add github https://github.com/YOUR_ACCOUNT/tasting-atlas.git
git push github main
```

The included GitHub Actions workflow runs type checking, tests and build on pushes and PRs. Sites publication uses its supported source/version deployment workflow. GitHub mirroring alone does not configure automatic Sites deployment; keep these two operations explicit. `.env.example` is safe to commit; local `.env*` credentials are ignored.

## External setup / limits

- Supabase project credentials and migration execution are required for cloud authentication, private cloud data and cross-device use.
- Browser QA and actual RLS multi-account verification must be performed in an environment with those capabilities.
- No social features, scores, AI tasting generation, catalog datasets or fake activity are included.

## Vivino import

Settings → Vivino 기록 가져오기 accepts the original ZIP or `full_wine_list.csv` (20 MB maximum). ZIP handling reads only that CSV; account, profile, external-account, mobile and login files are ignored. No imported personal data is bundled into source code or deployed assets.

The preview shows additions, existing notes and unnamed scans before the user commits. Existing records are never overwritten. Product identity uses the explicit Vivino product URL plus vintage; repeat notes have separate record IDs. Reimporting the same source does not duplicate records, including when Vivino's aggregate rating changes. Names are never fuzzy-matched. Products without notes can be imported without creating a tasting. Unnamed scans remain in the original export and are excluded from the archive.

`Personal Note` and `Your review` retain their original text and are stored separately in source metadata. The primary notes field contains the original personal note (or review); when both exist they are combined with a clearly labelled separator. The scan timestamp is retained as provenance; the tasting date stays unset unless the user explicitly chooses to use scan dates. No rating, average rating or inferred sensory score is imported. Origins remain unresolved until coordinates are confirmed.

Optional label images are external Vivino URL references, not copied image files. Their availability depends on Vivino. JSON exports retain these references and never claim they contain the actual external images. Cloud imports additionally require `202610200001_vivino_import.sql`, run after the initial migration, to store provenance, external image references and the transactional bulk import RPC. Local mode commits the entire import in one IndexedDB transaction.
