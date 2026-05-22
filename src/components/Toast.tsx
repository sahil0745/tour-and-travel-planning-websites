import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

const ICONS: Record<ToastType, any> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS: Record<ToastType, string> = {
  success: "var(--color-success)",
  error: "var(--color-error)",
  warning: "var(--color-warning)",
  info: "var(--color-teal)",
};

let _addToast: ((msg: string, type: ToastType) => void) | null = null;

/** Call from anywhere: showToast("message", "error") */
export function showToast(message: string, type: ToastType = "error") {
  if (_addToast) _addToast(message, type);
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  useEffect(() => { _addToast = addToast; return () => { _addToast = null; }; }, [addToast]);

  return (
    <div className="fixed top-20 right-4 z-[200] flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 80, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.9 }}
              className="glass-card rounded-2xl p-4 flex items-start gap-3 pointer-events-auto shadow-lg"
              style={{ borderLeft: `3px solid ${COLORS[toast.type]}` }}
            >
              <Icon className="w-5 h-5 shrink-0 mt-0.5" style={{ color: COLORS[toast.type] }} />
              <p className="text-sm flex-1">{toast.message}</p>
              <button onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="p-1 rounded-full hover:bg-white/10 transition-colors shrink-0">
                <X className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
