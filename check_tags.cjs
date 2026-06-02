const fs = require('fs');
const content = fs.readFileSync('src/components/BrandKitTab.tsx', 'utf8');

const tags = content.match(/<[A-Za-z0-9]+(\s+[^>]*?)?>|<\/[A-Za-z0-9]+>/g) || [];
const stack = [];

for (const tag of tags) {
  if (tag.startsWith('</')) {
    const tagName = tag.substring(2, tag.length - 1);
    if (stack.length === 0) {
      console.log(`Unexpected closing tag: ${tag}`);
    } else {
      const last = stack.pop();
      if (last !== tagName) {
        console.log(`Mismatched tags: opened ${last}, closed ${tagName} (tag: ${tag})`);
      }
    }
  } else if (!tag.endsWith('/>')) {
    const tagName = tag.match(/<([A-Za-z0-9]+)/)[1];
    // Ignore some common components that might be self-closing but not caught by /> regex if they have props
    stack.push(tagName);
  }
}

if (stack.length > 0) {
  console.log(`Unclosed tags: ${stack.join(', ')}`);
} else {
  console.log('All tags balanced (roughly)');
}
