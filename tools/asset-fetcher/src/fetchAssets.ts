#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { ConfigSchema, Config, AssetEntry, PostAction } from './types.js';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import AdmZip, { IZipEntry } from 'adm-zip';
import got from 'got';
import crypto from 'node:crypto';

let sharpAvailable = false as boolean;
let sharp: any;
try {
  // dynamic import so tool still works without sharp installed (optional dependency)
  // @ts-ignore
  sharp = (await import('sharp')).default;
  sharpAvailable = true;
} catch {
  sharpAvailable = false;
}

interface DownloadResult { filePath: string; entry: AssetEntry; dryRun: boolean; }

const program = new Command();
program
  .option('-c, --config <file>', 'config file', 'assets.config.json')
  .option('--dry-run', 'show actions without downloading')
  .option('-v, --verbose', 'verbose logging')
  .option('--debug', 'very verbose (includes stack traces)')
  .parse(process.argv);

const opts = program.opts();

async function readConfig(file: string): Promise<Config> {
  const raw = await fs.promises.readFile(file, 'utf-8');
  const json = JSON.parse(raw);
  const parsed = ConfigSchema.parse(json);
  logDebug(`Config parsed with ${parsed.assets.length} assets`);
  return parsed;
}

function logVerbose(msg: string) { if (opts.verbose || opts.debug) console.log(chalk.gray('[verbose] ' + msg)); }
function logDebug(msg: string) { if (opts.debug) console.log(chalk.magenta('[debug] ' + msg)); }

async function ensureDir(dir: string) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function download(entry: AssetEntry, outDir: string, userAgent: string, dry: boolean): Promise<DownloadResult> {
  const filename = path.basename(new URL(entry.url).pathname) || (entry.id + '.dat');
  const outPath = path.join(outDir, filename);
  // Basic cache: if file exists, compute hash & skip re-download (later can use ETag / If-None-Match)
  if (!dry && fs.existsSync(outPath)) {
    logVerbose(`File exists, skipping download (cache hit): ${outPath}`);
    return { filePath: outPath, entry, dryRun: false };
  }
  if (dry) {
    logVerbose(`(dry-run) Skipping network for ${entry.id} -> ${outPath}`);
    return { filePath: outPath, entry, dryRun: true };
  }
  logVerbose(`Downloading ${entry.url} -> ${outPath}`);
  const stream = got.stream(entry.url, { headers: { 'User-Agent': userAgent } });
  await pipeline(stream, fs.createWriteStream(outPath));
  logVerbose(`Finished download ${entry.id} (${outPath})`);
  return { filePath: outPath, entry, dryRun: false };
}

