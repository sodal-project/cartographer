const { readFileSync, writeFileSync } = require('fs');
// __dirname is already available in CommonJS modules

// Read package.json
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

// Get versions from package.json
const versions = {
  version: packageJson.version,
  angular: packageJson.dependencies['@angular/core'].replace('^', ''),
  node: packageJson.engines.node.replace('>=', 'v'),
  soulcraft: packageJson.dependencies['@soulcraft/brainy'].replace('^', ''),
  typescript: packageJson.devDependencies.typescript.replace('~', '')
};

console.log('Versions from package.json:');
console.log(versions);

// Read README.md
let readmeContent = readFileSync('README.md', 'utf8');

// Update version badges
readmeContent = readmeContent
  // Update project version
  .replace(
    /<a href="https:\/\/github\.com\/yourusername\/cartographer"><img src="https:\/\/img\.shields\.io\/badge\/version-[^-]+-blue\.svg" alt="Version"><\/a>/,
    `<a href="https://github.com/yourusername/cartographer"><img src="https://img.shields.io/badge/version-${versions.version}-blue.svg" alt="Version"></a>`
  )
  // Update Angular version
  .replace(
    /<a href="https:\/\/angular\.io\/"><img src="https:\/\/img\.shields\.io\/badge\/Angular-[^-]+-red\.svg" alt="Angular"><\/a>/,
    `<a href="https://angular.io/"><img src="https://img.shields.io/badge/Angular-${versions.angular}-red.svg" alt="Angular"></a>`
  )
  // Update Node version
  .replace(
    /<a href="https:\/\/nodejs\.org\/"><img src="https:\/\/img\.shields\.io\/badge\/node-[^-]+-green\.svg" alt="Node"><\/a>/,
    `<a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-${versions.node}-green.svg" alt="Node"></a>`
  )
  // Update Soulcraft Brainy version
  .replace(
    /<a href="https:\/\/soulcraft\.com"><img src="https:\/\/img\.shields\.io\/badge\/@soulcraft\/brainy-[^-]+-purple\.svg" alt="Soulcraft Brainy"><\/a>/,
    `<a href="https://soulcraft.com"><img src="https://img.shields.io/badge/@soulcraft/brainy-${versions.soulcraft}-purple.svg" alt="Soulcraft Brainy"></a>`
  )
  // Update TypeScript version
  .replace(
    /<a href="https:\/\/www\.typescriptlang\.org\/"><img src="https:\/\/img\.shields\.io\/badge\/TypeScript-[^-]+-blue\.svg" alt="TypeScript"><\/a>/,
    `<a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-${versions.typescript}-blue.svg" alt="TypeScript"></a>`
  );

// Update version at the bottom of the file
readmeContent = readmeContent.replace(
  /Version: [0-9]+\.[0-9]+\.[0-9]+/,
  `Version: ${versions.version}`
);

// Write updated README.md
writeFileSync('README.md', readmeContent);

console.log('README.md badges updated successfully!');
