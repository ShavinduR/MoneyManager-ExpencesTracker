import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { usePwaUpdate } from './components/layout/pwaUpdate';
import './styles/index.css';

// 'prompt' mode: a new version is announced, never applied mid-edit (L11).
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh: () => usePwaUpdate.setState({ needRefresh: true }),
});
usePwaUpdate.setState({ applyUpdate: () => updateSW(true) });

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
