# Release checklist

## Prepare

- [ ] Update `package.json` to the intended semantic version.
- [ ] Move user-visible entries from Unreleased to the versioned section in `CHANGELOG.md`.
- [ ] Run `npm ci`.
- [ ] Run `npm run release:check`.
- [ ] Run `npm run build`.
- [ ] Exercise the changed workflows in the Electron app.
- [ ] Confirm JSON import, export, backup, and weekly summary actions.
- [ ] Capture current screenshots with non-sensitive records.

## Tag

- [ ] Commit the release changes on `main`.
- [ ] Create a tag that matches `package.json`, such as `v1.0.0`.
- [ ] Push `main` and the tag.
- [ ] Wait for macOS, Windows, and Linux packaging jobs.

## Review the draft

- [ ] Download each package from the draft GitHub Release.
- [ ] Install and open each available platform package.
- [ ] Confirm the app starts with an empty local database.
- [ ] Confirm the app icon and product name appear correctly.
- [ ] Add screenshots and final release notes.
- [ ] Add SHA-256 checksums for each package.
- [ ] State that the packages are unsigned until code signing is configured.
- [ ] Publish the GitHub Release.
