import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDownCircle } from "lucide-react";

interface DownloadAnimationProps {
  isDownloading: boolean;
  onComplete?: () => void;
}

export const DownloadAnimation = ({ isDownloading, onComplete }: DownloadAnimationProps) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isDownloading) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        if (onComplete) onComplete();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isDownloading, onComplete]);

  if (!show) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none bg-background/20 backdrop-blur-[2px] transition-all duration-500">
      <div 
        className="w-24 h-24 bg-card/90 backdrop-blur-md rounded-full shadow-2xl flex items-center justify-center border border-primary/20 text-primary animate-slide-down-fade"
      >
        <ArrowDownCircle className="w-12 h-12" strokeWidth={1.5} />
      </div>
    </div>,
    document.body
  );
};
