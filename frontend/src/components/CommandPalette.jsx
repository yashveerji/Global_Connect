import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { IoSearch } from 'react-icons/io5';
import { authDataContext } from '../context/AuthContext';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(0);
  const ref = useRef(null);
  const { serverUrl } = React.useContext(authDataContext);
  const navigate = useNavigate();
  const timer = useRef();
  const cache = useRef(new Map());

  const fetchItems = useCallback(async (term) => {
    if (!term) { setItems([]); return; }
    if (cache.current.has(term)) { setItems(cache.current.get(term)); return; }
    try {
      const res = await axios.get(`${serverUrl}/api/user/search`, { params: { query: term }, withCredentials: true });
      const data = Array.isArray(res.data) ? res.data : [];
      cache.current.set(term, data);
      setItems(data);
      setActive(data.length ? 0 : -1);
    } catch { setItems([]); }
  }, [serverUrl]);

  useEffect(() => {
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fetchItems(q), 350);
    return () => clearTimeout(timer.current);
  }, [q, open, fetchItems]);

  useEffect(() => {
    const onClick = (e) => { if (open && ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      const it = items[active];
      if (it?.userName) {
        setOpen(false);
        navigate(`/profile/${it.userName}`);
      }
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1400] bg-black/30 animate-fadeIn" onKeyDown={onKeyDown}>
      <div ref={ref} className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[min(92vw,700px)] card p-3">
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-[var(--gc-border)] pb-2">
          <IoSearch className="text-gray-500" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people or type a command…"
            className="input flex-1 border-none shadow-none focus:ring-0"
            aria-label="Command palette"
          />
        </div>
        <div role="listbox" className="max-h-[50vh] overflow-auto mt-2">
          {items.map((it, idx) => (
            <div
              key={it._id}
              role="option"
              aria-selected={idx === active}
              className={`flex items-center gap-3 px-2 py-2 rounded cursor-pointer ${idx === active ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-900'}`}
              onMouseEnter={() => setActive(idx)}
              onClick={() => { setOpen(false); navigate(`/profile/${it.userName}`); }}
            >
              <img src={it.profileImage} alt="" className="w-8 h-8 rounded-full object-cover" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 dark:text-white truncate">{it.firstName} {it.lastName}</div>
                {it.userName && <div className="text-xs text-gray-500 truncate">@{it.userName}</div>}
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="text-sm text-gray-500 px-2 py-4">No results</div>
          )}
        </div>
        <div className="mt-2 text-xs text-gray-500">Tip: Press Esc to close</div>
      </div>
    </div>
  );
}
