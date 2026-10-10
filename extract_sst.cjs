const fs = require('fs');
const path = require('path');

const d = '.next/cache/turbopack';
let found = false;

function searchFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      searchFiles(p);
    } else if (p.endsWith('.sst') || p.endsWith('.log')) {
      const buf = fs.readFileSync(p);
      const str = buf.toString('utf8');
      const idx = str.indexOf("export default function TasksPage()");
      if (idx !== -1) {
        console.log(`Found in ${p} at index ${idx}`);
        // Extract 50000 chars before and 100000 chars after
        const start = Math.max(0, idx - 50000);
        const end = Math.min(str.length, idx + 100000);
        const snippet = str.substring(start, end);
        
        // Let's try to isolate the valid React code
        const codeStart = snippet.lastIndexOf("'use client';");
        if (codeStart !== -1) {
          // Find where it ends
          // It ends with `export default function TasksPage()` then all the components and `}`
          // We can just dump it and analyze
          fs.writeFileSync(`extracted_${path.basename(p)}.txt`, snippet.substring(codeStart));
          console.log(`Extracted from ${p}`);
          found = true;
        }
      }
    }
  }
}

searchFiles(d);
if(!found) console.log('Not found in turbopack cache');
