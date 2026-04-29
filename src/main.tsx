import {StrictMode, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import { PublicCalendarView } from './components/PublicCalendarView';
import { ForgeLoader } from './components/ForgeLoader';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker
registerSW();

// Global Image Error Handler (CORS fallback mechanism)
window.addEventListener('error', (e) => {
  const target = e.target as HTMLElement;
  if (target && target.tagName === 'IMG') {
    const imgElement = target as HTMLImageElement;
    if (!imgElement.dataset.corsFallback) {
      // First fallback: remove crossOrigin flag which might be blocking load
      imgElement.dataset.corsFallback = '1';
      imgElement.removeAttribute('crossOrigin');
      const oldSrc = imgElement.src;
      imgElement.src = '';
      imgElement.src = oldSrc; // trigger reload
    } else if (imgElement.dataset.corsFallback === '1') {
      // Second fallback: use cors proxy
      imgElement.dataset.corsFallback = '2';
      // Store original src
      if (!imgElement.dataset.originalSrc) {
        imgElement.dataset.originalSrc = imgElement.src;
      }
      imgElement.src = `https://corsproxy.io/?url=${encodeURIComponent(imgElement.dataset.originalSrc)}`;
    }
  }
}, true);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-[#191919] flex items-center justify-center">
        <ForgeLoader size={48} />
      </div>
    }>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/s/:shortCode" element={<App />} />
          <Route path="/share/:businessId/:shareToken" element={<PublicCalendarView />} />
        </Routes>
      </BrowserRouter>
    </Suspense>
  </StrictMode>,
);
