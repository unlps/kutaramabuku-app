import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDownCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DownloadAnimationProps {
  isDownloading: boolean;
  onComplete?: () => void;
}

export const DownloadAnimation = ({ isDownloading, onComplete }: DownloadAnimationProps) => {
  const [phase, setPhase] = useState<"idle" | "enter" | "exit">("idle");
  const [targetRect, setTargetRect] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (isDownloading) {
      // Começar no centro
      setPhase("enter");
      
      // Encontrar onde está o sino de notificações
      const navItem = document.getElementById("nav-notifications");
      if (navItem) {
        const rect = navItem.getBoundingClientRect();
        // Centro do ícone aproximadamente
        setTargetRect({ 
          top: rect.top + rect.height / 2, 
          left: rect.left + rect.width / 2 
        });
      }

      // Após 1.5s, voar para o sino (fase exit)
      const flyTimer = setTimeout(() => setPhase("exit"), 1500);

      // Após o voo, desmontar
      const completeTimer = setTimeout(() => {
        setPhase("idle");
        if (onComplete) onComplete();
      }, 2300);

      return () => {
        clearTimeout(flyTimer);
        clearTimeout(completeTimer);
      };
    }
  }, [isDownloading, onComplete]);

  if (phase === "idle") return null;

  const isExit = phase === "exit";
  const hasTarget = !!targetRect;

  // Se houver um target, o 'left' e 'top' vão para lá. Se não houver, afunda no centro para baixo.
  const style: React.CSSProperties = {
    position: "fixed",
    zIndex: 100,
    transition: isExit ? "all 0.8s cubic-bezier(0.5, 0, 0.2, 1)" : "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
    
    // Entrando: centrado, Scale normal, Opacity total
    // Saindo: Posição do sino, Scale pequeno, Opacity 0
    top: isExit && hasTarget ? targetRect.top : "50%",
    left: isExit && hasTarget ? targetRect.left : "50%",
    transform: isExit 
      ? hasTarget 
        ? "translate(-50%, -50%) scale(0.1)" 
        : "translate(-50%, 150px) scale(0.5)" 
      : "translate(-50%, -50%) scale(1)",
    opacity: isExit ? 0 : 1,
  };

  return createPortal(
    <>
      {/* Background fade */}
      <div 
        className={cn(
          "fixed inset-0 z-[90] pointer-events-none bg-background/20 backdrop-blur-[2px] transition-opacity duration-500",
          isExit ? "opacity-0" : "opacity-100"
        )}
      />
      
      {/* Icon que voa */}
      <div 
        style={style}
        className={cn(
          "w-24 h-24 bg-card/90 backdrop-blur-md rounded-full shadow-2xl flex items-center justify-center border border-primary/20 text-primary",
          phase === "enter" && "animate-in fade-in zoom-in-50 duration-500 slide-in-from-top-12"
        )}
      >
        <ArrowDownCircle className="w-12 h-12" strokeWidth={1.5} />
      </div>
    </>,
    document.body
  );
};
