# README Badge Updater

This script automatically updates the version badges in the README.md file based on the versions in package.json.

## Purpose

The purpose of this script is to ensure that all version numbers displayed in the README badges are always up to date with the actual versions being used in the project. This helps maintain consistency and accuracy in the project documentation.

## How It Works

The script:

1. Reads the package.json file to get the current versions of:
   - Project version
   - Angular
   - Node.js
   - @soulcraft/brainy
   - TypeScript

2. Updates the corresponding badges in the README.md file using regular expressions

3. Also updates the version number at the bottom of the README.md file

## Usage

The script is integrated into the build and deployment process through npm scripts in package.json:

```json
"scripts": {
  "update-badges": "node update-readme-badges.js",
  "prebuild": "npm run update-badges",
  "predeploy": "npm version patch --no-git-tag-version && npm run update-badges"
}
```

This ensures that:
- The badges are updated before every build
- The badges are updated after version increment but before deployment

You can also run the script manually:

```bash
npm run update-badges
```

## Maintenance

If new dependencies are added that should be reflected in README badges, update the script to include those dependencies.

The regular expressions in the script are designed to match the specific format of the badges in the README.md file. If the badge format changes, the regular expressions will need to be updated accordingly.
