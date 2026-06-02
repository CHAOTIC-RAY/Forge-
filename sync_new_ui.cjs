const fs = require('fs');
const { execSync } = require('child_process');

// Files to keep regardless of what's in the repo
const keepFiles = new Set([
  'firebase-applet-config.json',
  'metadata.json',
  'node_modules',
  '.env',
  '.npmrc',
  'sync_new_ui.cjs'
]);

console.log('Cleaning workspace...');
const files = fs.readdirSync('.');
for (const file of files) {
  if (!keepFiles.has(file)) {
    fs.rmSync(file, { recursive: true, force: true });
    console.log(`Deleted: ${file}`);
  }
}

console.log('Fetching New-Ui branch...');
execSync('npx -y degit CHAOTIC-RAY/Forge-#New-Ui --force', { stdio: 'inherit' });
console.log('Sync complete.');
