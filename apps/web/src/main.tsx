import ReactDOM from 'react-dom/client';
import './index.css';
import { AppProviders } from './providers';

// Инициализируем GlitchTip как можно раньше (опционально)
// Раскомментируйте, если используете мониторинг ошибок
// initGlitchTip();

// Ждем инициализации i18n перед рендерингом приложения
const rootElement = document.getElementById('root')!;
const root = ReactDOM.createRoot(rootElement);
root.render(<AppProviders />);
