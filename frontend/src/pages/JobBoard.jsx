import React, { useEffect, useState, useContext, useMemo } from "react";
import { userDataContext } from "../context/UserContext";
import { authDataContext } from "../context/AuthContext";
import axios from "axios";
import Nav from "../components/Nav";
import { useConfirm } from "../components/ui/ConfirmDialog";
import { useToastInternal } from "../components/ui/ToastProvider";
import { FiSearch, FiMapPin, FiBriefcase, FiPlus, FiEdit2, FiTrash2, FiClock, FiBookmark, FiX, FiUser } from "react-icons/fi";


function Jobs() {
  const { userData } = useContext(userDataContext);
  const { serverUrl } = useContext(authDataContext);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLoc, setFilterLoc] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [showJobModal, setShowJobModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [apps, setApps] = useState([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState("");
  const [applicantName, setApplicantName] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [applicantMessage, setApplicantMessage] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeUrl, setResumeUrl] = useState("");
  const confirm = useConfirm?.();
  const toast = useToastInternal?.();
  const [myOnly, setMyOnly] = useState(false);
  const [saved, setSaved] = useState(() => {
    try { return JSON.parse(localStorage.getItem('saved_jobs')||'[]'); } catch { return []; }
  });
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Fetch jobs
  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`${serverUrl}/api/jobs`, { withCredentials: true });
      setJobs(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error(error.response ? error.response.data : error.message);
      setError("Failed to load jobs");
    }
    finally { setLoading(false); }
  };

  // Add or Edit job
  const handleJobSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !company.trim() || !description.trim() || !location.trim()) {
      toast?.error("All fields are required");
      return;
    }
    try {
      if (isEditMode && selectedJob) {
        await axios.put(`${serverUrl}/api/jobs/edit/${selectedJob._id}`, {
          title,
          company,
          description,
          location,
        }, { withCredentials: true });
        toast?.success("Job updated");
      } else {
        await axios.post(`${serverUrl}/api/jobs/add`, {
          title,
          company,
          description,
          location,
        }, { withCredentials: true });
        toast?.success("Job added");
      }
      setTitle("");
      setCompany("");
      setDescription("");
      setLocation("");
      setShowJobModal(false);
      setIsEditMode(false);
      setSelectedJob(null);
      fetchJobs();
    } catch (error) {
      console.error(error.response ? error.response.data : error.message);
      toast?.error("Failed to save job");
    }
  };

  // Open edit modal
  const openEditModal = (job) => {
    setSelectedJob(job);
    setTitle(job.title);
    setCompany(job.company);
    setDescription(job.description);
    setLocation(job.location);
    setIsEditMode(true);
    setShowJobModal(true);
  };

  const openDetails = (job) => {
    setSelectedJob(job);
    setDetailsOpen(true);
  // If owner, fetch applications lazily
  const isOwner = userData && job.createdBy && (job.createdBy._id === userData._id);
  if (isOwner) fetchApplications(job._id);
  };

  // Open apply modal
  const openApplyModal = (job) => {
    setSelectedJob(job);
    setShowApplyModal(true);
  };

  // Apply to job -> send to backend
  const applyJob = async (e) => {
    e.preventDefault();
    if (!selectedJob) return;
    try {
      // Upload resume if selected and not yet uploaded
      let uploaded = resumeUrl;
      if (resumeFile && !uploaded) {
        setResumeUploading(true);
        const form = new FormData();
        form.append('file', resumeFile);
        const up = await axios.post(`${serverUrl}/api/upload/attachment`, form, { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } });
        uploaded = up.data?.url || "";
        setResumeUrl(uploaded);
        setResumeUploading(false);
      }

      await axios.post(`${serverUrl}/api/jobs/${selectedJob._id}/apply`, {
        name: applicantName,
        email: applicantEmail,
        message: applicantMessage,
        resumeUrl: uploaded,
        resumeName: resumeFile?.name || undefined,
        resumeMime: resumeFile?.type || undefined,
        resumeSize: resumeFile?.size || undefined,
      }, { withCredentials: true });
      toast?.success("Application submitted");
      setApplicantName("");
      setApplicantEmail("");
      setApplicantMessage("");
      setResumeFile(null);
      setResumeUrl("");
      setShowApplyModal(false);
      setSelectedJob(null);
    } catch (err) {
      console.error(err.response ? err.response.data : err.message);
      toast?.error("Failed to submit application");
    }
  };

  const fetchApplications = async (jobId) => {
    try {
      setAppsLoading(true);
      setAppsError("");
      const res = await axios.get(`${serverUrl}/api/jobs/${jobId}/applications`, { withCredentials: true });
      setApps(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setAppsError("Failed to load applications");
    } finally {
      setAppsLoading(false);
    }
  };

  const handleDelete = async (job) => {
    try {
      const ok = await (confirm ? confirm({ title: 'Delete job', message: `Delete "${job.title}"?`, confirmText: 'Delete', cancelText: 'Cancel' }) : Promise.resolve(true));
      if (!ok) return;
      await axios.delete(`${serverUrl}/api/jobs/delete/${job._id}`, { withCredentials: true });
      toast?.success('Job deleted');
      fetchJobs();
    } catch (e) {
      toast?.error('Failed to delete');
    }
  };

  const toggleSave = (jobId) => {
    setSaved(prev => {
      const set = new Set(prev || []);
      if (set.has(jobId)) { set.delete(jobId); toast?.info?.('Removed from saved'); }
      else { set.add(jobId); toast?.success?.('Saved job'); }
      const arr = Array.from(set);
      try { localStorage.setItem('saved_jobs', JSON.stringify(arr)); } catch {}
      return arr;
    });
  };

  const timeAgo = (d) => {
    const dt = new Date(d);
    const diff = Math.floor((Date.now() - dt.getTime())/1000);
    if (diff < 60) return `${diff}s ago`;
    const m = Math.floor(diff/60); if (m < 60) return `${m}m ago`;
    const h = Math.floor(m/60); if (h < 24) return `${h}h ago`;
    const days = Math.floor(h/24); return `${days}d ago`;
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // Derive filter/sort values
  const locations = useMemo(() => {
    const set = new Set();
    (jobs || []).forEach(j => j.location && set.add(j.location));
    return Array.from(set);
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    let list = Array.isArray(jobs) ? [...jobs] : [];
    const q = searchTerm.trim().toLowerCase();
    if (q) list = list.filter(j => (j.title || '').toLowerCase().includes(q) || (j.company || '').toLowerCase().includes(q) || (j.description || '').toLowerCase().includes(q));
    if (filterLoc) list = list.filter(j => j.location === filterLoc);
    if (myOnly && userData?._id) list = list.filter(j => j.createdBy?._id === userData._id);
    if (sortBy === 'recent') list.sort((a,b) => new Date(b.datePosted) - new Date(a.datePosted));
    if (sortBy === 'az') list.sort((a,b) => (a.title || '').localeCompare(b.title || ''));
    return list;
  }, [jobs, searchTerm, filterLoc, sortBy, myOnly, userData?._id]);

  const totalPages = Math.max(1, Math.ceil((filteredJobs.length || 0) / pageSize));
  const pageClamped = Math.min(page, totalPages);
  const start = (pageClamped - 1) * pageSize;
  const pagedJobs = filteredJobs.slice(start, start + pageSize);

  return (
  <div className="w-full min-h-screen bg-gradient-to-br from-[#1A1F71] to-[#2C2C2C] dark:from-[#121212] dark:to-[#121212]">
      {/* Navbar */}
      <Nav />


      {/* Job Modal (Add/Edit) */}
      {showJobModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <form onSubmit={handleJobSubmit} className="card w-full max-w-md relative animate-scale-in">
            <button type="button" className="absolute top-3 right-3 text-2xl text-yellow-400" onClick={() => { setShowJobModal(false); setIsEditMode(false); setSelectedJob(null); }}>&times;</button>
            <h2 className="text-2xl font-bold mb-4 text-center text-yellow-400">{isEditMode ? "Edit Job" : "Add Job"}</h2>
            <input type="text" className="input mb-2" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
            <input type="text" className="input mb-2" placeholder="Company" value={company} onChange={e => setCompany(e.target.value)} />
            <input type="text" className="input mb-2" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
            <input type="text" className="input mb-4" placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} />
            <button type="submit" className="btn-primary w-full">{isEditMode ? "Update Job" : "Add Job"}</button>
          </form>
        </div>
      )}

      {/* Apply Modal */}
      {showApplyModal && selectedJob && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <form onSubmit={applyJob} className="card w-full max-w-md relative animate-scale-in">
              <button type="button" className="absolute top-3 right-3 text-2xl text-yellow-400" onClick={() => setShowApplyModal(false)}>&times;</button>
              <h2 className="text-2xl font-bold mb-4 text-center text-yellow-400">Apply for {selectedJob.title}</h2>
              <input type="text" className="input mb-2" placeholder="Your Name" value={applicantName} onChange={e => setApplicantName(e.target.value)} required />
              <input type="email" className="input mb-2" placeholder="Your Email" value={applicantEmail} onChange={e => setApplicantEmail(e.target.value)} required />
              <textarea className="input mb-2" placeholder="Why are you a good fit?" value={applicantMessage} onChange={e => setApplicantMessage(e.target.value)} rows={4} required />
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Resume (PDF or DOC, optional)</label>
                <input type="file" accept=".pdf,.doc,.docx,.rtf,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e)=>{ const f=e.target.files?.[0]; setResumeFile(f||null); setResumeUrl(""); }} />
                {resumeFile && (
                  <div className="text-xs text-gray-600 mt-1">{resumeFile.name} • {(resumeFile.size/1024/1024).toFixed(2)} MB</div>
                )}
              </div>
              <button type="submit" className="btn-primary w-full" disabled={resumeUploading}>{resumeUploading ? 'Uploading…' : 'Submit Application'}</button>
            </form>
          </div>
      )}

      {/* Header & Actions */}
      <div className="mt-[80px] px-4">
        <div className="card p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-0">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search jobs by title, company, or description" value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className="pl-10 input w-full" />
            </div>
            <button className="btn-primary whitespace-nowrap shrink-0" onClick={() => setShowJobModal(true)}><FiPlus className="inline mr-1"/> Post a job</button>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 min-w-0">
              <FiMapPin className="text-gray-500"/>
              <select value={filterLoc} onChange={e=>setFilterLoc(e.target.value)} className="input w-40 sm:w-48 md:w-56 max-w-full truncate">
                <option value="">All locations</option>
                {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <FiBriefcase className="text-gray-500"/>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)} className="input w-40 sm:w-48 md:w-56 max-w-full truncate">
                <option value="recent">Most recent</option>
                <option value="az">Title A-Z</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm ml-auto shrink-0">
              <input type="checkbox" checked={myOnly} onChange={e=>{ setMyOnly(e.target.checked); setPage(1); }} />
              My jobs
            </label>
            <div className="ml-auto text-sm text-gray-500 dark:text-white/80 shrink-0">{filteredJobs.length} of {jobs.length}</div>
          </div>
        </div>
      </div>

      {/* Job Cards */}
      <div className="p-4">
        {loading ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_,i)=> (
  <div key={i} className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-5 border border-gray-200 dark:border-[#2C2F36] animate-pulse animate-fade-in">
                <div className="h-5 w-2/3 bg-gray-200 rounded mb-3"/>
                <div className="h-4 w-1/2 bg-gray-200 rounded mb-2"/>
                <div className="h-4 w-full bg-gray-200 rounded mb-2"/>
                <div className="h-4 w-5/6 bg-gray-200 rounded mb-4"/>
                <div className="h-8 w-24 bg-gray-200 rounded"/>
              </div>
            ))}
          </div>
        ) : filteredJobs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {pagedJobs.map((job) => {
              const isOwner = userData && job.createdBy && (job.createdBy._id === userData._id);
              return (
    <div key={job._id} className="card flex flex-col gap-3 hover-lift rounded-2xl p-5 overflow-hidden animate-fade-in">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-200 to-blue-400 text-blue-900 grid place-items-center text-xs font-bold">
                        {(job.company || 'C').slice(0,2).toUpperCase()}
                      </div>
                      <div>
  <h3 className="text-lg font-bold text-[#1A1F71] dark:text-white truncate max-w-[200px] md:max-w-[240px]" title={job.title}>{job.title}</h3>
  <div className="text-sm text-gray-700 dark:text-white truncate max-w-[200px] md:max-w-[240px]" title={job.company}>{job.company}</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 inline-flex items-center gap-1"><FiClock/>{timeAgo(job.datePosted)}</div>
                  </div>
  <div className="text-sm text-gray-800 dark:text-white line-clamp-3 min-h-[60px] break-words">{job.description}</div>
  <div className="text-xs text-yellow-700 dark:text-white inline-flex items-center gap-1 truncate" title={job.location}><FiMapPin/>{job.location}</div>
      <div className="flex gap-2 mt-1 flex-wrap">
                    <button className="btn-secondary" onClick={() => openApplyModal(job)}>Apply</button>
                    <button className={`inline-flex items-center gap-1 px-3 py-1 rounded border ${saved.includes(job._id) ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-white dark:bg-[#1E1E1E] text-gray-700 dark:text-white border-gray-300 dark:border-[#2C2F36]'}`} onClick={() => toggleSave(job._id)}><FiBookmark/> {saved.includes(job._id) ? 'Saved' : 'Save'}</button>
                    <button className="btn-secondary" onClick={() => openDetails(job)}>View</button>
                    {isOwner ? (
                      <>
                        <button className="btn-primary inline-flex items-center gap-1" onClick={() => openEditModal(job)}><FiEdit2/> Edit</button>
                        <button className="btn-secondary inline-flex items-center gap-1" onClick={() => handleDelete(job)}><FiTrash2/> Delete</button>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card p-8 text-center text-gray-500 dark:text-white">No jobs match your filters.</div>
        )}
        {error && <div className="text-center text-red-600 dark:text-red-400 mt-4">{error}</div>}
        {/* Pagination */}
        {filteredJobs.length > pageSize && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button className="btn-secondary" disabled={pageClamped <= 1} onClick={()=> setPage(p=> Math.max(1, p-1))}>Prev</button>
            <span className="text-sm text-gray-600">Page {pageClamped} of {totalPages}</span>
            <button className="btn-secondary" disabled={pageClamped >= totalPages} onClick={()=> setPage(p=> Math.min(totalPages, p+1))}>Next</button>
          </div>
        )}
      </div>

  {/* Details Drawer */}
    {detailsOpen && selectedJob && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={()=> setDetailsOpen(false)} />
  <aside className="absolute right-0 top-0 h-full w-[min(92vw,520px)] bg-white dark:bg-[#1E1E1E] shadow-xl p-5 overflow-y-auto border-l border-gray-200 dark:border-[#2C2F36] animate-slide-in-right">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-200 to-blue-400 text-blue-900 grid place-items-center text-xs font-bold">
                  {(selectedJob.company || 'C').slice(0,2).toUpperCase()}
                </div>
                <div>
                  <div className="text-xl font-bold text-[#1A1F71] dark:text-white">{selectedJob.title}</div>
                  <div className="text-sm text-gray-700 dark:text-white">{selectedJob.company}</div>
                  <div className="text-xs text-gray-500 dark:text-white/80 inline-flex items-center gap-1 mt-1"><FiClock/>{timeAgo(selectedJob.datePosted)} • <FiMapPin/>{selectedJob.location}</div>
                </div>
              </div>
              <button className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-900" onClick={()=> setDetailsOpen(false)} title="Close"><FiX/></button>
            </div>
            {selectedJob.createdBy && (
              <div className="mt-3 text-xs text-gray-600 dark:text-white/80 inline-flex items-center gap-1"><FiUser/> Posted by {selectedJob.createdBy.firstName} {selectedJob.createdBy.lastName}</div>
            )}
            <div className="mt-4 whitespace-pre-wrap text-sm text-gray-800 dark:text-white">{selectedJob.description}</div>
            <div className="mt-5 flex gap-2 flex-wrap">
              <button className="btn-primary" onClick={()=> { setDetailsOpen(false); openApplyModal(selectedJob); }}>Apply</button>
              <button className={`inline-flex items-center gap-1 px-3 py-1 rounded border ${saved.includes(selectedJob._id) ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-white dark:bg-[#1E1E1E] text-gray-700 dark:text-white border-gray-300 dark:border-[#2C2F36]'}`} onClick={() => toggleSave(selectedJob._id)}><FiBookmark/> {saved.includes(selectedJob._id) ? 'Saved' : 'Save'}</button>
              {userData && selectedJob.createdBy && selectedJob.createdBy._id === userData._id && (
                <>
                  <button className="btn-secondary" onClick={()=> { setDetailsOpen(false); openEditModal(selectedJob); }}>Edit</button>
                  <button className="btn-secondary" onClick={()=> { setDetailsOpen(false); handleDelete(selectedJob); }}>Delete</button>
                </>
              )}
            </div>

            {/* Applications (visible to owner) */}
            {userData && selectedJob.createdBy && selectedJob.createdBy._id === userData._id && (
              <div className="mt-6">
                <div className="text-base font-semibold text-[#1A1F71] dark:text-white">Job Applications</div>
                {appsLoading ? (
                  <div className="mt-3 text-sm text-gray-500 dark:text-white/80">Loading applications...</div>
                ) : appsError ? (
                  <div className="mt-3 text-sm text-red-600 dark:text-red-400">{appsError}</div>
                ) : (
                  <div className="mt-3 flex flex-col gap-3">
                    {apps.length === 0 ? (
                      <div className="text-sm text-gray-500 dark:text-white/80">No applications yet.</div>
                    ) : (
                      apps.map((a) => (
                        <div key={a._id} className="border border-gray-200 dark:border-[#2C2F36] rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-gray-800 dark:text-white">{a.name} <span className="text-xs text-gray-500 dark:text-white/70">{a.email}</span></div>
                            <div className="text-xs text-gray-500 dark:text-white/70">{timeAgo(a.createdAt)}</div>
                          </div>
                          <div className="mt-2 text-sm text-gray-800 dark:text-white whitespace-pre-wrap">{a.message}</div>
                          {a.resumeUrl && (
                            <div className="mt-2 text-sm">
                              <a href={a.resumeUrl} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 underline">View Resume</a>
                              {a.resumeName && <span className="text-gray-500 dark:text-white/70 text-xs ml-2">({a.resumeName})</span>}
                            </div>
                          )}
                          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                            <div className="text-xs">Status: <span className="px-2 py-0.5 rounded-full border border-gray-300 dark:border-[#2C2F36] text-gray-700 dark:text-white">{a.status || 'submitted'}</span></div>
                            <div className="flex gap-2 flex-wrap">
                              <button className="btn-secondary px-2 py-1 text-xs" onClick={async ()=>{
                                try { await axios.put(`${serverUrl}/api/jobs/${selectedJob._id}/applications/${a._id}/status`, { status: 'reviewed' }, { withCredentials: true }); toast?.success('Marked reviewed'); fetchApplications(selectedJob._id); } catch { toast?.error('Failed'); }
                              }}>Reviewed</button>
                              <button className="btn-secondary px-2 py-1 text-xs" onClick={async ()=>{
                                try { await axios.put(`${serverUrl}/api/jobs/${selectedJob._id}/applications/${a._id}/status`, { status: 'accepted' }, { withCredentials: true }); toast?.success('Accepted'); fetchApplications(selectedJob._id); } catch { toast?.error('Failed'); }
                              }}>Accept</button>
                              <button className="btn-secondary px-2 py-1 text-xs" onClick={async ()=>{
                                try { await axios.put(`${serverUrl}/api/jobs/${selectedJob._id}/applications/${a._id}/status`, { status: 'rejected' }, { withCredentials: true }); toast?.success('Rejected'); fetchApplications(selectedJob._id); } catch { toast?.error('Failed'); }
                              }}>Reject</button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

export default Jobs;