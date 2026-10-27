import fs from 'node:fs';
import path from 'node:path';

// Limpa cache corrompido do Next.js/Turbopack antes do build para evitar panics no Cloudflare Pages
try {
  const cachePath = path.resolve(process.cwd(), '.next/cache');
  if (fs.existsSync(cachePath)) {
    console.log('[prebuild] Limpando .next/cache para evitar erros de cache corrompido...');
    fs.rmSync(cachePath, { recursive: true, force: true });
    console.log('[prebuild] .next/cache limpo com sucesso.');
  }
} catch (err) {
  console.warn('[prebuild] Aviso ao limpar cache:', err);
}
