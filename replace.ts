import fs from 'fs';
import path from 'path';

function replaceInFile(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;
  
  content = content.replace(/bg-\[\#2665fd\]\/10/g, 'bg-brand-bg');
  content = content.replace(/bg-\[\#2665fd\]\/60/g, 'bg-brand/60');
  content = content.replace(/bg-\[\#2665fd\]/g, 'bg-brand');
  content = content.replace(/text-\[\#2665fd\]/g, 'text-brand');
  content = content.replace(/border-\[\#2665fd\]\/20/g, 'border-brand-border');
  content = content.replace(/border-\[\#2665fd\]\/50/g, 'border-brand/50');
  content = content.replace(/border-\[\#2665fd\]/g, 'border-brand');
  content = content.replace(/ring-\[\#2665fd\]/g, 'ring-brand');
  content = content.replace(/hover:bg-\[\#1e52d0\]/g, 'hover:bg-brand-hover');
  content = content.replace(/border-\[\#1e52d0\]/g, 'border-brand-hover');
  content = content.replace(/text-\[\#1e52d0\]/g, 'text-brand-hover');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${filePath}`);
  }
}

function walkDir(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      replaceInFile(filePath);
    }
  }
}

walkDir('./src');
