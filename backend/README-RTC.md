RTC/TURN quick setup

- Endpoint: GET /api/rtc/ice
  - Returns ephemeral ICE servers from Twilio if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are set.
  - Response shape: { iceServers: [{ urls: string|string[], username?: string, credential?: string }] }

Env variables:
- TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
- TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
- CORS_ORIGINS=https://your-frontend.app

Frontend env (optional):
- VITE_FORCE_TURN=true             # force relay-only for strict networks
- VITE_TURN_TCP_ONLY=true          # prefer turns:443 or transport=tcp entries
- VITE_TURN_URL=turn:host:3478?transport=udp,turns:host:443?transport=tcp (with VITE_TURN_USERNAME and VITE_TURN_CREDENTIAL)
- VITE_TURN_USERNAME=youruser
- VITE_TURN_CREDENTIAL=yourpass

Features added:
- Incoming call modal and ringing state (already present)
- In-call device selection: mic/camera/speaker
- Camera flip (cycles available cameras)
- Screen sharing toggle
- Reconnect (ICE restart) button and automatic recovery watchdogs
- Quality indicator from getStats

Notes:
- Some browsers (iOS Safari) do not support setSinkId for speaker selection; the selector will have no effect.
- Device labels appear after the first successful getUserMedia permission grant.
- For TURN via Twilio, ensure your account has Network Traversal enabled.
