import { cn } from '@shared/lib/utils';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
  bgColor?: string;
  fgColor?: string;
}

/**
 * Simple QR Code placeholder component
 * For a real QR Code, install the 'qrcode' package:
 * npm install qrcode @types/qrcode
 */
export function QRCode({
  value,
  size = 200,
  className,
}: QRCodeProps) {
  // Simple visual representation of the order number
  // In production, use 'qrcode' library or a QR code API
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center border-4 border-primary rounded-2xl bg-white p-4',
        className
      )}
      style={{ width: size, height: size }}
    >
      <div className="grid grid-cols-5 gap-1 mb-3">
        {/* Simplified QR-like pattern */}
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

// Fallback component - displays the value as text
export function QRCodeFallback({
  value,
  size = 200,
  className,
}: Omit<QRCodeProps, 'bgColor' | 'fgColor'>) {
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
