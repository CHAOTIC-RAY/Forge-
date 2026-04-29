import React, { useState } from 'react';

interface CorsImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackProxy?: boolean;
}

export const CorsImage: React.FC<CorsImageProps> = ({ src, crossOrigin = "anonymous", fallbackProxy = false, onError, ...props }) => {
  const [loadState, setLoadState] = useState<'initial' | 'no-cors' | 'proxy' | 'error'>('initial');

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (loadState === 'initial') {
      // First fallback: remove crossOrigin
      setLoadState('no-cors');
    } else if (loadState === 'no-cors' && fallbackProxy) {
      // Second fallback: use a public CORS proxy
      setLoadState('proxy');
    } else {
      setLoadState('error');
      if (onError) onError(e);
    }
  };

  if (!src) return <img {...props} />;

  let finalSrc = src;
  let finalCrossOrigin = crossOrigin;

  if (loadState === 'no-cors') {
    finalCrossOrigin = undefined;
  } else if (loadState === 'proxy') {
    finalCrossOrigin = "anonymous";
    finalSrc = `https://corsproxy.io/?url=${encodeURIComponent(src)}`;
  }

  return (
    <img 
      src={finalSrc} 
      crossOrigin={finalCrossOrigin as "anonymous" | "use-credentials" | "" | undefined} 
      onError={handleError} 
      {...props} 
    />
  );
};
