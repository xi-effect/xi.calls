#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! npm whoami >/dev/null 2>&1; then
  echo "Ошибка: не авторизованы в npm. Выполните: npm login"
  exit 1
fi

echo "Сборка calls-пакетов..."
pnpm exec turbo run build --filter='./packages/calls*'

PACKAGES=(
  packages/calls.types
  packages/calls.config
  packages/calls.utils
  packages/calls.store
  packages/calls.providers
  packages/calls.hooks
  packages/calls.ui
  packages/calls.chat
  packages/calls.riseHand
  packages/calls.compactview
  packages/calls
)

for dir in "${PACKAGES[@]}"; do
  name="$(node -p "require('./$dir/package.json').name")"
  version="$(node -p "require('./$dir/package.json').version")"
  echo ""
  echo ">>> npm publish $name@$version"
  (cd "$dir" && npm publish --access public)
done

echo ""
echo "Готово. Опубликованы все calls-пакеты @0.0.1"
