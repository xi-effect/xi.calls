# Локальный link `@xipkg/calls-*` в xi.tutor (вариант A)

Подключение calls-пакетов из соседнего репозитория `xi.calls` через `link:` в `package.json` с HMR.

Предполагаемая структура:

```
xi.effect/
├── xi.calls/          ← этот репозиторий
└── xi.tutor/
    ├── apps/web/
    └── modules/calls/  (или modules.calls/)
```

---

## Что сделать в xi.calls (текущий репозиторий)

Код менять **не нужно** — инфраструктура уже готова:

| Требование                                                       | Статус                                                  |
| ---------------------------------------------------------------- | ------------------------------------------------------- |
| `"development": "./index.ts"` в `exports` всех `packages/calls*` | ✅                                                      |
| CSS subpath exports (`@xipkg/calls-ui/styles.css`, `grid.css`)   | ✅ — в CallsShell импортировать `styles.css`            |
| Эталон Vite для cross-repo link                                  | `docs/migrations/xi-tutor-examples/vite.calls-local.ts` |
| Эталон `link:` dependencies                                      | `docs/migrations/xi-tutor-examples/package.link.json`   |

### Однократно перед первым link в xi.tutor

Сгенерировать `dist/` и `.d.ts` (TypeScript в xi.tutor читает types из dist):

```bash
cd xi.calls
pnpm install
pnpm exec turbo run build --filter='./packages/calls...'
```

После изменений public API в xi.calls — пересобрать затронутые пакеты (HMR в xi.tutor подхватит **runtime** из `index.ts`, но типы обновятся только после build).

### При разработке calls-пакетов

- **`pnpm --filter @xipkg/calls dev` (tsup watch) не нужен** для HMR в xi.tutor — Vite компилирует исходники напрямую.
- tsup watch нужен только если тестируете npm-потребление через `dist/`.

---

## ТЗ для Cursor (xi.tutor)

Скопируйте блок ниже в чат Cursor **в репозитории xi.tutor**.

---

### PROMPT START

Подключи локальные calls-пакеты из соседнего репозитория `xi.calls` через **вариант A** (`link:` в `package.json`) с рабочим HMR в Vite.

**Контекст**

- Репозиторий `xi.calls` лежит рядом: `../xi.calls` относительно корня xi.tutor.
- Calls-пакеты публикуются как `@xipkg/calls-*`; в dev Vite должен резолвить condition `development` → исходники `index.ts`, не `dist/`.
- Эталоны лежат в `../xi.calls/docs/migrations/xi-tutor-examples/` (CallsShell, useCallsDeps, vite config).
- Миграция модуля: `../xi.calls/docs/migrations/xi-tutor-modules-calls.md`.

**Задачи**

#### 1. `modules.calls/package.json` — заменить npm-версии на `link:`

Все `@xipkg/calls-*` зависимости перевести на локальные пути (путь от `modules.calls/` к `xi.calls/packages/`):

```json
{
  "dependencies": {
    "@xipkg/calls": "link:../../xi.calls/packages/calls",
    "@xipkg/calls-chat": "link:../../xi.calls/packages/calls.chat",
    "@xipkg/calls-compactview": "link:../../xi.calls/packages/calls.compactview",
    "@xipkg/calls-config": "link:../../xi.calls/packages/calls.config",
    "@xipkg/calls-hooks": "link:../../xi.calls/packages/calls.hooks",
    "@xipkg/calls-providers": "link:../../xi.calls/packages/calls.providers",
    "@xipkg/calls-risehand": "link:../../xi.calls/packages/calls.risehand",
    "@xipkg/calls-store": "link:../../xi.calls/packages/calls.store",
    "@xipkg/calls-types": "link:../../xi.calls/packages/calls.types",
    "@xipkg/calls-ui": "link:../../xi.calls/packages/calls.ui",
    "@xipkg/calls-utils": "link:../../xi.calls/packages/calls.utils",
    "@livekit/components-styles": "1.1.6"
  }
}
```

Если `modules.calls` лежит не в `modules/calls/`, а в другом пути — пересчитай количество `../` в `link:`.

Удали из `modules.calls` прямые зависимости, которые теперь транзитивно приходят из `@xipkg/calls*` (`livekit-client`, `@livekit/*`, `@dnd-kit/*`, `driver.js` и т.д.), если они не используются в адаптерах модуля.

