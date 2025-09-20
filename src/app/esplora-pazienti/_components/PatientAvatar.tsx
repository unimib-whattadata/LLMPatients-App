"use client";

import Image from "next/image";
import { useState } from "react";

interface PatientAvatarProps {
  name: string;
  avatarUrl?: string | null;
  avatarType: "photo" | "illustration" | "avatar";
}

/**
 * PatientAvatar Component
 * Enhanced avatar display with loading states and error handling
 */
export function PatientAvatar({ name, avatarUrl, avatarType }: PatientAvatarProps) {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;

  // Generate enhanced placeholder avatar URL based on name
  const getPlaceholderAvatar = () => {
    // Extract initials from name
    const initials = name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);

    // Generate color based on name for consistency
    const hashCode = name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const colors: [string, string][] = [
      ['#1f2937', '#3b82f6'], // Gray to Blue
      ['#374151', '#10b981'], // Gray to Green
      ['#4b5563', '#f59e0b'], // Gray to Amber
      ['#6b7280', '#ef4444'], // Gray to Red
      ['#374151', '#8b5cf6'], // Gray to Purple
      ['#1f2937', '#06b6d4'], // Gray to Cyan
    ];
    
    const colorIndex = Math.abs(hashCode) % colors.length;
    const colorPair = colors[colorIndex] ?? ['#1f2937', '#3b82f6'];
    const [color1, color2] = colorPair;

    // Generate a sophisticated SVG avatar with solid colors and better typography
    const svgData = `
      <svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
        <rect width="192" height="192" fill="${color1}"/>
        <circle cx="96" cy="96" r="80" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2"/>
        <text x="96" y="110" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" 
              font-size="52" font-weight="600" text-anchor="middle" fill="#ffffff" 
              >${initials}</text>
        <circle cx="96" cy="96" r="85" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
      </svg>
    `;

    return `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  const handleImageLoad = () => {
    setImageState('loaded');
  };

  const handleImageError = () => {
    if (retryCount < maxRetries && avatarUrl) {
      // Retry loading the original image
      setRetryCount(prev => prev + 1);
      setTimeout(() => {
        setImageState('loading');
      }, 1000);
    } else {
      // Fall back to placeholder
      setImageState('error');
    }
  };

  const shouldShowPlaceholder = !avatarUrl || imageState === 'error';
  const imageSrc = shouldShowPlaceholder ? getPlaceholderAvatar() : avatarUrl;

  const getBadgeClass = (type: PatientAvatarProps["avatarType"]) => {
    switch (type) {
      case "photo":
        return "patient-avatar-badge patient-avatar-badge--photo";
      case "illustration":
        return "patient-avatar-badge patient-avatar-badge--illustration";
      case "avatar":
        return "patient-avatar-badge patient-avatar-badge--avatar";
      default:
        return "patient-avatar-badge";
    }
  };

  return (
    <div className="patient-avatar-container">
      {/* Loading State */}
      {imageState === 'loading' && !shouldShowPlaceholder && (
        <div className="patient-avatar-loading">
          <div className="loading-spinner" />
        </div>
      )}

      {/* Error State with Retry Option */}
      {imageState === 'error' && retryCount >= maxRetries && avatarUrl && (
        <div className="patient-avatar-error">
          <svg 
            className="w-8 h-8 mb-2" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
            />
          </svg>
          <span className="text-xs text-center">Immagine non disponibile</span>
        </div>
      )}

      {/* Main Image */}
      <Image
        src={imageSrc}
        alt={`Avatar di ${name}`}
        fill
        className={`patient-avatar-image ${
          imageState === 'loaded' ? 'opacity-100' : shouldShowPlaceholder ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority={false}
        unoptimized={shouldShowPlaceholder} // Don't optimize SVG placeholders
      />
      
      {/* Overlay for better contrast */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />
      
      {/* Avatar Type Indicator */}
      <div className="patient-avatar-badge-wrapper">
        <div className={getBadgeClass(avatarType)}>
          {avatarType === "photo" && "📷"}
          {avatarType === "illustration" && "🎨"}
          {avatarType === "avatar" && ""}
        </div>
      </div>
    </div>
  );
}
