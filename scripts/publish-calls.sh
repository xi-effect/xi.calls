#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! pnpm whoami >/dev/null 2>&1; then
  echo "Ошибка: не авторизованы в npm. Выполните: npm login"
  exit 1
fi

PACKAGES=(
  packages/calls.types
  packages/calls.config
  packages/calls.utils
  packages/calls.store
  packages/calls.providers
  packages/calls.hooks
  packages/calls.ui
  packages/calls.chat
  packages/calls.risehand
  packages/calls.compactview
  packages/calls
)

echo "Сборка calls-пакетов (последовательно, в порядке зависимостей)..."
for dir in "${PACKAGES[@]}"; do
  name="$(node -p "require('./$dir/package.json').name")"
  echo "  build $name"
  (cd "$dir" && pnpm build)
done

for dir in "${PACKAGES[@]}"; do
  name="$(node -p "require('./$dir/package.json').name")"
  version="$(node -p "require('./$dir/package.json').version")"
  echo ""
  echo ">>> pnpm publish $name@$version"
  (cd "$dir" && pnpm publish --access public --no-git-checks)
done

echo ""
echo "Готово. Опубликованы все calls-пакеты."
