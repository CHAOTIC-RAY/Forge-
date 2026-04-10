const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/**/*.tsx');

files.forEach(path => {
  let content = fs.readFileSync(path, 'utf8');
  let originalContent = content;

  content = content.replace(/rounded-lg/g, 'rounded-[8px]');
  content = content.replace(/rounded-xl/g, 'rounded-[12px]');
  content = content.replace(/rounded-2xl/g, 'rounded-[16px]');
  content = content.replace(/rounded-3xl/g, 'rounded-[24px]');
  content = content.replace(/shadow-sm/g, '');
  content = content.replace(/shadow-md/g, '');
  content = content.replace(/shadow-lg/g, '');
  content = content.replace(/shadow-xl/g, '');
  content = content.replace(/shadow-2xl/g, '');
  content = content.replace(/shadow-brand\/20/g, '');
  content = content.replace(/shadow-brand\/10/g, '');
  content = content.replace(/shadow-brand\/40/g, '');
  content = content.replace(/shadow-red-500\/20/g, '');
  content = content.replace(/shadow-blue-500\/20/g, '');
  content = content.replace(/shadow-emerald-500\/20/g, '');
  content = content.replace(/text-\[#787774\]/g, 'text-[#757681]');
  content = content.replace(/bg-brand/g, 'bg-[#2665fd]');
  content = content.replace(/text-brand/g, 'text-[#2665fd]');
  content = content.replace(/border-brand/g, 'border-[#2665fd]');
  content = content.replace(/ring-brand/g, 'ring-[#2665fd]');
  content = content.replace(/bg-brand-hover/g, 'bg-[#1e52d0]');

  if (content !== originalContent) {
    fs.writeFileSync(path, content);
    console.log(`Updated ${path}`);
  }
});
console.log('Done');
