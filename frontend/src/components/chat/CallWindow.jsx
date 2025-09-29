import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiMic, FiMicOff, FiCamera, FiCameraOff, FiPhoneOff, FiMaximize2, FiMinimize2, FiRefreshCw, FiShuffle, FiWifi, FiActivity, FiAlertTriangle } from "react-icons/fi";

// Video elements are controlled by parent via refs.
const CallWindow = ({
  callType = 'audio',
  incoming = false,
  inCall = false,
  ringing = false,
  iceState = 'new',
  pcState = 'new',
  relayInfo,
  peerName = 'Unknown',
  peerImage,
  minimized = false,
  onToggleMinimize,
  onAccept,
  onReject,
  onEnd,
  onMuteToggle,
  onCamToggle,
  onReconnect,
  onShareToggle,
  // Devices
  devices,
  selectedMicId,
  selectedCamId,
  selectedSpeakerId,
  onSelectMic,
  onSelectCam,
  onSelectSpeaker,
  onFlipCamera,
  muted = false,
  cameraOff = false,
  sharing = false,
  getStats,
  localVideoRef,
  remoteVideoRef,
  remoteAudioRef
}) => {
  const [startedAt, setStartedAt] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [swapLayout, setSwapLayout] = useState(false);
  const containerRef = useRef(null);
  const [fs, setFs] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [statsText, setStatsText] = useState('');
  const [remoteVideoOn, setRemoteVideoOn] = useState(true);
  const [quality, setQuality] = useState({ level: 'good', rtt: 0, kbpsIn: 0, kbpsOut: 0 });
  const lastBytesRef = useRef({ t: 0, inBytes: 0, outBytes: 0 });

  // Start/stop a simple duration timer when call connects
  useEffect(() => {
    if (inCall && (pcState === 'connected' || iceState === 'connected' || iceState === 'completed')) {
      if (!startedAt) setStartedAt(Date.now());
    } else if (!inCall || pcState === 'disconnected' || pcState === 'failed') {
      // stop timer
      setStartedAt(null);
      setElapsed(0);
    }
  }, [inCall, pcState, iceState, startedAt]);

  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const duration = useMemo(() => {
    const s = Math.max(0, elapsed);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }, [elapsed]);

  const statusLabel = useMemo(() => {
    if (ringing) return 'Ringing…';
    if (pcState === 'failed') return 'Reconnecting…';
    if (pcState === 'connecting' || iceState === 'checking') return 'Connecting…';
    if (pcState === 'connected') return 'Connected';
    return `${iceState}/${pcState}`;
  }, [ringing, pcState, iceState]);

  const statusColor = useMemo(() => {
    if (ringing) return 'bg-yellow-100 text-yellow-800';
    if (pcState === 'failed') return 'bg-red-100 text-red-700';
    if (pcState === 'connected') return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-700';
  }, [ringing, pcState]);

  const toggleFullscreen = async () => {
    try {
      if (!fs) {
        await containerRef.current?.requestFullscreen?.();
        setFs(true);
      } else {
        await document.exitFullscreen?.();
        setFs(false);
      }
    } catch {}
  };

  const refreshStats = async () => {
    if (!getStats) return;
    const report = await getStats();
    if (!report) return;
    const lines = [];
    report.forEach((r) => {
      if (r.type === 'inbound-rtp' && r.kind === 'video') {
        lines.push(`inbound video: frames=${r.framesDecoded} bitrate≈${Math.round((r.bytesReceived||0)*8/1024)}kb`);
      }
      if (r.type === 'outbound-rtp' && r.kind === 'video') {
        lines.push(`outbound video: frames=${r.framesEncoded} bitrate≈${Math.round((r.bytesSent||0)*8/1024)}kb`);
      }
      if (r.type === 'candidate-pair' && r.state === 'succeeded' && r.nominated) {
        lines.push(`selected pair: ${r.localCandidateId} ⇄ ${r.remoteCandidateId} rtt=${r.currentRoundTripTime}`);
      }
    });
    setStatsText(lines.join('\n'));
  };
  useEffect(() => {
    if (!statsOpen) return;
    const id = setInterval(refreshStats, 1000);
    return () => clearInterval(id);
  }, [statsOpen]);

  // Lightweight network quality probe (runs during call)
  useEffect(() => {
    if (!inCall || !getStats) return;
    const id = setInterval(async () => {
      try {
        const report = await getStats();
        if (!report) return;
        let inBytes = 0, outBytes = 0;
        let rttMs = 0;
        report.forEach((r) => {
          // Sum all inbound/outbound RTP bytes (audio+video)
          if (r.type === 'inbound-rtp') inBytes += (r.bytesReceived || 0);
          if (r.type === 'outbound-rtp') outBytes += (r.bytesSent || 0);
          if (r.type === 'candidate-pair' && r.state === 'succeeded' && r.nominated) {
            if (typeof r.currentRoundTripTime === 'number') rttMs = Math.round(r.currentRoundTripTime * 1000);
          }
        });
        const now = Date.now();
        const last = lastBytesRef.current;
        if (last.t) {
          const dt = Math.max(1, now - last.t);
          const dIn = Math.max(0, inBytes - last.inBytes);
          const dOut = Math.max(0, outBytes - last.outBytes);
          const kbpsIn = Math.round((dIn * 8) / dt);
          const kbpsOut = Math.round((dOut * 8) / dt);
          // Heuristic quality levels
          let level = 'good';
          if (rttMs > 600 || (kbpsIn < 80 && kbpsOut < 80)) level = 'poor';
          else if (rttMs > 250 || (kbpsIn < 200 && kbpsOut < 200)) level = 'ok';
          setQuality({ level, rtt: rttMs, kbpsIn, kbpsOut });
        }
        lastBytesRef.current = { t: now, inBytes, outBytes };
      } catch {}
    }, 2000);
    return () => clearInterval(id);
  }, [inCall, getStats]);

  // Detect if remote video is actually on (fallback to avatar when off)
  useEffect(() => {
    if (!inCall) return;
    const id = setInterval(() => {
      try {
        const tracks = remoteVideoRef?.current?.srcObject?.getVideoTracks?.() || [];
        const on = tracks.some((t) => (t.enabled !== false) && t.readyState === 'live');
        setRemoteVideoOn(on);
      } catch {}
    }, 1500);
    return () => clearInterval(id);
  }, [inCall, remoteVideoRef]);

  // Handy keyboard shortcuts while in call
  useEffect(() => {
    if (!inCall) return;
    const onKey = (e) => {
      const k = (e.key || '').toLowerCase();
      if (k === 'm') onMuteToggle?.();
      if (k === 'c' && callType === 'video') onCamToggle?.();
      if (k === 's' && callType === 'video') onShareToggle?.();
      if (k === 'r') onReconnect?.();
      if (k === 'escape') onToggleMinimize?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inCall, callType, onMuteToggle, onCamToggle, onShareToggle, onReconnect, onToggleMinimize]);

  if (incoming) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
  <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-5 w-80 text-gray-800 dark:text-white border border-gray-200 dark:border-[#2C2F36] shadow-2xl">
          <div className="flex flex-col items-center text-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-blue-100" />
              <img src={peerImage} alt="" className="relative w-16 h-16 rounded-full border-2 border-blue-200" />
            </div>
            <div className="mt-3 font-semibold text-base">Incoming {callType === 'video' ? 'Video' : 'Voice'} Call</div>
            <div className="text-sm text-gray-600 dark:text-white/80">{peerName}</div>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            <button className="btn-secondary" onClick={onReject}>Decline</button>
            <button className="btn-primary" onClick={onAccept}>Accept</button>
          </div>
        </div>
      </div>
    );
  }

  // Outgoing call screen while ringing (caller preview)
  if (ringing && !inCall) {
  return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40">
  <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-4 w-80 text-gray-800 dark:text-white border border-gray-200 dark:border-[#2C2F36] shadow-2xl">
          <div className="text-xs font-semibold mb-2">Calling {peerName}</div>
          {callType === 'video' ? (
            <div className="relative w-full aspect-video bg-black rounded overflow-hidden">
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3">
              <img src={peerImage} alt="" className="w-10 h-10 rounded-full border" />
              <div className="text-sm">Ringing…</div>
            </div>
          )}
          <div className="flex items-center justify-center gap-3 mt-3">
            <button onClick={onEnd} className="px-4 py-2 rounded-full bg-red-500 text-white hover:bg-red-600" title="Cancel call">End</button>
          </div>
        </div>
      </div>
    );
  }

  if (!inCall) return null;

  return (
  <div ref={containerRef} className={`fixed ${minimized ? 'bottom-4 right-4 w-64' : 'bottom-6 right-6 w-80'} bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2F36] rounded-xl shadow-xl p-2 z-40 text-gray-800 dark:text-white`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold">{callType === 'video' ? 'Video' : 'Voice'} call with {peerName}</div>
  <button onClick={onToggleMinimize} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-900" title={minimized ? 'Expand' : 'Minimize'}>
          {minimized ? <FiMaximize2 /> : <FiMinimize2 />}
        </button>
      </div>
  <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-white/70 mb-1">
  <div className={`px-2 py-0.5 rounded-full ${statusColor} dark:bg-[#1E1E1E] dark:text-white dark:border dark:border-[#2C2F36]`} title={`ICE: ${iceState} · PC: ${pcState}`}>
          {statusLabel}
          <span className="ml-1">· ICE: {iceState} · PC: {pcState}</span>
          {relayInfo ? ` · Relay(L/R): ${relayInfo.local ? 'Y' : 'N'}/${relayInfo.remote ? 'Y' : 'N'}` : ''}
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 dark:bg-[#1E1E1E] dark:text-white dark:border dark:border-[#2C2F36]" title={`RTT ${quality.rtt}ms · in ${quality.kbpsIn} kbps · out ${quality.kbpsOut} kbps`}>
            {quality.level === 'good' ? (
              <span className="inline-flex items-center gap-1 text-green-600"><FiWifi />Good</span>
            ) : quality.level === 'ok' ? (
              <span className="inline-flex items-center gap-1 text-yellow-600"><FiActivity />OK</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-red-600"><FiAlertTriangle />Poor</span>
            )}
          </div>
          <div className="font-mono">{startedAt ? duration : ''}</div>
        </div>
      </div>
      {/* Device selectors */}
      <div className="flex items-center gap-1 mb-1">
        <select
          className="flex-1 text-[10px] px-1.5 py-1 rounded border border-gray-200 dark:border-[#2C2F36] bg-white dark:bg-[#1E1E1E]"
          title="Microphone"
          value={selectedMicId || ''}
          onChange={(e) => onSelectMic?.(e.target.value)}
        >
          {(devices?.mics || []).map((d) => (
            <option key={d.deviceId || 'default'} value={d.deviceId || 'default'}>{d.label || 'Microphone'}</option>
          ))}
        </select>
        {callType === 'video' && (
          <select
            className="flex-1 text-[10px] px-1.5 py-1 rounded border border-gray-200 dark:border-[#2C2F36] bg-white dark:bg-[#1E1E1E]"
            title="Camera"
            value={selectedCamId || ''}
            onChange={(e) => onSelectCam?.(e.target.value)}
          >
            {(devices?.cams || []).map((d) => (
              <option key={d.deviceId || 'default'} value={d.deviceId || 'default'}>{d.label || 'Camera'}</option>
            ))}
          </select>
        )}
        <select
          className="flex-1 text-[10px] px-1.5 py-1 rounded border border-gray-200 dark:border-[#2C2F36] bg-white dark:bg-[#1E1E1E]"
          title="Speaker"
          value={selectedSpeakerId || ''}
          onChange={(e) => onSelectSpeaker?.(e.target.value)}
        >
          {(devices?.speakers || []).map((d) => (
            <option key={d.deviceId || 'default'} value={d.deviceId || 'default'}>{d.label || 'Speaker'}</option>
          ))}
        </select>
      </div>
    {callType === 'video' && !minimized ? (
        <div className="relative w-full aspect-video bg-black rounded overflow-hidden" onDoubleClick={toggleFullscreen}>
          {/* Swap layout toggles which video is large vs. PiP */}
          {!swapLayout ? (
            <>
              <video ref={remoteVideoRef} autoPlay playsInline className={`w-full h-full object-cover ${remoteVideoOn ? '' : 'opacity-0'}`} />
              <video ref={localVideoRef} autoPlay muted playsInline className="w-24 h-16 object-cover absolute bottom-1 right-1 border-2 border-white rounded" />
            </>
          ) : (
            <>
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              <video ref={remoteVideoRef} autoPlay playsInline className={`w-24 h-16 object-cover absolute bottom-1 right-1 border-2 border-white rounded ${remoteVideoOn ? '' : 'opacity-0'}`} />
            </>
          )}
          {!remoteVideoOn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white">
              {peerImage ? (
                <img src={peerImage} alt="" className="w-16 h-16 rounded-full border-2 border-white/30 mb-2" />
              ) : null}
              <div className="text-xs opacity-80">Remote camera off</div>
            </div>
          )}
          {/* Overlays for local state */}
          {muted && (<div className="absolute top-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">Muted</div>)}
          {cameraOff && (<div className="absolute top-1 left-14 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">Camera off</div>)}
        </div>
      ) : (
        <div className="p-2">
          {callType === 'video' ? (
            <div className="relative w-full aspect-video bg-black rounded overflow-hidden">
              <video ref={remoteVideoRef} autoPlay playsInline className={`w-full h-full object-cover ${remoteVideoOn ? '' : 'opacity-0'}`} />
              <video ref={localVideoRef} autoPlay muted playsInline className="w-20 h-14 object-cover absolute bottom-1 right-1 border-2 border-white rounded" />
              {!remoteVideoOn && (
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  {peerImage ? <img src={peerImage} alt="" className="w-12 h-12 rounded-full border-2 border-white/30" /> : null}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-2">
              <img src={peerImage} alt="" className="w-10 h-10 rounded-full border" />
              <div className="text-sm">Connected</div>
            </div>
          )}
          {/* Hidden audio element is rendered below for both audio & video calls */}
        </div>
      )}
      {/* Always render a hidden audio element to ensure remote audio plays reliably (even in video calls) */}
      <audio ref={remoteAudioRef} autoPlay className="absolute w-0 h-0 opacity-0" />
      <div className="flex items-center justify-center gap-3 mt-2">
  <button onClick={onMuteToggle} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-[#1E1E1E] dark:hover:bg-[#161616] border border-transparent dark:border-[#2C2F36]" title={muted ? 'Unmute' : 'Mute'}>
          {muted ? <FiMicOff /> : <FiMic />}
        </button>
        {callType === 'video' && (
          <>
            <button onClick={onCamToggle} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-[#1E1E1E] dark:hover:bg-[#161616] border border-transparent dark:border-[#2C2F36]" title={cameraOff ? 'Camera on' : 'Camera off'}>
              {cameraOff ? <FiCameraOff /> : <FiCamera />}
            </button>
            {onFlipCamera && (
              <button onClick={onFlipCamera} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-[#1E1E1E] dark:hover:bg-[#161616] border border-transparent dark:border-[#2C2F36]" title="Flip camera">
                <FiRefreshCw />
              </button>
            )}
            <button onClick={onShareToggle} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-[#1E1E1E] dark:hover:bg-[#161616] border border-transparent dark:border-[#2C2F36]" title={sharing ? 'Stop sharing' : 'Share screen'}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 5h16v10H4z" stroke="currentColor" strokeWidth="1.5"/><path d="M8 19h8" stroke="currentColor" strokeWidth="1.5"/><path d="M12 15v4" stroke="currentColor" strokeWidth="1.5"/></svg>
            </button>
            <button onClick={() => setSwapLayout(v => !v)} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-[#1E1E1E] dark:hover:bg-[#161616] border border-transparent dark:border-[#2C2F36]" title="Swap layout">
              <FiShuffle />
            </button>
            <button onClick={toggleFullscreen} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-[#1E1E1E] dark:hover:bg-[#161616] border border-transparent dark:border-[#2C2F36]" title={fs ? 'Exit full screen' : 'Full screen'}>
              <FiMaximize2 />
            </button>
          </>
        )}
        {onReconnect && (
          <button onClick={onReconnect} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-[#1E1E1E] dark:hover:bg-[#161616] border border-transparent dark:border-[#2C2F36]" title="Reconnect (ICE restart)">
            <FiRefreshCw />
          </button>
        )}
        <button onClick={onEnd} className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600" title="End call">
          <FiPhoneOff />
        </button>
      </div>
      {/* Optional lightweight stats drawer */}
      <div className="mt-1 text-right">
  <button onClick={() => setStatsOpen(s => !s)} className="text-[10px] text-gray-500 dark:text-white/70 hover:text-gray-700 dark:hover:text-white underline">
          {statsOpen ? 'Hide stats' : 'Show stats'}
        </button>
      </div>
      {statsOpen && (
  <pre className="mt-1 max-h-24 overflow-auto text-[10px] bg-gray-50 dark:bg-[#1E1E1E] text-gray-700 dark:text-white p-2 rounded border border-gray-200 dark:border-[#2C2F36] whitespace-pre-wrap">{statsText || 'collecting...'}</pre>
      )}
    </div>
  );
};

export default CallWindow;
