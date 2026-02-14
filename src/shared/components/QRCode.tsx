import { cn } from '@shared/lib/utils';
import { useMemo } from 'react';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
  bgColor?: string;
  fgColor?: string;
  /** If true, creates a QR code that links to the order tracking URL */
  asTrackingLink?: boolean;
}

/**
 * QR Code component using QR Server API
 * Falls back to a visual placeholder if the image fails to load
 */
export function QRCode({
  value,
  size = 200,
  className,
  asTrackingLink = false,
}: QRCodeProps) {
  // Generate the QR code content
  const qrContent = useMemo(() => {
    if (asTrackingLink) {
      // Create a tracking URL - in production, use your actual domain
      const baseUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}` 
        : 'https://9yards-kiosk.netlify.app';
      return `${baseUrl}/lookup/${value}`;
    }
    return value;
  }, [value, asTrackingLink]);

  // Use QR Server API for generating QR codes (free, no API key needed)
  const qrImageUrl = useMemo(() => {
    const encodedData = encodeURIComponent(qrContent);
    // QR Server API - generates QR codes for free
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}&format=svg`;
  }, [qrContent, size]);

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center bg-white rounded-2xl overflow-hidden',
        className
      )}
      style={{ width: size + 16, height: size + 16, padding: 8 }}
    >
      <img
        src={qrImageUrl}
        alt={`QR Code for ${value}`}
        width={size}
        height={size}
        className="rounded-lg"
        onError={(e) => {
          // Hide the img and show fallback
          e.currentTarget.style.display = 'none';
          const fallback = e.currentTarget.nextElementSibling;
          if (fallback) (fallback as HTMLElement).style.display = 'flex';
        }}
      />
      {/* Fallback placeholder - hidden by default */}
      <div
        className="flex-col items-center justify-center"
        style={{ display: 'none', width: size, height: size }}
      >
        <div className="grid grid-cols-5 gap-1 mb-3">
          {Array.from({ length: 25 }).map((_, i) => {
            const isCorner = [0, 1, 2, 5, 10, 20, 21, 22, 4, 9, 14, 24].includes(i);
            return (
              <div
                key={i}
                className={cn(
                  'w-3 h-3 rounded-sm',
                  isCorner ? 'bg-primary' : i % 3 === 0 ? 'bg-primary/60' : 'bg-primary/20'
                )}
              />
            );
          })}
        </div>
        <p className="text-lg font-bold text-primary tracking-wider">{value}</p>
      </div>
    </div>
  );
}

// Fallback component - displays a static QR-like pattern with the value
export function QRCodeFallback({
  value,
  size = 200,
  className,
  asTrackingLink = false,
}: Omit<QRCodeProps, 'bgColor' | 'fgColor'>) {
  // For tracking QR codes, also use the API
  if (asTrackingLink) {
    return <QRCode value={value} size={size} className={className} asTrackingLink />;
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center border-4 border-primary rounded-2xl bg-white p-4',
        className
      )}
      style={{ width: size, height: size }}
    >
      {/* QR-like pattern placeholder */}
      <div className="grid grid-cols-5 gap-1 mb-3">
        {Array.from({ length: 25 }).map((_, i) => {
          const isCorner = [0, 1, 2, 5, 10, 20, 21, 22, 4, 9, 14, 24].includes(i);
          return (
            <div
              key={i}
              className={cn(
                'w-3 h-3 rounded-sm',
                isCorner ? 'bg-primary' : i % 3 === 0 ? 'bg-primary/60' : 'bg-primary/20'
              )}
            />
          );
        })}
      </div>
      <p className="text-lg font-bold text-primary tracking-wider">
        {value}
      </p>
    </div>
  );
}

export default QRCode;
