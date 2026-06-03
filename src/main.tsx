import {StrictMode, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import { SharedCalendarView } from './components/SharedCalendarView.tsx';
import { ForgeLoader } from './components/ForgeLoader';
import './index.css';

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
        <ForgeLoader size={48} />
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
