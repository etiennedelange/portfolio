# Portfolio

Personal portfolio site, built with SvelteKit (Svelte 5), TypeScript and Tailwind, and deployed on Vercel.

## Development

```sh
pnpm install
cp .env.example .env   # set GITHUB_TOKEN (see below)
pnpm dev
```

| Command                  | Purpose                            |
| ------------------------ | ---------------------------------- |
| `pnpm build` / `preview` | Production build and local preview |
| `pnpm check`             | Type-check with `svelte-check`     |
| `pnpm lint` / `format`   | Prettier + ESLint                  |
| `pnpm test`              | Vitest unit tests + Playwright e2e |
| `pnpm storybook`         | Component explorer on :6006        |

## Projects from GitHub

The Projects section is driven entirely by GitHub, so no code change is needed to add or remove a project:

- **Featured:** repos pinned on the GitHub profile (max 6).
- **More projects:** public, non-fork, non-archived repos with the `portfolio` topic, most recently pushed first (pinned repos excluded).

Tag a repo with:

```sh
gh repo edit <owner>/<repo> --add-topic portfolio
```

Card content comes from the repo's About box: description, website (a "Live →" link on featured cards), topics, language and stars.

**How it works:** `src/lib/server/github.ts` fetches pinned and public repos in one GraphQL query (topic set by `PORTFOLIO_TOPIC`). `src/routes/+page.server.ts` loads it with Vercel ISR, so changes appear within an hour (redeploy to force). If the token is missing or the request fails, the Projects section and its nav link are hidden.

**Token:** create a [fine-grained PAT](https://github.com/settings/personal-access-tokens/new) with the default public read-only access. Its owner determines whose repos are shown. Set `GITHUB_TOKEN` in `.env` locally, and in Vercel under Project → Settings → Environment Variables.