function shouldInclude(name: string, filters?: string[]) {
  if (!filters || filters.length === 0) return true;
  const normalized = name.replace(/\\/g, '/');
  return filters.every(f => {
    const token = f.replace(/\\/g, '/').replace(/^\//,'');
    return normalized.includes(token);
  });
}

function sanitizeFilename(name: string): string {
  // Remove path separators, control chars, Windows reserved characters
  return name
    .replace(/\\/g, '/')
    .split('/')
    .pop()!
    .replace(/[<>:"|?*]/g, '_')
    .replace(/\s+/g, '_');
}

async function handleZip(res: DownloadResult, cfg: Config) {
  if (res.dryRun) return; // skip processing in dry-run
  if (!fs.existsSync(res.filePath)) {
    throw new Error(`ZIP file does not exist (download skipped in dry-run): ${res.filePath}`);
  }
  try {
    const zip = new AdmZip(res.filePath);
    const extractDir = path.join(path.dirname(res.filePath), res.entry.id);
    await ensureDir(extractDir);
    const entries = zip.getEntries() as IZipEntry[];
    logVerbose(`Extracting ${entries.length} entries from ${res.entry.id}`);
    for (const e of entries) {
      if (e.isDirectory) continue;
      const entryNameNormalized = e.entryName.replace(/\\/g, '/');
      if (!shouldInclude(entryNameNormalized, res.entry.pathFilters)) continue;
      const clean = sanitizeFilename(e.entryName);
      if (!clean) continue;
      const target = path.join(extractDir, clean);
      fs.writeFileSync(target, e.getData());
      logDebug(`Wrote ${target}`);
    }
    if (res.entry.post) {
      for (const action of res.entry.post) {
        logVerbose(`Post action ${action.action} on ${res.entry.id}`);
        await runPostAction(action, extractDir);
      }
    }
  } catch (err: any) {
    throw new Error(`ZIP extract failed for ${res.entry.id}: ${err.message}`);
  }
}

async function runPostAction(action: PostAction, dir: string) {
  switch (action.action) {
    case 'extractFrames':
      if (!sharpAvailable) {
        console.log(chalk.yellow(`[post] extractFrames skipped (sharp not installed)`));
        return;
      }
      await performSharpExtraction(action, dir);
      return;
    case 'rename':
      await fs.promises.rename(path.join(dir, action.from), path.join(dir, action.to));
      return;
  }
}

async function performSharpExtraction(action: any, dir: string) {
  const {
    frameWidth, frameHeight, pattern, margin = 0, spacing = 0,
    mode = 'meta', directionOrder, directionBlockSize, metaFile
  } = action;

  const files = (await fs.promises.readdir(dir))
    .filter(f => f.toLowerCase().endsWith('.png'))
    .filter(f => !pattern || new RegExp(pattern.replace('*', '.*')).test(f));
  if (files.length === 0) {
    logVerbose(`No PNG files matched for extraction in ${dir}`);
    return;
  }
  for (const file of files) {
    const full = path.join(dir, file);
    logVerbose(`Extracting frames from ${file}`);
    const image = sharp(full);
    const meta = await image.metadata();
    if (!meta.width || !meta.height) {
      console.warn(chalk.red(`[extract] Cannot read dimensions for ${file}`));
      continue;
    }
    const cols = Math.floor((meta.width - margin * 2 + spacing) / (frameWidth + spacing));
    const rows = Math.floor((meta.height - margin * 2 + spacing) / (frameHeight + spacing));
    const frames: any[] = [];
    let index = 0;
    const outputFramesDir = path.join(dir, file.replace(/\.png$/i, '_frames'));
    if (mode === 'files') await ensureDir(outputFramesDir);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = margin + c * (frameWidth + spacing);
        const y = margin + r * (frameHeight + spacing);
        if (x + frameWidth > meta.width || y + frameHeight > meta.height) continue;
        const frameMeta = { index, x, y, w: frameWidth, h: frameHeight };
        frames.push(frameMeta);
        if (mode === 'files') {
          const outFile = path.join(outputFramesDir, `frame_${index.toString().padStart(4,'0')}.png`);
          await image.extract({ left: x, top: y, width: frameWidth, height: frameHeight }).png().toFile(outFile);
        }
        index++;
      }
    }
    // Direction mapping (optional)
    let mapping: any = undefined;
    if (directionOrder && directionBlockSize) {
      mapping = {};
      directionOrder.forEach((dirName: string, dIdx: number) => {
        const start = dIdx * directionBlockSize;
        mapping[dirName] = Array.from({ length: directionBlockSize }, (_, i) => start + i).filter(i => i < frames.length);
      });
    }
    if (mode === 'meta' || mode === 'files') {
      const metaOut = {
        image: file,
        frameWidth,
        frameHeight,
        columns: cols,
        rows,
        total: frames.length,
        frames,
        mapping
      };
      const metaPath = path.join(dir, metaFile || file.replace(/\.png$/i, '.meta.json'));
      await fs.promises.writeFile(metaPath, JSON.stringify(metaOut, null, 2), 'utf-8');
      logVerbose(`Wrote meta ${metaPath}`);
    }
    // atlas mode (future enhancement)
  }
}

async function processAsset(res: DownloadResult, cfg: Config) {
  if (res.entry.type === 'zip') await handleZip(res, cfg);
}

async function main() {
  const spinner = ora('Reading config').start();
  try {
    const cfg = await readConfig(opts.config);
    spinner.succeed('Config loaded');

    await ensureDir(cfg.outputDir);

    for (const asset of cfg.assets) {
      const s = ora(`Downloading ${asset.id}`).start();
      try {
        const result = await download(asset, cfg.outputDir, cfg.userAgent, !!opts.dryRun);
        s.succeed(`Downloaded ${asset.id}` + (opts.dryRun ? ' (dry-run)' : ''));
        if (!result.dryRun) {
          await processAsset(result, cfg);
        } else {
          s.info(`Skipped extraction (dry-run)`);
        }
      } catch (err: any) {
        s.fail(`Failed ${asset.id}: ${err.message}`);
        if (opts.debug) console.error(err);
      }
    }
    if (!opts.dryRun) {
      await updateAttributions(cfg);
    } else {
      logVerbose('Skipped ATTRIBUTIONS update (dry-run)');
    }
    console.log(chalk.green('All assets processed.'));
  } catch (err: any) {
    spinner.fail('Failed: ' + err.message);
    process.exit(1);
  }
}

main();

async function updateAttributions(cfg: Config) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const rootAttrPath = path.resolve(__dirname, '../../../../ATTRIBUTIONS.md');
  let existing = '';
  try { existing = await fs.promises.readFile(rootAttrPath, 'utf-8'); } catch {}
  const lower = existing.toLowerCase();
  let updated = existing;
  for (const asset of cfg.assets) {
    const marker = `<!-- asset:${asset.id} -->`;
    if (lower.includes(marker.toLowerCase())) continue;
    const block = `\n${marker}\n### Asset: ${asset.id}\nSource: ${asset.url}\nLicense: ${asset.license || 'Unknown'}\nAdded: ${new Date().toISOString()}\n`;
    updated += block;
  }
  if (updated !== existing) {
    await fs.promises.writeFile(rootAttrPath, updated, 'utf-8');
    logVerbose('ATTRIBUTIONS.md updated');
  } else {
    logVerbose('ATTRIBUTIONS.md unchanged');
  }
}
