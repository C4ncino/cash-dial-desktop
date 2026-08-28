# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Releases

Releases are prepared after a pull request is merged into `main`. The pull request title controls
whether a release is built and which semantic version component changes:

| Pull request title | Release |
| :----------------- | :------ |
| `fix: ...` or `fix(scope): ...` | Patch |
| `feat: ...` or `feat(scope): ...` | Minor |
| Any type with `!`, such as `feat!:` or `refactor(scope)!:` | Major |
| Any other title | No release |

Release tags use the exact `vMAJOR.MINOR.PATCH` format and are the canonical version history. The
committed manifests use the `1.0.0` baseline; the release workflow applies the calculated version to
all manifests in its build workspace. Qualifying pull requests produce unsigned Windows and Linux
installers in a draft GitHub Release so the assets can be reviewed before publication.

The release helper can be verified locally with:

```sh
node --test .github/scripts/release-version.test.mjs
```

## Main branch protection

`main` is intended to accept changes only through pull requests whose `windows-latest` and
`ubuntu-latest` checks pass. The ruleset also blocks force pushes, deletion, and administrator
bypasses, while requiring no approval for a solo maintainer.

An administrator can idempotently create or update the ruleset with a fine-grained GitHub token that
has `Administration: write` permission:

```powershell
$env:GITHUB_ADMIN_TOKEN = "<token>"
node .github/scripts/protect-main.mjs
```
