
"use client";

import { useEffect } from "react";

interface ImagePreloaderProps {
  images: Array<{
    src: string;
    webpSrc?: string;
    sizes?: string;
    media?: string;
  }>;
}

export function ImagePreloader({ images }: ImagePreloaderProps) {
  useEffect(() => {
    
    const supportsWebP = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    })();

    images.forEach(({ src, webpSrc, sizes, media }) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      
      
      link.href = (supportsWebP && webpSrc) ? webpSrc : src;
      
      if (sizes) {
        link.setAttribute('imagesizes', sizes);
      }
      
      if (media) {
        link.media = media;
      }
      
      
      document.head.appendChild(link);
    });

    
    return () => {
      const preloadLinks = document.querySelectorAll('link[rel="preload"][as="image"]');
      preloadLinks.forEach(link => {
        if (document.head.contains(link)) {
          document.head.removeChild(link);
        }
      });
    };
  }, [images]);

  return null; 
}

export const CRITICAL_IMAGES = [
  {
    src: '/images/home/hero2.png',
    sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1440px',
    media: '(min-width: 1px)',
  },
  {
    src: '/images/logo.png',
    webpSrc: '/images/logo.webp',
    sizes: '48px',
  },
];
