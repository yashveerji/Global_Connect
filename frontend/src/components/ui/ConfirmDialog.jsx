import React, { createContext, useCallback, useContext, useState } from 'react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState({ title: 'Confirm', message: 'Are you sure?', confirmText: 'Confirm', cancelText: 'Cancel' });
  const [resolver, setResolver] = useState(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setResolver(() => resolve);
      setOpts({
        title: options?.title || 'Confirm',
        message: options?.message || 'Are you sure?',
        confirmText: options?.confirmText || 'Confirm',
        cancelText: options?.cancelText || 'Cancel',
      });
      setOpen(true);
    });
  }, []);

  const handleCancel = () => {
    setOpen(false);
    if (resolver) { try { resolver(false); } catch {} }
    setResolver(null);
  };
  const handleOk = () => {
    setOpen(false);
    if (resolver) { try { resolver(true); } catch {} }
    setResolver(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {open && (
  <div className="fixed inset-0 z-[1000] grid place-items-center bg-black/40">
          <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2F36] rounded shadow-lg w-[min(92vw,420px)] p-5">
            <div className="text-lg font-semibold mb-1 text-gray-800 dark:text-white">{opts.title}</div>
            <div className="text-sm text-gray-700 dark:text-white/90 mb-4">{opts.message}</div>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-1.5 rounded border border-gray-300 dark:border-[#2C2F36] text-gray-700 dark:text-white bg-white dark:bg-[#1E1E1E] hover:bg-gray-50 dark:hover:bg-[#161616]" onClick={handleCancel}>{opts.cancelText}</button>
              <button className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white" onClick={handleOk}>{opts.confirmText}</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
}
