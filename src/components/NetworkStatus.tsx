import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const NetworkStatus: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] flex justify-center pt-2 pointer-events-none"
        >
          <div className="bg-yellow-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-bold">
            <WifiOff className="w-4 h-4" />
            <span>You are offline. Some features (AI, Uploads) may be unavailable.</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
