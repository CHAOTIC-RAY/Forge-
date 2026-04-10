const fs = require('fs');

const path = 'src/components/BrandKitTab.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/rounded-lg/g, 'rounded-[8px]');
content = content.replace(/rounded-xl/g, 'rounded-[12px]');
content = content.replace(/rounded-2xl/g, 'rounded-[16px]');
content = content.replace(/shadow-sm/g, '');
content = content.replace(/shadow-md/g, '');
content = content.replace(/shadow-lg/g, '');
content = content.replace(/shadow-xl/g, '');
content = content.replace(/shadow-2xl/g, '');
content = content.replace(/shadow-brand\/20/g, '');
content = content.replace(/shadow-red-500\/20/g, '');
content = content.replace(/text-\[#787774\]/g, 'text-[#757681]');
content = content.replace(/bg-brand/g, 'bg-[#2665fd]');
content = content.replace(/text-brand/g, 'text-[#2665fd]');
content = content.replace(/border-brand/g, 'border-[#2665fd]');
content = content.replace(/ring-brand/g, 'ring-[#2665fd]');
content = content.replace(/bg-brand-hover/g, 'bg-[#1e52d0]');

fs.writeFileSync(path, content);
console.log('Done');
