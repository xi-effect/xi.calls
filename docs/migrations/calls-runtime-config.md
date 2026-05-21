# Миграция: runtime config через провайдер

Env-зависимые настройки ВКС больше **не экспортируются** из `@xipkg/calls-config` (ранее `common.config`).  
Их нужно передавать явно через `CallsRuntimeConfigProvider` из `@xipkg/calls-providers`.

## Зачем

Раньше config-пакет читал переменные окружения на уровне модуля:

```ts
// ❌ Больше не работает
import { serverUrl, isDevMode, devToken } from '@xipkg/calls-config';
import { noiseCancellationFeatureEnabled } from '@xipkg/calls-config';
```

Это мешало публикации calls-пакетов в npm: библиотека не должна знать про `VITE_*` конкретного приложения.

Теперь:

- **calls-пакеты** получают конфиг через React Context
- **приложение** (например `apps/web`) само мапит env → config и передаёт в провайдер

## Что изменилось

### Удалено из `@xipkg/calls-config`

| Было                                                             | Статус                                            |
| ---------------------------------------------------------------- | ------------------------------------------------- |
| `serverUrl`, `serverUrlDev`, `isDevMode`, `devToken`             | Удалено → `CallsRuntimeConfigT.liveKit`           |
| `noiseCancellationFeatureEnabled`, `allowKrispNoiseCancellation` | Удалено → `CallsRuntimeConfigT.noiseCancellation` |
| `src/livekit/config.ts`                                          | Удалён                                            |
| Зависимость от `common.env`                                      | Убрана                                            |

### Осталось в `@xipkg/calls-config`

Статические, не env-зависимые вещи:

- `GRID_CONFIG`, `getGridLayoutsForScreen`, `getOptimalGridLayout`
- `ONBOARDING_IDS`
- `getBaselineAudioCaptureOptions`
- App-слой (`QueryProvider`, axios) — см. [calls-package-rename.md](./calls-package-rename.md)

### Добавлено в `@xipkg/calls-providers`

```ts
type CallsLiveKitConfigT = {
  serverUrl: string;
  serverUrlDev: string;
  isDevMode: boolean;
  devToken?: string;
};

type CallsNoiseCancellationConfigT = {
  featureEnabled: boolean;
  allowKrisp: boolean;
};

type CallsRuntimeConfigT = {
  liveKit: CallsLiveKitConfigT;
  noiseCancellation: CallsNoiseCancellationConfigT;
};
```

Экспорты:

- `CallsRuntimeConfigProvider`
- `useCallsRuntimeConfig()`
- `defaultCallsRuntimeConfig` — дефолты для dev/test

## Как мигрировать приложение

### 1. Оберните дерево calls в провайдер

`CallsRuntimeConfigProvider` должен быть **выше** компонентов, которые используют LiveKit или шумоподавление (`LiveKitProvider`, `useNoiseCancellation`, `Settings` и т.д.).

```tsx
import {
  CallsRuntimeConfigProvider,
  CallsNavigationProvider,
  CallsProvider,
  RoomProvider,
  LiveKitProvider,
} from '@xipkg/calls-providers';

const runtimeConfig: CallsRuntimeConfigT = {
  liveKit: {
    serverUrl: 'wss://livekit.example.com',
    serverUrlDev: 'ws://127.0.0.1:7880',
    isDevMode: false,
  },
  noiseCancellation: {
    featureEnabled: true,
    allowKrisp: true,
  },
};

export const App = () => (
  <CallsRuntimeConfigProvider config={runtimeConfig}>
    <CallsNavigationProvider useNavigation={useNavigation}>
      <CallsProvider deps={callsDeps}>
        <RoomProvider>
          <LiveKitProvider>{children}</LiveKitProvider>
        </RoomProvider>
      </CallsProvider>
    </CallsNavigationProvider>
  </CallsRuntimeConfigProvider>
);
```

### 2. Мапинг env → config (пример для Vite)

В demo-приложении используется хелпер `createCallsRuntimeConfigFromEnv`:

```ts
// apps/web/src/calls/createCallsRuntimeConfig.ts
import type { CallsRuntimeConfigT } from '@xipkg/calls-providers';
import { env } from 'common.env';

export const createCallsRuntimeConfigFromEnv = (): CallsRuntimeConfigT => ({
  liveKit: {
    serverUrl: env.VITE_SERVER_URL_LIVEKIT,
    serverUrlDev: env.VITE_SERVER_URL_LIVEKIT_DEV,
    isDevMode: env.VITE_LIVEKIT_DEV_MODE,
    devToken: env.VITE_LIVEKIT_DEV_TOKEN,
  },
  noiseCancellation: {
    featureEnabled: env.VITE_NOISE_CANCELLATION_FEATURE_ENABLED,
    allowKrisp: env.VITE_ALLOW_KRISP_NOISE_CANCELLATION,
  },
});
```

