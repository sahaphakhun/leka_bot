// One-off script: Fix mojibake/percent-encoded Thai filenames and missing extensions in files.originalName/fileName
// Usage: ts-node scripts/fix-filenames.ts  (or build then: node dist/scripts/fix-filenames.js)

import { AppDataSource } from '@/utils/database';
import { File } from '@/models';
import { Repository } from 'typeorm';

function decodeMojibake(name: string): string {
  let out = name;
  if (/%[0-9A-Fa-f]{2}/.test(out)) {
    try { out = decodeURIComponent(out); } catch {}
  }
  if (out && !/[\u0E00-\u0E7F]/.test(out) && /[àÃ]/.test(out)) {
    try {
      const bytes = Uint8Array.from(Array.from(out).map(ch => ch.charCodeAt(0) & 0xFF));
      const decoded = new TextDecoder('utf-8').decode(bytes);
      if (decoded && /[\u0E00-\u0E7F]/.test(decoded)) out = decoded;
    } catch {}
  }
  return out;
}

function inferExtFromMime(mime: string): string | '' {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
    'video/mp4': 'mp4', 'audio/mpeg': 'mp3', 'application/pdf': 'pdf', 'application/json': 'json', 'text/plain': 'txt'
  };
  return (map[mime] || '') as any;
}

async function main() {
  await AppDataSource.initialize();
  const repo: Repository<File> = AppDataSource.getRepository(File);
  const files = await repo.find();
  let updated = 0;

  for (const f of files) {
    let changed = false;
    let name = f.originalName || '';
    let fileName = f.fileName || '';

    const fixedName = decodeMojibake(name);
    if (fixedName !== name) { f.originalName = fixedName; changed = true; }

    const extHasDot = f.originalName && f.originalName.includes('.');
    if (!extHasDot) {
      const ext = inferExtFromMime(f.mimeType);
      if (ext) { f.originalName = `${f.originalName || 'file_' + f.id}.${ext}`; changed = true; }
    }

    if (fileName && !fileName.includes('.')) {
      const ext = inferExtFromMime(f.mimeType);
      if (ext) { f.fileName = `${fileName}.${ext}`; changed = true; }
    }

    if (changed) {
      await repo.save(f);
      updated++;
      // eslint-disable-next-line no-console
      console.log(`🔧 Updated file ${f.id}: ${name} -> ${f.originalName}`);
    }
  }

  // eslint-disable-next-line no-console
  console.log(`✅ Done. Updated ${updated} record(s).`);
  await AppDataSource.destroy();
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error('❌ Fix filenames failed:', err);
  process.exit(1);
});

