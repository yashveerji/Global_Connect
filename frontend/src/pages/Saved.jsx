import React, { useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { authDataContext } from '../context/AuthContext';
import Post from '../components/Post';
import { FiClock, FiMapPin, FiBookmark } from 'react-icons/fi';

export default function Saved() {
  const { serverUrl } = useContext(authDataContext);
  const [items, setItems] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'jobs'
  const [savedJobIds, setSavedJobIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('saved_jobs') || '[]'); } catch { return []; }
  });
  const [loadingJobs, setLoadingJobs] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(serverUrl + '/api/post/saved', { withCredentials: true });
        setItems(res.data || []);
      } catch (e) { setItems([]); }
    })();
  }, [serverUrl]);

  useEffect(() => {
    (async () => {
      try {
        setLoadingJobs(true);
        const res = await axios.get(serverUrl + '/api/jobs', { withCredentials: true });
        setJobs(Array.isArray(res.data) ? res.data : []);
      } catch (e) { setJobs([]); }
      finally { setLoadingJobs(false); }
    })();
  }, [serverUrl]);

  const savedJobs = useMemo(() => {
    const set = new Set(savedJobIds || []);
    return (jobs || []).filter(j => set.has(j._id));
  }, [jobs, savedJobIds]);

  const timeAgo = (d) => {
    const dt = new Date(d);
    const diff = Math.floor((Date.now() - dt.getTime())/1000);
    if (diff < 60) return `${diff}s ago`;
    const m = Math.floor(diff/60); if (m < 60) return `${m}m ago`;
    const h = Math.floor(m/60); if (h < 24) return `${h}h ago`;
    const days = Math.floor(h/24); return `${days}d ago`;
  };

  const toggleSaveJob = (id) => {
    setSavedJobIds(prev => {
      const set = new Set(prev || []);
      if (set.has(id)) set.delete(id); else set.add(id);
      const arr = Array.from(set);
      try { localStorage.setItem('saved_jobs', JSON.stringify(arr)); } catch {}
      return arr;
    });
  };

  return (
  <div className="w-full min-h-screen px-4 py-6 animate-fade-in">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Saved</h1>
          <div className="inline-flex items-center gap-2 text-xs">
            <span className="text-gray-600 dark:text-[var(--gc-muted)]">Posts</span>
            <span className="px-2 py-0.5 rounded-full border border-gray-200 dark:border-[var(--gc-border)] bg-white dark:bg-[var(--gc-surface)] text-gray-700 dark:text-[var(--gc-text)]">{items.length}</span>
            <span className="ml-2 text-gray-600 dark:text-[var(--gc-muted)]">Jobs</span>
            <span className="px-2 py-0.5 rounded-full border border-gray-200 dark:border-[var(--gc-border)] bg-white dark:bg-[var(--gc-surface)] text-gray-700 dark:text-[var(--gc-text)]">{savedJobs.length}</span>
          </div>
        </div>
        {/* Tabs */}
        <div className="card mb-5 animate-scale-in">
          <div className="flex items-center gap-2">
            <button
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition border ${activeTab === 'posts' ? 'text-white shadow' : 'text-gray-800 dark:text-[var(--gc-text)] bg-transparent'} `}
              style={activeTab === 'posts' ? { background: 'var(--gc-primary)', borderColor: 'var(--gc-primary)' } : { borderColor: 'var(--gc-border)' }}
              onClick={() => setActiveTab('posts')}
            >
              Saved Posts
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition border ${activeTab === 'jobs' ? 'text-white shadow' : 'text-gray-800 dark:text-[var(--gc-text)] bg-transparent'} `}
              style={activeTab === 'jobs' ? { background: 'var(--gc-primary)', borderColor: 'var(--gc-primary)' } : { borderColor: 'var(--gc-border)' }}
              onClick={() => setActiveTab('jobs')}
            >
              Saved Jobs
            </button>
          </div>
        </div>

        {activeTab === 'posts' && (
          <div className="card animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Saved Posts</h2>
              <span className="text-sm text-gray-600 dark:text-[var(--gc-muted)]">{items.length}</span>
            </div>
            <div className="flex flex-col gap-5 max-w-2xl mx-auto">
              {items.length === 0 && (
                <div className="text-gray-600 dark:text-[var(--gc-muted)] text-center py-6">No saved posts</div>
              )}
              {items.map((p) => (
                <div key={p._id}>
                  <Post {...p} />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="card animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Saved Jobs</h2>
              <span className="text-sm text-gray-600 dark:text-[var(--gc-muted)]">{savedJobs.length}</span>
            </div>
            {loadingJobs ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="card animate-pulse">
                    <div className="p-5">
                      <div className="h-5 w-2/3 bg-gray-200 dark:bg-[#2C2F36] rounded mb-3" />
                      <div className="h-4 w-1/2 bg-gray-200 dark:bg-[#2C2F36] rounded mb-2" />
                      <div className="h-4 w-full bg-gray-200 dark:bg-[#2C2F36] rounded mb-2" />
                      <div className="h-4 w-5/6 bg-gray-200 dark:bg-[#2C2F36] rounded mb-4" />
                      <div className="h-8 w-24 bg-gray-200 dark:bg-[#2C2F36] rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : savedJobs.length === 0 ? (
              <div className="text-gray-600 dark:text-[var(--gc-muted)] text-center py-6">No saved jobs</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {savedJobs.map(job => (
                  <div key={job._id} className="card flex flex-col gap-3 p-5 animate-fade-in hover-lift">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-200 to-blue-400 text-blue-900 grid place-items-center text-xs font-bold flex-shrink-0">
                          {(job.company || 'C').slice(0,2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-lg font-semibold truncate" title={job.title}>{job.title}</h3>
                          <div className="text-sm text-gray-600 dark:text-[var(--gc-muted)] truncate" title={job.company}>{job.company}</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-[var(--gc-muted)] inline-flex items-center gap-1"><FiClock/>{timeAgo(job.datePosted)}</div>
                    </div>
                    <div className="text-sm text-gray-800 dark:text-[var(--gc-text)]/90 line-clamp-3 min-h-[60px] break-words">{job.description}</div>
                    <div className="text-xs text-gray-600 dark:text-[var(--gc-muted)] inline-flex items-center gap-1 truncate" title={job.location}><FiMapPin/>{job.location}</div>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <button className="btn-secondary inline-flex items-center gap-1" onClick={() => toggleSaveJob(job._id)}>
                        <FiBookmark/> Unsave
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
