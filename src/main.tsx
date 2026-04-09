import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import { PublicCalendarView } from './components/PublicCalendarView';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker
registerSW();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/share/:businessId/:shareToken" element={<PublicCalendarView />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
