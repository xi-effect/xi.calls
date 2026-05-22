#!/usr/bin/env node

import readline from 'node:readline/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { stdin as input, stdout as output } from 'node:process';
import { parseArgs } from 'node:util';
import {
  assertDistBuilt,
  CALLS_PUBLISH_ORDER,
  getRepoRoot,
  readPackageField,
} from './calls-publish-lib.mjs';

function isCi() {
  return process.env.GITHUB_ACTIONS === 'true';
}

function group(title, fn) {
  if (isCi()) {
    console.log(`::group::${title}`);
  } else {
    console.log(title);
  }

  try {
    return fn();
  } finally {
    if (isCi()) {
      console.log('::endgroup::');
    }
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

function parseChangedPackages(raw) {
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error('changed-packages must be a JSON array');
  }

  return parsed;
}

function resolvePackagesToPublish(changedPackages) {
  if (changedPackages) {
    return CALLS_PUBLISH_ORDER.filter((pkg) => changedPackages.includes(pkg));
  }

  return [...CALLS_PUBLISH_ORDER];
}

function publishPackage(pkgDir, { dryRun, provenance }) {
  const args = ['publish', '--access', 'public'];

  if (dryRun) {
    args.push('--dry-run');
  }

  if (provenance) {
    args.push('--provenance');
  }

  run('npm', args, { cwd: pkgDir });
}

export async function publishCallsPackages(options) {
  const rootDir = options.rootDir ?? getRepoRoot();
  const changedPackages = options.changedPackages
    ? parseChangedPackages(options.changedPackages)
    : null;
  const packagesToPublish = resolvePackagesToPublish(changedPackages);

  if (packagesToPublish.length === 0) {
    console.log('No packages to publish.');
    return 0;
  }

  if (!changedPackages) {
    run('npm', ['whoami']);
  }

  if (!changedPackages && !options.skipBuild) {
    run('pnpm', ['install', '--frozen-lockfile', '--ignore-scripts'], { cwd: rootDir });
    run('pnpm', ['exec', 'turbo', 'run', 'build', '--filter=./packages/calls...'], {
      cwd: rootDir,
    });
  } else if (!changedPackages && options.skipBuild) {
    console.log('Skipping build (--skip-build)');
  }

  console.log('\nPackages to publish (in order):');
  for (const pkg of packagesToPublish) {
    const pkgDir = path.join(rootDir, 'packages', pkg);
    const name = readPackageField(pkgDir, 'name');
    const version = readPackageField(pkgDir, 'version');
    assertDistBuilt(pkgDir, name);
    console.log(`  - ${name}@${version}`);
  }

  if (options.dryRun) {
    console.log('\nDRY RUN — nothing will be uploaded to npm.');
  }

  if (!changedPackages && !options.yes) {
    const rl = readline.createInterface({ input, output });
    const reply = await rl.question('\nContinue? [y/N] ');
    rl.close();

    if (!/^y$/i.test(reply.trim())) {
      console.log('Aborted.');
      return 0;
    }
  }

  let published = 0;

  for (const pkg of packagesToPublish) {
    const pkgDir = path.join(rootDir, 'packages', pkg);
    const name = readPackageField(pkgDir, 'name');
    const version = readPackageField(pkgDir, 'version');

    group(`Publish packages/${pkg}`, () => {
      console.log(`Publishing ${name}@${version}`);
      publishPackage(pkgDir, {
        dryRun: options.dryRun,
        provenance: options.provenance,
      });
      published += 1;
      console.log(`Published ${name}@${version}`);
    });
  }

  if (options.dryRun) {
    console.log(`\nDry run complete for ${published} package(s).`);
  } else if (published > 0) {
    console.log(`\nPublished ${published} package(s).`);

    if (!changedPackages) {
      console.log(
        'Next: configure Trusted Publisher on npmjs.com for each package (workflow: front-production.yml).',
      );
    }
  }

  return published;
}

function parseCliArgs(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      all: { type: 'boolean', default: false },
      'changed-packages': { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      'skip-build': { type: 'boolean', default: false },
      yes: { type: 'boolean', default: false },
      provenance: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: false,
  });

  if (values.help) {
    console.log(`Usage: node scripts/publish-calls-packages.mjs [options]

Options:
  --changed-packages <json>  Publish only changed packages (CI mode)
  --all                      Publish all calls packages in dependency order
  --dry-run                  Run npm publish --dry-run
  --skip-build               Skip install/build before publishing all packages
  --yes                      Skip confirmation prompt
  --provenance               Pass --provenance to npm publish (CI trusted publishing)
  --help, -h                 Show this help
`);
    process.exit(0);
  }

  return values;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseCliArgs(process.argv.slice(2));

  if (!args.all && !args['changed-packages']) {
    console.error('Specify --all or --changed-packages.');
    process.exit(1);
  }

  if (args.all && args['changed-packages']) {
    console.error('Use either --all or --changed-packages, not both.');
    process.exit(1);
  }

  publishCallsPackages({
    changedPackages: args['changed-packages'],
    dryRun: args['dry-run'],
    skipBuild: args['skip-build'],
    yes: args.yes,
    provenance: args.provenance,
  }).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
