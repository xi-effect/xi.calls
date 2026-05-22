# Сборка @xipkg/calls-\* (tsup)

Пакеты calls собираются в `dist/` через [tsup](https://tsup.egoist.dev/) — по той же схеме, что и `@xipkg/*` в xi.kit.

## Структура

```
tsup.calls.base.ts          # общие настройки
packages/calls.*/tsup.config.ts
packages/calls.*/dist/
  index.mjs
  index.d.ts
  index.mjs.map
```

## Команды

```bash
# все calls-пакеты (с учётом порядка зависимостей через turbo)
pnpm run build -- --filter='./packages/calls*'

# один пакет
pnpm --filter @xipkg/calls-hooks build

# watch при разработке пакета
pnpm --filter @xipkg/calls-hooks dev
```

## exports в package.json

```json
{
  "main": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "exports": {
    ".": {
      "development": "./index.ts",
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "default": "./dist/index.mjs"
    }
  }
}
```

- **`development`** — Vite в dev-режиме берёт исходники (`index.ts`) для HMR без пересборки
- **`import` / `default`** — npm-потребители и production получают `dist/`

`@xipkg/calls-ui` дополнительно публикует CSS:

```json
"./video-security.css": "./src/styles/video-security.css",
"./driver.css": "./src/styles/driver.css"
```

## npm publish

Перед публикацией CI (или локально) запускает `pnpm run build`. В npm уходит только `dist/` (+ CSS для ui).

`publishConfig.access: public` уже прописан во всех calls-пакетах.

## CI (GitHub Actions)

Workflow `front-production.yml` при пуше в `main`:

1. Определяет изменённые `packages/calls*` через path filter
2. `pnpm install --frozen-lockfile`
3. `turbo run build --filter='./packages/calls...'` — полный граф зависимостей
4. Публикует **только изменённые** пакеты **последовательно** (types → config → … → calls) через `npm publish --provenance`

Trusted publishing: workflow `front-production.yml`, environment `xi-production`. Настройте на [npmjs.com](https://www.npmjs.com/) для каждого пакета.

Перед publish нужно **поднять version** в `package.json` — npm вернёт `409`, если версия уже есть.

## Первый ручной publish

```bash
npm login
./scripts/publish-calls-all.sh --dry-run   # проверка без загрузки
./scripts/publish-calls-all.sh             # build + publish всех 11 пакетов
```

Опции: `--skip-build`, `--yes` (без подтверждения).

## Замечания

- Зависимости (`@xipkg/*`, `livekit-client`, `react` и т.д.) **не бандлятся** — `esbuildOptions.packages = 'external'`
- Не импортируйте свой же пакет по npm-имени внутри исходников (см. fix в `calls.chat/ChatButton.tsx`)
- Типы, используемые в public API, должны быть экспортированы (например `GridLayoutConfig` из `@xipkg/calls-config`)
