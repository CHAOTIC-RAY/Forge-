const fs = require('fs');
const { execSync } = require('child_process');

const keepFiles = new Set([
  'firebase-applet-config.json',
  'metadata.json',
  'node_modules',
  '.env',
  '.npmrc',
  'exact_sync.cjs'
]);

const files = fs.readdirSync('.');
for (const file of files) {
  if (!keepFiles.has(file)) {
    fs.rmSync(file, { recursive: true, force: true });
    console.log(`Deleted: ${file}`);
  }
}

console.log('Running degit...');
execSync('npx -y degit CHAOTIC-RAY/Forge- --force', { stdio: 'inherit' });
console.log('Degit complete.');
