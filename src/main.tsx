import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initZoomPrevention } from './utils/disableZoom';

// Prevent page zoom across all browsers & devices
initZoomPrevention();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
