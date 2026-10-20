# Tasting Atlas cloud deployment

Source repository: `ryoodayeon/howtokeepinmind` (private).

The app supports two frontends backed by the same private Supabase project:

- Sites: existing Worker/App Router frontend, configured with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` runtime values.
- GitHub Pages: static React frontend built with `pnpm build:pages`, configured with repository Actions variables. Hash routes keep reloads and detail links working under `/howtokeepinmind/`. Email auth returns to the Pages base URL so the Supabase SDK can consume the auth fragment before navigating inside the app.

Private records and photos live in Supabase, never in the GitHub repository or Pages assets. The public frontend uses only the publishable/anon key and owner RLS. The repository's privacy does not itself control the audience of a Pages site.

## 1. Supabase

Run both files in order in a fresh project:

1. `supabase/migrations/202610190001_initial.sql`
2. `supabase/migrations/202610200001_vivino_import.sql`

Enable email authentication. Configure these allowed redirect URLs for the frontends you will use:

- `https://ryoodayeon.github.io/howtokeepinmind/`
- `https://tasting-atlas-dayeon.dbeks0327.chatgpt.site/archive`

Use the primary frontend's URL as Supabase's Site URL. Record the exact project URL and public publishable/anon key. Never put a service-role or secret key in frontend config.

## 2. GitHub Pages

In Repository Settings → Secrets and variables → Actions → Variables, set:

| Variable | Value |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Public publishable/anon key |
| `MAP_STYLE_URL` | Optional MapLibre style URL |

In Repository Settings → Pages → Build and deployment, select **GitHub Actions** as Source. Then run **Publish Tasting Atlas to GitHub Pages** from Actions, or push a source change to `main`.

The workflow checks that cloud config is present, installs locked dependencies, typechecks, runs tests, builds the static app, uploads an artifact and deploys Pages. The expected default address is `https://ryoodayeon.github.io/howtokeepinmind/`; it is only live after a successful Pages deployment. GitHub Free does not support Pages from private repositories; GitHub Pro or another supported plan is needed to keep this repository private. Repository visibility is not changed by these workflows.

## 3. Sites

Set the two `NEXT_PUBLIC_SUPABASE_*` runtime values on the existing Site and deploy a new version. This frontend then switches to authenticated cloud mode. Both frontends use the same Supabase rows and Storage objects after login.

## 4. Move existing Vivino notes

After signing in, open Settings → Vivino import and select the original Vivino ZIP. The importer saves to Supabase in cloud mode. It preserves personal memo text, treats scan dates separately, skips duplicate source records and excludes unidentified scans. Source ZIPs, CSVs and personal notes are never committed to GitHub.

Browser-local records and cloud records remain separate. Changing configuration or switching frontend origins does not automatically migrate browser storage. Keep any local export before changing modes, especially if you edited or added records after importing Vivino.

## Verification before reporting cloud migration complete

Confirm the database migrations succeeded, private bucket and owner policies exist, account login works, and the same records can be loaded from another browser/account as appropriate. Another authenticated account must see no owner data. Verify GitHub Actions and Pages deployment results separately. A source upload or successful static build is not proof that either service is connected.
