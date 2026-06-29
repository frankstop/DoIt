# Contributing to DO IT.

## Local setup

Use Node.js 20 or newer.

```bash
npm install
npm run dev
```

## Before opening a pull request

```bash
npm run build
```

Confirm the changed workflow in the Electron window. Include screenshots for visible UI changes and note any platform-specific packaging behavior.

## Pull requests

- Keep each change focused.
- Explain the user problem and the chosen behavior.
- Preserve the main/preload/renderer security boundary.
- Do not add direct Node access to the renderer.
- Do not commit personal exports, backups, local data files, or secrets.
- Update `CHANGELOG.md` for user-visible changes.

## Releases

Maintainers create a release by updating the version and changelog, committing the change, then pushing a matching tag such as `v1.0.0`. The release workflow builds macOS, Windows, and Linux packages and attaches them to a GitHub Release.
