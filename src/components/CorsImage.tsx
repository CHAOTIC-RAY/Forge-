import React, { useState, useEffect } from 'react';

export function CorsImage({ src, alt, fallbackProxy, className, ...props }: any) {
  const [imgSrc, setImgSrc] = useState(src);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    setImgSrc(src);
    setErrorCount(0);
  }, [src]);

  const handleError = () => {
    if (errorCount === 0 && fallbackProxy && src && !src.startsWith('data:')) {
      setImgSrc(`https://images.weserv.nl/?url=${encodeURIComponent(src)}`);
      setErrorCount(1);
    } else {
      setImgSrc(`https://ui-avatars.com/api/?name=${encodeURIComponent(alt || 'Av')}&background=random`);
      setErrorCount(2);
    }
  };

  return (
    <img 
      src={imgSrc} 
      alt={alt || ''} 
      className={className} 
      onError={handleError} 
      referrerPolicy="no-referrer"
      {...props} 
    />
  );
}
export default CorsImage;
