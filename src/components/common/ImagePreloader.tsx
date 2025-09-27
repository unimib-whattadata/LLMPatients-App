/**
 * ImagePreloader Component
 * 
 * Preloads critical images for better LCP performance.
 * Uses modern preload techniques with WebP support detection.
 */

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
    // Check if browser supports WebP
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
      
      // Use WebP if supported, otherwise fallback to original
      link.href = (supportsWebP && webpSrc) ? webpSrc : src;
      
      if (sizes) {
        link.setAttribute('imagesizes', sizes);
      }
      
      if (media) {
        link.media = media;
      }
      
      // Add to document head
      document.head.appendChild(link);
    });

    // Cleanup function to remove preload links
    return () => {
      const preloadLinks = document.querySelectorAll('link[rel="preload"][as="image"]');
      preloadLinks.forEach(link => {
        if (document.head.contains(link)) {
          document.head.removeChild(link);
        }
      });
    };
  }, [images]);

  return null; // This component doesn't render anything
}

/**
 * Critical images that should be preloaded
 */
export const CRITICAL_IMAGES = [
  {
    src: '/images/home/hero.png',
    webpSrc: '/images/home/hero.webp',
    sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1440px',
    media: '(min-width: 1px)',
  },
  {
    src: '/images/logo.png',
    webpSrc: '/images/logo.webp',
    sizes: '48px',
  },
];
