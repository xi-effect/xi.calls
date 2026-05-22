#!/bin/bash
set -euo pipefail

# Publish changed calls packages in dependency order (npm trusted publishing / OIDC).
# CHANGED_PACKAGES — JSON array from dorny/paths-filter, e.g. ["calls.types","calls.hooks"]

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=../../scripts/calls-publish-lib.sh
source "${ROOT}/scripts/calls-publish-lib.sh"

CHANGED_PACKAGES="${CHANGED_PACKAGES:-[]}"

is_changed() {
  node -e "
    const list = JSON.parse(process.argv[1]);
    process.exit(list.includes(process.argv[2]) ? 0 : 1);
  " "$CHANGED_PACKAGES" "$1"
}

published=0

for pkg in "${CALLS_PUBLISH_ORDER[@]}"; do
  if ! is_changed "$pkg"; then
    continue
  fi

  echo "::group::Publish packages/${pkg}"
  cd "${ROOT}/packages/${pkg}"

  if npm publish --access public --provenance; then
    echo "Published @xipkg package from packages/${pkg}"
    published=$((published + 1))
  else
    exit_code=$?
    echo "npm publish failed for packages/${pkg} (exit ${exit_code})"
    exit "$exit_code"
  fi

  cd - > /dev/null
  echo "::endgroup::"
done

if [ "$published" -eq 0 ]; then
  echo "No packages to publish."
else
  echo "Published ${published} package(s)."
fi
