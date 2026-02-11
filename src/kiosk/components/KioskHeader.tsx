import { ArrowLeft } from "lucide-react";

interface KioskHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}

export default function KioskHeader({ title, showBack, onBack }: KioskHeaderProps) {
  return (
    <header className="flex items-center gap-4 px-4 py-3 bg-white border-b shrink-0 shadow-sm">
      {showBack && (
        <button
          onClick={onBack}
          className="w-12 h-12 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors text-primary"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      )}
      <div className="flex items-center gap-3 flex-1">
        <img
          src="/images/logo/9Yards-Food-Coloured-favicon.jpg"
          alt="9Yards Food"
          className="w-10 h-10 rounded-lg object-contain"
        />
        <h1 className="text-xl font-bold text-primary">{title}</h1>
      </div>
    </header>
  );
}
