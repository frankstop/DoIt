const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packageJson = require(path.join(root, 'package.json'));
const requiredFiles = [
  'README.md',
  'CHANGELOG.md',
  'LICENSE',
  'SECURITY.md',
  'build/icon.png',
  '.github/workflows/ci.yml',
  '.github/workflows/release.yml'
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error(`Missing release files: ${missing.join(', ')}`);
  process.exit(1);
}

const expectedTag = `v${packageJson.version}`;
const actualTag = process.env.RELEASE_TAG;
if (actualTag && actualTag !== expectedTag) {
  console.error(`Tag ${actualTag} does not match package version ${packageJson.version}. Expected ${expectedTag}.`);
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+$/.test(packageJson.version)) {
  console.error(`Package version ${packageJson.version} is not a stable semantic version.`);
  process.exit(1);
}

console.log(`Release inputs are ready for ${expectedTag}.`);