```tsx
const runtimeConfig = useMemo(() => createCallsRuntimeConfigFromEnv(), []);

<CallsRuntimeConfigProvider config={runtimeConfig}>...</CallsRuntimeConfigProvider>;
```

`common.env` остаётся **только в приложении**, не в calls-библиотеках.

### 3. Замените прямые импорты env из config

| Было                                                                    | Стало                                                   |
| ----------------------------------------------------------------------- | ------------------------------------------------------- |
| `import { isDevMode, devToken } from '@xipkg/calls-config'`             | `const { liveKit } = useCallsRuntimeConfig()`           |
| `import { noiseCancellationFeatureEnabled } from '@xipkg/calls-config'` | `const { noiseCancellation } = useCallsRuntimeConfig()` |
| `import { serverUrl } from '@xipkg/calls-config'`                       | `useCallsRuntimeConfig().liveKit.serverUrl`             |

Хук `useCallsRuntimeConfig()` можно вызывать только внутри `CallsRuntimeConfigProvider`. Без провайдера будет ошибка: `CallsRuntimeConfigProvider is missing`.

### 4. Dev-mode с локальным LiveKit

Если `liveKit.isDevMode === true` и задан `liveKit.devToken`, `LiveKitProvider` подключится к `serverUrlDev` с dev-токеном вместо токена из store.

Пример инициализации в demo:

```tsx
const {
  liveKit: { isDevMode, devToken },
} = useCallsRuntimeConfig();

useEffect(() => {
  if (!isDevMode || !devToken) return;
  useCallStore.getState().updateStore('token', devToken);
}, [isDevMode, devToken]);
```

## Переменные окружения (demo / apps/web)

| Переменная                                | Поле в config                      | По умолчанию          |
| ----------------------------------------- | ---------------------------------- | --------------------- |
| `VITE_SERVER_URL_LIVEKIT`                 | `liveKit.serverUrl`                | —                     |
| `VITE_SERVER_URL_LIVEKIT_DEV`             | `liveKit.serverUrlDev`             | `ws://127.0.0.1:7880` |
| `VITE_LIVEKIT_DEV_MODE`                   | `liveKit.isDevMode`                | `false`               |
| `VITE_LIVEKIT_DEV_TOKEN`                  | `liveKit.devToken`                 | —                     |
| `VITE_NOISE_CANCELLATION_FEATURE_ENABLED` | `noiseCancellation.featureEnabled` | `false`               |
| `VITE_ALLOW_KRISP_NOISE_CANCELLATION`     | `noiseCancellation.allowKrisp`     | `true`                |

## Затронутые пакеты

| Пакет                    | Изменение                                                                         |
| ------------------------ | --------------------------------------------------------------------------------- |
| `@xipkg/calls-providers` | Добавлен `CallsRuntimeConfigProvider`, `LiveKitProvider` читает config из context |
| `@xipkg/calls-hooks`     | `useNoiseCancellation` читает config из context                                   |
| `@xipkg/calls-ui`        | `Settings` читает `featureEnabled` из context                                     |
| `@xipkg/calls-config`    | Убраны env-экспорты и app API-слой                                                |
| `apps/web`               | `CallsDemoShell` + `createCallsRuntimeConfigFromEnv`                              |

## Checklist миграции

- [ ] Убрать импорты `serverUrl`, `isDevMode`, `devToken`, `noiseCancellationFeatureEnabled`, `allowKrispNoiseCancellation` из `@xipkg/calls-config`
- [ ] Добавить `CallsRuntimeConfigProvider` в корень calls-дерева
- [ ] Передать актуальный `CallsRuntimeConfigT` (из env, CMS, remote config и т.д.)
- [ ] Убедиться, что провайдер выше `LiveKitProvider` и любых компонентов с `useNoiseCancellation`
- [ ] Удалить `common.env` из dependencies calls-пакетов (если остался)

## Дальнейшие шаги (npm)

См. также [calls-package-rename.md](./calls-package-rename.md) — переименование `common.types` / `common.config` в npm-пакеты.
