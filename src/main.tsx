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
          <Route path="/share/:businessId/:shareToken" element={<PublicCalendarView />} />
        </Routes>
      </BrowserRouter>
    </Suspense>
  </StrictMode>,
);
