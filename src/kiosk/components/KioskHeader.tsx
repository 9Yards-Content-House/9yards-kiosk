import { ArrowLeft } from "lucide-react";

interface KioskHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}

export default function KioskHeader({ title, showBack, onBack }: KioskHeaderProps) {
  return (
    <header className="flex items-center gap-4 px-4 py-3 bg-card border-b shrink-0">
      {showBack && (
        <button
          onClick={onBack}
          className="w-12 h-12 flex items-center justify-center rounded-xl bg-muted hover:bg-muted/80 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      )}
      <div className="flex items-center gap-3 flex-1">
        <span className="text-xl font-bold text-yards-orange">9Y</span>
        <h1 className="text-xl font-bold">{title}</h1>
      </div>
    </header>
  );
}
