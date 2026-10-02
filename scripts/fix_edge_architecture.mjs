import fs from 'node:fs';
import path from 'node:path';

function getAllFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

const appDir = path.join(process.cwd(), 'app');
const files = getAllFiles(appDir).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

console.log(`Inspecting ${files.length} files in app/...`);

let removedFromClient = [];
let ensuredInRoute = [];
let ensuredInLayout = [];

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(process.cwd(), filePath);
  const isClient = content.includes("'use client'") || content.includes('"use client"');
  const base = path.basename(filePath);

  if (isClient) {
    // 1. Remove export const runtime = 'edge' from client components
    if (content.includes("export const runtime = 'edge'") || content.includes('export const runtime = "edge"')) {
      content = content.replace(/\r?\n?export const runtime = ['"]edge['"];?\r?\n?/g, '\n');
      // Clean up multiple empty lines if any
      content = content.replace(/'use client';\s*\n\s*/, "'use client';\n\n");
      fs.writeFileSync(filePath, content, 'utf8');
      removedFromClient.push(relPath);
    }
  } else {
    // 2. Server Components:
    // If it's a route.ts or layout.tsx, ensure export const runtime = 'edge';
    if (base === 'route.ts' || base === 'layout.tsx' || relPath === path.join('app', 'page.tsx')) {
      if (!content.includes("export const runtime = 'edge'") && !content.includes('export const runtime = "edge"')) {
        content = `export const runtime = 'edge';\n\n` + content;
        fs.writeFileSync(filePath, content, 'utf8');
        if (base === 'route.ts') ensuredInRoute.push(relPath);
        else ensuredInLayout.push(relPath);
      }
    }
  }
}

console.log('\n--- RESUMO ---');
console.log(`1. Removido de ${removedFromClient.length} Client Components:`);
removedFromClient.forEach(f => console.log(`   - ${f}`));

console.log(`\n2. Garantido em Layouts/Root Server Components (${ensuredInLayout.length} novos):`);
ensuredInLayout.forEach(f => console.log(`   - ${f}`));

console.log(`\n3. Garantido em Rotas de API (${ensuredInRoute.length} novos):`);
ensuredInRoute.forEach(f => console.log(`   - ${f}`));
