#!/usr/bin/env bash
set -euo pipefail

# First-time (or full) manual publish of all @xipkg/calls-* packages to npm.
#
# Prerequisites:
#   1. npm login (or valid NODE_AUTH_TOKEN with publish access to @xipkg)
#   2. Versions bumped in package.json (npm rejects duplicate versions with 409)
#   3. pnpm install completed
#
# Usage:
#   ./scripts/publish-calls-all.sh              # build + publish all
#   ./scripts/publish-calls-all.sh --dry-run    # build + npm publish --dry-run
#   ./scripts/publish-calls-all.sh --skip-build # publish only (dist must exist)
#   ./scripts/publish-calls-all.sh --yes        # skip confirmation prompt

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=calls-publish-lib.sh
source "${ROOT}/scripts/calls-publish-lib.sh"

DRY_RUN=false
SKIP_BUILD=false
ASSUME_YES=false

usage() {
  cat <<'EOF'
Usage: ./scripts/publish-calls-all.sh [options]

Options:
  --dry-run     Run npm publish --dry-run (no upload)
  --skip-build  Skip install/build (requires existing dist/ in each package)
  --yes         Publish without confirmation prompt
  -h, --help    Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --yes)
      ASSUME_YES=true
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

cd "$ROOT"

echo "==> Checking npm authentication"
if ! npm whoami; then
  echo "ERROR: Not logged in to npm. Run: npm login" >&2
  exit 1
fi

if [[ "$SKIP_BUILD" == false ]]; then
  echo "==> Installing dependencies (without lifecycle scripts)"
  # --ignore-scripts: avoids broken optional postinstalls (e.g. unrs-resolver/napi-postinstall)
  pnpm install --frozen-lockfile --ignore-scripts

  echo "==> Building all calls packages"
  pnpm exec turbo run build --filter='./packages/calls...'
else
  echo "==> Skipping build (--skip-build)"
fi

echo
echo "Packages to publish (in order):"
for pkg in "${CALLS_PUBLISH_ORDER[@]}"; do
  pkg_dir="${ROOT}/packages/${pkg}"
  name="$(get_package_field "$pkg_dir" name)"
  version="$(get_package_field "$pkg_dir" version)"
  assert_dist_built "$pkg_dir" "$name"
  echo "  - ${name}@${version}"
done

if [[ "$DRY_RUN" == true ]]; then
  echo
  echo "DRY RUN — nothing will be uploaded to npm."
fi

if [[ "$ASSUME_YES" == false ]]; then
  echo
  read -r -p "Continue? [y/N] " reply
  if [[ ! "$reply" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
fi

published=0

for pkg in "${CALLS_PUBLISH_ORDER[@]}"; do
  pkg_dir="${ROOT}/packages/${pkg}"
  name="$(get_package_field "$pkg_dir" name)"
  version="$(get_package_field "$pkg_dir" version)"

  echo
  echo "==> Publishing ${name}@${version} (packages/${pkg})"

  pushd "$pkg_dir" > /dev/null

  publish_args=(publish --access public)
  if [[ "$DRY_RUN" == true ]]; then
    publish_args+=(--dry-run)
  fi

  if npm "${publish_args[@]}"; then
    published=$((published + 1))
    echo "OK: ${name}@${version}"
  else
    exit_code=$?
    echo "FAILED: ${name}@${version} (exit ${exit_code})" >&2
    popd > /dev/null
    exit "$exit_code"
  fi

  popd > /dev/null
done

echo
if [[ "$DRY_RUN" == true ]]; then
  echo "Dry run complete for ${published} package(s)."
else
  echo "Published ${published} package(s) to npm."
  echo "Next: configure Trusted Publisher on npmjs.com for each package (workflow: front-production.yml)."
fi
