import {StrictMode, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import { SharedCalendarView } from './components/SharedCalendarView';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker (Production only to avoid dev 429s)
if ((import.meta as any).env?.PROD) {
  registerSW();
}

// Global Image Error Handler (CORS fallback mechanism)
window.addEventListener('error', (e) => {
  const target = e.target as HTMLElement;
  if (target && target.tagName === 'IMG') {
    const imgElement = target as HTMLImageElement;
    if (!imgElement.dataset.corsFallback) {
      // First fallback: remove crossOrigin flag which might be blocking load
      imgElement.dataset.corsFallback = '1';
      imgElement.removeAttribute('crossOrigin');
      // Instead of immediate reload, we just set the src again once
      const oldSrc = imgElement.src;
      if (oldSrc) {
        imgElement.src = oldSrc; 
      }
    } else if (imgElement.dataset.corsFallback === '1') {
      // Second fallback: use cors proxy
      imgElement.dataset.corsFallback = '2';
      if (!imgElement.dataset.originalSrc) {
        imgElement.dataset.originalSrc = imgElement.src;
      }
      if (imgElement.dataset.originalSrc) {
        imgElement.src = `https://corsproxy.io/?url=${encodeURIComponent(imgElement.dataset.originalSrc)}`;
      }
    }
  }
}, true);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-[#191919] flex items-center justify-center">
        <div className="animate-pulse w-12 h-12 rounded-full bg-blue-500/50"></div>
      </div>
    }>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/s/:shortCode" element={<App />} />
          <Route path="/share/:businessId/:shareToken" element={<SharedCalendarView />} />
        </Routes>
      </BrowserRouter>
    </Suspense>
  </StrictMode>,
);