#### 2. Vite — HMR для linked-пакетов

В `apps/web/vite.config.ts` (или вынеси фрагмент в `vite.calls-local.ts` и импортируй) добавь настройки по образцу `../xi.calls/docs/migrations/xi-tutor-examples/vite.calls-local.ts`:

- `resolve.conditions: ['development', 'import']`
- `resolve.dedupe: ['react', 'react-dom', 'react/jsx-runtime']`
- `optimizeDeps.exclude` — все `@xipkg/calls-*` пакеты
- `server.fs.allow` — путь к `../xi.calls/packages`
- `server.watch.ignored` — `['**/node_modules/**', '!**/node_modules/@xipkg/**']`

Путь к `xi.calls/packages` вычисляй через `path.resolve` от `apps/web/vite.config.ts`.

#### 2.1. Tailwind — сканирование `@xipkg/calls-ui`

Классы Tailwind в calls-пакетах (например кнопка фокуса на плитке) **не попадут в CSS**, пока хост их не сканирует.

В глобальный CSS xi.tutor (Tailwind v4), например `apps/web/src/index.css`:

```css
@import 'tailwindcss';
@source '../../xi.calls/packages/calls.ui/src';
@source '../../xi.calls/packages/calls.compactview/src';
@source '../../xi.calls/packages/calls/src';
@source '../../xi.calls/packages/calls.chat/src';
```

Пути подстрой под расположение `modules.calls` / monorepo. Без `@source` плитки и кнопки фокуса выглядят «сломанными», хотя `grid.css` подключён.

#### 3. TypeScript (опционально, для IDE)

Если после link TypeScript не видит типы — один раз в `xi.calls` выполни:

```bash
pnpm exec turbo run build --filter='./packages/calls...'
```

При необходимости добавь `paths` в `apps/web/tsconfig.json` на `../../xi.calls/packages/*/index.ts` (только для editor; runtime через Vite).

#### 4. Проверка

После `pnpm install` в корне xi.tutor:

1. `pnpm dev` — приложение стартует без ошибок `fs.allow`
2. Измени любой `.tsx` в `../xi.calls/packages/calls.ui/src/` — HMR обновляет страницу с ВКС **без** пересборки tsup
3. В DevTools → Sources импорты `@xipkg/calls-*` ведут на `.ts` в `xi.calls/packages/`, не на `.mjs` из `dist/`

#### 5. Не делать

- Не добавлять `xi.calls` в pnpm-workspace xi.tutor (это вариант B, не нужен)
- Не запускать `tsup --watch` в xi.calls для HMR в xi.tutor
- Не менять `exports` в пакетах xi.calls

**Критерии готовности**

- [ ] `modules.calls/package.json` использует `link:../../xi.calls/packages/...`
- [ ] Vite config содержит `conditions`, `optimizeDeps.exclude`, `fs.allow`, `watch.ignored`
- [ ] `pnpm install` проходит, dev-сервер поднимается
- [ ] HMR работает при правке файла в `xi.calls/packages/calls.ui`

### PROMPT END

---

## Откат на npm

В `modules.calls/package.json` заменить `link:` на версии с registry:

```json
"@xipkg/calls": "^0.0.0"
```

Убрать `optimizeDeps.exclude` для calls-пакетов из Vite (или оставить — не мешает). `pnpm install`.

---

## Troubleshooting

| Симптом                                  | Решение                                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------------------------- |
| HMR не срабатывает при правке в xi.calls | `optimizeDeps.exclude` + `watch.ignored` + перезапуск dev, удалить `node_modules/.vite` |
| `403` / outside allowed list             | расширить `server.fs.allow`                                                             |
| Invalid hook call                        | `resolve.dedupe` для react                                                              |
| Импорт `.mjs` из dist                    | добавить `resolve.conditions: ['development', 'import']`                                |
| TS ошибки типов                          | `turbo build` в xi.calls                                                                |
| Нет скругления / стилей кнопки фокуса    | `@source` на `calls-ui` в Tailwind + `import '@xipkg/calls-ui/styles.css'` в CallsShell |

## Связанные документы

- [xi-tutor-modules-calls.md](./xi-tutor-modules-calls.md) — миграция модуля
- [calls-build.md](./calls-build.md) — сборка и publish
- [xi-tutor-examples/vite.calls-local.ts](./xi-tutor-examples/vite.calls-local.ts)
