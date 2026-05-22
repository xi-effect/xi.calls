import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));

export const CALLS_PUBLISH_ORDER = JSON.parse(
  fs.readFileSync(path.join(scriptsDir, 'calls-publish-order.json'), 'utf8'),
);

export function getRepoRoot(fromDir = scriptsDir) {
  return path.resolve(fromDir, '..');
}

export function readPackageField(pkgDir, field) {
  const pkgPath = path.join(pkgDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  if (pkg[field] === undefined) {
    throw new Error(`Missing "${field}" in ${pkgPath}`);
  }

  return pkg[field];
}

export function assertDistBuilt(pkgDir, name) {
  for (const file of ['dist/index.mjs', 'dist/index.d.ts']) {
    const filePath = path.join(pkgDir, file);

    if (!fs.existsSync(filePath)) {
      throw new Error(`${name}: ${file} not found. Run build first.`);
    }
  }
}

export function listCallsPackageNames(packagesDir) {
  return fs
    .readdirSync(packagesDir)
    .filter((name) => name === 'calls' || name.startsWith('calls.'))
    .sort();
}
