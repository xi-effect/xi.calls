# @xipkg/calls-providers

React-провайдеры для интеграции ВКС: навигация, сессия, LiveKit, порты приложения.

## Runtime config

Env-зависимые настройки (LiveKit URL, dev-mode, feature flags шумоподавления) передаются через `CallsRuntimeConfigProvider`.

```tsx
import {
  CallsRuntimeConfigProvider,
  LiveKitProvider,
  type CallsRuntimeConfigT,
} from '@xipkg/calls-providers';

<CallsRuntimeConfigProvider config={runtimeConfig}>
  <LiveKitProvider>{children}</LiveKitProvider>
</CallsRuntimeConfigProvider>;
```

Подробнее: [docs/migrations/calls-runtime-config.md](../../docs/migrations/calls-runtime-config.md)
