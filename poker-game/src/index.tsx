import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const el = document.getElementById('root');
if (el == null) {
  throw new Error('Root element #root not found');
}

const root = createRoot(el);
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);

reportWebVitals();
