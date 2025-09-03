import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((type, text, duration = 2500) => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, type, text }]);
    if (duration > 0) setTimeout(() => remove(id), duration);
    return id;
  }, [remove]);

  const pushAction = useCallback(({ type='info', text, actionText='Undo', onAction, duration = 5000 }) => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, type, text, actionText, onAction }]);
    if (duration > 0) setTimeout(() => remove(id), duration);
    return id;
  }, [remove]);

  const api = useMemo(() => ({
    success: (text, duration) => push('success', text, duration),
    error: (text, duration) => push('error', text, duration),
    info: (text, duration) => push('info', text, duration),
    action: (opts) => pushAction(opts),
    remove,
  }), [push, pushAction, remove]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Container */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1000] flex flex-col gap-2 w-[min(92vw,700px)] px-2">
        {toasts.map((t) => (
          <div
            key={t.id}
              className={`rounded border px-4 py-2 text-sm shadow backdrop-blur bg-white/90 dark:bg-[#1E1E1E]/90 flex items-center justify-between gap-3 ${
              t.type === 'success' ? 'border-green-200 dark:border-green-700 text-green-700 dark:text-green-300' : t.type === 'error' ? 'border-red-200 dark:border-red-700 text-red-700 dark:text-red-300' : 'border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300'
            }`}
            role="status"
            aria-live="polite"
          >
            <span>{t.text}</span>
            {t.actionText && (
              <button
                className="ml-2 px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-xs"
                onClick={() => { try { t.onAction?.(); } finally { remove(t.id); } }}
              >
                {t.actionText}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToastInternal() {
  return useContext(ToastContext);
}
