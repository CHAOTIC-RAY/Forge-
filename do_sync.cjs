const fs = require('fs');
const { execSync } = require('child_process');

const toRemove = ['src', 'public', 'server', 'server.ts', 'package.json', 'package-lock.json', 'index.html', 'vite.config.ts', 'tsconfig.json'];

for (const item of toRemove) {
  if (fs.existsSync(item)) {
    fs.rmSync(item, { recursive: true, force: true });
    console.log('Removed', item);
  }
}

console.log('Running degit...');
execSync('npx -y degit CHAOTIC-RAY/Forge- --force', { stdio: 'inherit' });
console.log('Sync complete.');
