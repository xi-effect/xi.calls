import ReactDOM from 'react-dom/client';
import './index.css';
import { AppProviders } from './providers';
import { i18nInitPromise } from './config/i18n';

// Инициализируем GlitchTip как можно раньше (опционально)
// Раскомментируйте, если используете мониторинг ошибок
// initGlitchTip();

const rootElement = document.getElementById('root')!;
const root = ReactDOM.createRoot(rootElement);

void i18nInitPromise.then(() => {
  root.render(<AppProviders />);
});
