# Shared publish order for @xipkg/calls-* (dependencies first).
CALLS_PUBLISH_ORDER=(
  calls.types
  calls.config
  calls.utils
  calls.store
  calls.providers
  calls.hooks
  calls.ui
  calls.risehand
  calls.chat
  calls.compactview
  calls
)

get_package_field() {
  local pkg_dir=$1
  local field=$2
  node -e "
    const pkg = JSON.parse(require('fs').readFileSync('${pkg_dir}/package.json', 'utf8'));
    const value = pkg['${field}'];
    if (value === undefined) process.exit(1);
    console.log(value);
  "
}

assert_dist_built() {
  local pkg_dir=$1
  local name=$2

  if [[ ! -f "${pkg_dir}/dist/index.mjs" ]]; then
    echo "ERROR: ${name}: dist/index.mjs not found. Run build first." >&2
    exit 1
  fi

  if [[ ! -f "${pkg_dir}/dist/index.d.ts" ]]; then
    echo "ERROR: ${name}: dist/index.d.ts not found. Run build first." >&2
    exit 1
  fi
}
