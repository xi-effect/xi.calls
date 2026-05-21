# Миграция: переименование `common.*` → `@xipkg/calls-*`

Пакеты `common.types` и `common.config` переименованы для публикации в npm под scope `@xipkg`.

## Переименования

| Было                     | Стало                   | npm                   |
| ------------------------ | ----------------------- | --------------------- |
| `packages/common.types`  | `packages/calls.types`  | `@xipkg/calls-types`  |
| `packages/common.config` | `packages/calls.config` | `@xipkg/calls-config` |

## Импорты

```ts
// ❌ Было
import { StartCallDataT } from 'common.types';
import { ONBOARDING_IDS, GRID_CONFIG } from 'common.config';

// ✅ Стало
import { StartCallDataT } from '@xipkg/calls-types';
import { ONBOARDING_IDS, GRID_CONFIG } from '@xipkg/calls-config';
```

## Зависимости в `package.json`

```json
{
  "dependencies": {
    "@xipkg/calls-types": "*",
    "@xipkg/calls-config": "*"
  }
}
```

## Что убрано из `@xipkg/calls-config`

App-слой (axios, react-query) перенесён в demo-приложение:

| Было в `common.config` | Стало                                 |
| ---------------------- | ------------------------------------- |
| `QueryProvider`        | `apps/web/src/api/query.provider.tsx` |
| `queryClient`          | `apps/web/src/api/query.client.ts`    |
| `getAxiosInstance`     | `apps/web/src/api/axios.instance.ts`  |
| `useFetching`          | `apps/web/src/api/use.fetching.ts`    |

```tsx
// apps/web
import { QueryProvider } from '../api';
```

`@xipkg/calls-config` теперь содержит **только** calls-конфиг без app-зависимостей (axios, react-query).

## Что осталось в `@xipkg/calls-config`

- `GRID_CONFIG`, `getGridLayoutsForScreen`, `getOptimalGridLayout`
- `ONBOARDING_IDS`
- `getBaselineAudioCaptureOptions`

## Что в `@xipkg/calls-types`

- `StartCallDataT`, `ParticipantTypeT`
- `NoiseCancellationMode`, `NOISE_CANCELLATION_MODES`

## Checklist

- [ ] Заменить `common.types` → `@xipkg/calls-types` в imports и dependencies
- [ ] Заменить `common.config` → `@xipkg/calls-config` в imports и dependencies
- [ ] Обновить пути в `tsconfig.json` (`../common.config/` → `../calls.config/`)
- [ ] Перенести `QueryProvider` / API-хелперы в приложение, если использовались из config

## Связанные документы

- [calls-runtime-config.md](./calls-runtime-config.md) — injectable env через `CallsRuntimeConfigProvider`
