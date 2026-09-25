# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
pnpm dlx sv@0.15.3 create --template minimal --types ts --add prettier eslint vitest="usages:unit,component" playwright tailwindcss="plugins:typography" paraglide="languageTags:en+demo:no" storybook mcp="ide:claude-code+setup:remote" --install pnpm ./
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

## Deploying

The site is deployed on Vercel using [`@sveltejs/adapter-vercel`](https://svelte.dev/docs/kit/adapter-vercel).

## Projects from GitHub

The Projects section is populated from GitHub automatically, so the site never needs editing to add or remove a project. It is managed entirely from GitHub:

- **Featured projects** are the repos pinned on the GitHub profile (GitHub allows at most 6).
- **More projects** are all public, non-fork, non-archived repos owned by the account that carry the `portfolio` topic, most recently pushed first. Pinned repos are not repeated here.

To add a repo, tag it (repo page → About ⚙️ → Topics → `portfolio`) or run:

```sh
gh repo edit <owner>/<repo> --add-topic portfolio
```

The card text comes from the repo's About box: description, website (shown as a "Live →" link on featured cards), topics, primary language and stars. Private repos are never shown.

### How it works

- `src/lib/server/github.ts` makes a single GraphQL request to the GitHub API for the token owner's pinned repos and public repos, then filters the latter by topic. The topic name is the `PORTFOLIO_TOPIC` constant.
- `src/routes/+page.server.ts` loads this on the server and enables Vercel [ISR](https://vercel.com/docs/incremental-static-regeneration) with a one-hour expiration: visitors get a cached page, and it is regenerated in the background at most once an hour. Changes on GitHub therefore take up to an hour to appear (redeploy to force it).
- If the token is missing or the request fails, the error is logged and the Projects section (and its nav link) is hidden; the rest of the page renders normally.

### Setup

Create a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new) with the default "Public repositories (read-only)" access and no extra permissions. The token's owner is whose repos are shown, so no username is configured anywhere.

- **Locally:** copy `.env.example` to `.env` and set `GITHUB_TOKEN`. `pnpm dev` fetches fresh on every load (ISR only applies on Vercel).
- **Vercel:** add `GITHUB_TOKEN` under Project → Settings → Environment Variables, then redeploy.
