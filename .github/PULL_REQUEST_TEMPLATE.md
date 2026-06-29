## Summary

Describe the user problem and the behavior changed.

## Verification

- [ ] `npm run build`
- [ ] Changed workflow checked in Electron
- [ ] Visible changes include screenshots
- [ ] No personal exports, backups, or local data files included
- [ ] `CHANGELOG.md` updated when the change affects users

## Security boundary

Confirm that renderer code still uses the preload API for persistence and filesystem access.
