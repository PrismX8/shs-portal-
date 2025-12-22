// Voice Chat Module
// Extracted from script.js - All voice chat functionality
// Lines 540-3474 from original script.js

  // -------- Voice Chat (PeerJS + Supabase Realtime Presence) --------
  // NOTE: Voice traffic is peer-to-peer (WebRTC). Supabase is used only for presence + moderation/report events.
  const VOICE_ROOM_ID = 'global';
  const VOICE_REPORT_TYPE = 'voice_report';
  const VOICE_MOD_TYPE = 'voice_mod';

  // Voice moderation state (client-enforced, driven by %Owner% events)
  const VOICE_MOD_STATE_KEY = 'voice_mod_state_v1';
  function loadVoiceModState() {
      try {
          const raw = localStorage.getItem(VOICE_MOD_STATE_KEY);
          const parsed = JSON.parse(raw || '{}');
          const bans = parsed?.bans && typeof parsed.bans === 'object' ? parsed.bans : {};
          const timeouts = parsed?.timeouts && typeof parsed.timeouts === 'object' ? parsed.timeouts : {};
          return { bans, timeouts };
      } catch (_) {
          return { bans: {}, timeouts: {} };
      }
  }
  function saveVoiceModState(state) {
      try { localStorage.setItem(VOICE_MOD_STATE_KEY, JSON.stringify(state || { bans: {}, timeouts: {} })); } catch (_) {}
  }
  function pruneVoiceModState(state) {
      const now = Date.now();
      const next = state || { bans: {}, timeouts: {} };
      const timeouts = next.timeouts || {};
      Object.keys(timeouts).forEach((k) => {
          const until = Number(timeouts[k] || 0);
          if (!until || until <= now) delete timeouts[k];
      });
      next.timeouts = timeouts;
      return next;
  }
  function getVoiceBlockReason(userId) {
      const uid = String(userId || '');
      if (!uid) return { blocked: false };
      const state = pruneVoiceModState(loadVoiceModState());
      saveVoiceModState(state);
      if (state.bans && state.bans[uid]) return { blocked: true, type: 'ban' };
      const until = state.timeouts ? Number(state.timeouts[uid] || 0) : 0;
      if (until && until > Date.now()) return { blocked: true, type: 'timeout', until };
      return { blocked: false };
  }

  // Report UI (works even when you're not in voice)
  let voiceReportModalEl = null;
  let voiceReportsInboxEl = null;

  function ensureVoiceReportModal() {
      if (voiceReportModalEl) return voiceReportModalEl;
      const overlay = document.createElement('div');
      overlay.id = 'voiceReportModal';
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.zIndex = '999997';
      overlay.style.display = 'none';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.padding = '16px';
      overlay.style.background = 'rgba(0,0,0,0.62)';
      overlay.style.backdropFilter = 'blur(6px)';
      overlay.innerHTML = `
        <div style="width:min(560px, 96vw); border-radius:16px; border:1px solid rgba(255,255,255,0.14); background:linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,0.98)); box-shadow:0 24px 80px rgba(0,0,0,0.55); padding:14px 14px 12px;">
          <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:10px;">
            <div>
              <div style="font-weight:950; font-size:15px; color:#e2e8f0;">Report user</div>
              <div data-report-target="1" style="margin-top:6px; font-size:12px; color:rgba(226,232,240,0.78); line-height:1.35;"></div>
            </div>
            <button data-report-close="1" style="border:none; background:rgba(255,255,255,0.06); color:rgba(226,232,240,0.9); font-weight:900; border-radius:10px; padding:8px 10px; cursor:pointer;">Close</button>
          </div>

          <div style="margin-top:12px;">
            <div style="font-size:12px; font-weight:900; color:rgba(226,232,240,0.85); margin-bottom:6px;">Reason (required)</div>
            <textarea data-report-reason="1" rows="4" placeholder="Explain what happened…" style="width:100%; box-sizing:border-box; resize:vertical; border-radius:12px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.05); color:#e5e7eb; padding:10px 10px; font-size:13px; outline:none;"></textarea>
            <div data-report-hint="1" style="margin-top:8px; font-size:12px; color:rgba(226,232,240,0.70);"></div>
          </div>

          <div style="margin-top:12px; display:flex; gap:10px; justify-content:flex-end; flex-wrap:wrap;">
            <button data-report-timeout="1" style="display:none; padding:10px 12px; border:none; border-radius:12px; background:rgba(251,191,36,0.16); color:#fde68a; font-weight:950; cursor:pointer;">Timeout</button>
            <button data-report-ban="1" style="display:none; padding:10px 12px; border:none; border-radius:12px; background:rgba(239,68,68,0.18); color:#fecaca; font-weight:950; cursor:pointer;">Ban</button>
            <button data-report-submit="1" style="padding:10px 12px; border:none; border-radius:12px; background:linear-gradient(135deg, rgba(59,130,246,0.95), rgba(37,99,235,0.92)); color:#07121a; font-weight:950; cursor:pointer;">Submit report</button>
          </div>
        </div>
      `;
      overlay.addEventListener('click', (e) => {
          if (e.target === overlay) overlay.style.display = 'none';
      });
      document.body.appendChild(overlay);
      voiceReportModalEl = overlay;
      return overlay;
  }

  async function submitVoiceReport(reportedUserId, reason) {
      const client = await initGlobalChatClient();
      if (!client) return false;
      const payload = {
          type: VOICE_REPORT_TYPE,
          room: VOICE_ROOM_ID,
          reportedUserId: String(reportedUserId || ''),
          reporterUserId: String(globalChatUsername || ''),
          reason: String(reason || ''),
          ts: Date.now()
      };
      try {
          const { error } = await client.from('messages').insert([{ user_id: globalChatUsername || 'User', content: JSON.stringify(payload) }]);
          if (error) throw error;
          return true;
      } catch (err) {
          console.warn('Report send failed', err);
          return false;
      }
  }

  async function sendVoiceModAction(action, targetUserId, opts = {}) {
      if (globalChatUsername !== '%Owner%') {
          showChatNotice('Only the owner can do that.', true);
          return false;
      }
      const client = await initGlobalChatClient();
      if (!client) return false;
      const payload = {
          type: VOICE_MOD_TYPE,
          room: VOICE_ROOM_ID,
          action: String(action || ''),
          targetUserId: String(targetUserId || ''),
          untilTs: opts?.untilTs ? Number(opts.untilTs) : 0,
          reason: String(opts?.reason || ''),
          ts: Date.now()
      };
      try {
          const { error } = await client.from('messages').insert([{ user_id: '%Owner%', content: JSON.stringify(payload) }]);
          if (error) throw error;
          return true;
      } catch (err) {
          console.warn('Voice mod send failed', err);
          return false;
      }
  }

  async function openVoiceReportModal(reportedUserId, prefillReason = '') {
      ensureVoiceReportModal();
      const el = voiceReportModalEl;
      const closeBtn = el.querySelector('[data-report-close="1"]');
      const submitBtn = el.querySelector('[data-report-submit="1"]');
      const timeoutBtn = el.querySelector('[data-report-timeout="1"]');
      const banBtn = el.querySelector('[data-report-ban="1"]');
      const targetEl = el.querySelector('[data-report-target="1"]');
      const reasonEl = el.querySelector('[data-report-reason="1"]');
      const hint = el.querySelector('[data-report-hint="1"]');
      const targetUserId = String(reportedUserId || '');
      const name = getDisplayName(targetUserId || 'User');
      if (targetEl) targetEl.textContent = `Reporting: ${name}`;
      if (hint) hint.textContent = '';
      if (reasonEl) reasonEl.value = String(prefillReason || '');
      el.style.display = 'flex';

      const isOwner = globalChatUsername === '%Owner%';
      if (timeoutBtn) timeoutBtn.style.display = isOwner ? 'inline-block' : 'none';
      if (banBtn) banBtn.style.display = isOwner ? 'inline-block' : 'none';

      const cleanup = () => {
          closeBtn?.removeEventListener('click', onClose);
          submitBtn?.removeEventListener('click', onSubmit);
          timeoutBtn?.removeEventListener('click', onTimeout);
          banBtn?.removeEventListener('click', onBan);
      };
      const onClose = () => {
          el.style.display = 'none';
          cleanup();
      };
      const onSubmit = async () => {
          const reason = String(reasonEl?.value || '').trim();
          if (!reason) {
              if (hint) hint.textContent = 'Reason is required.';
              return;
          }
          if (hint) hint.textContent = 'Submitting…';
          const ok = await submitVoiceReport(targetUserId, reason);
          if (!ok) {
              if (hint) hint.textContent = 'Failed to submit report. Try again.';
              return;
          }
          el.style.display = 'none';
          cleanup();
          showChatNotice('Report submitted.', false);
      };
      const onTimeout = async () => {
          const minsStr = prompt(`Timeout ${name} for how many minutes?`, '10');
          const mins = Number(minsStr || 0);
          if (!isFinite(mins) || mins <= 0) return;
          const clamped = Math.max(1, Math.min(24 * 60, Math.floor(mins)));
          await sendVoiceModAction('timeout', targetUserId, { untilTs: Date.now() + clamped * 60 * 1000, reason: 'From report' });
          showChatNotice(`Timed out ${name} (${clamped}m).`, false);
      };
      const onBan = async () => {
          const ok = confirm(`Ban ${name} from voice chat?`);
          if (!ok) return;
          await sendVoiceModAction('ban', targetUserId, { reason: 'From report' });
          showChatNotice(`Banned ${name} from voice.`, false);
      };

      closeBtn?.addEventListener('click', onClose);
      submitBtn?.addEventListener('click', onSubmit);
      timeoutBtn?.addEventListener('click', onTimeout);
      banBtn?.addEventListener('click', onBan);
  }

  function ensureVoiceReportsInboxModal() {
      if (voiceReportsInboxEl) return voiceReportsInboxEl;
      const overlay = document.createElement('div');
      overlay.id = 'voiceReportsInbox';
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.zIndex = '999996';
      overlay.style.display = 'none';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.padding = '16px';
      overlay.style.background = 'rgba(0,0,0,0.62)';
      overlay.style.backdropFilter = 'blur(6px)';
      overlay.innerHTML = `
        <div style="width:min(760px, 96vw); max-height:82vh; overflow:auto; border-radius:16px; border:1px solid rgba(255,255,255,0.14); background:linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,0.98)); box-shadow:0 24px 80px rgba(0,0,0,0.55); padding:14px 14px 12px;">
          <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:10px;">
            <div>
              <div style="font-weight:950; font-size:15px; color:#e2e8f0;">Voice Reports</div>
              <div style="margin-top:6px; font-size:12px; color:rgba(226,232,240,0.78); line-height:1.35;">Owner-only. Ban/timeout directly from a report.</div>
            </div>
            <button data-reports-close="1" style="border:none; background:rgba(255,255,255,0.06); color:rgba(226,232,240,0.9); font-weight:900; border-radius:10px; padding:8px 10px; cursor:pointer;">Close</button>
          </div>
          <div data-reports-list="1" style="margin-top:12px; display:flex; flex-direction:column; gap:10px;"></div>
          <div style="margin-top:12px; display:flex; justify-content:flex-end; gap:10px; flex-wrap:wrap;">
            <button data-reports-clear="1" style="border:none; background:rgba(239,68,68,0.14); color:#fecaca; font-weight:950; border-radius:12px; padding:10px 12px; cursor:pointer;">Clear</button>
          </div>
        </div>
      `;
      overlay.addEventListener('click', (e) => {
          if (e.target === overlay) overlay.style.display = 'none';
      });
      document.body.appendChild(overlay);
      voiceReportsInboxEl = overlay;
      return overlay;
  }

  function renderVoiceReportsInbox() {
      if (!voiceReportsInboxEl) return;
      const listEl = voiceReportsInboxEl.querySelector('[data-reports-list="1"]');
      if (!listEl) return;
      const list = loadVoiceReportsInbox();
      listEl.innerHTML = '';
      if (list.length === 0) {
          const empty = document.createElement('div');
          empty.textContent = 'No reports yet.';
          empty.style.color = 'rgba(226,232,240,0.75)';
          empty.style.fontSize = '13px';
          empty.style.fontWeight = '800';
          listEl.appendChild(empty);
          return;
      }
      list.forEach((r) => {
          const card = document.createElement('div');
          card.style.border = '1px solid rgba(255,255,255,0.12)';
          card.style.borderRadius = '14px';
          card.style.background = 'rgba(255,255,255,0.04)';
          card.style.padding = '12px';
          card.style.display = 'flex';
          card.style.flexDirection = 'column';
          card.style.gap = '8px';

          const header = document.createElement('div');
          header.style.display = 'flex';
          header.style.justifyContent = 'space-between';
          header.style.gap = '10px';
          header.style.flexWrap = 'wrap';
          const who = document.createElement('div');
          who.style.fontWeight = '950';
          who.style.color = '#e2e8f0';
          who.style.fontSize = '13px';
          who.textContent = `${getDisplayName(r.reportedUserId)} (reported by ${getDisplayName(r.reporterUserId)})`;
          const when = document.createElement('div');
          when.style.color = 'rgba(226,232,240,0.65)';
          when.style.fontSize = '12px';
          when.style.fontWeight = '800';
          when.textContent = formatChatTime(r.ts || Date.now());
          header.appendChild(who);
          header.appendChild(when);

          const reason = document.createElement('div');
          reason.style.color = 'rgba(226,232,240,0.82)';
          reason.style.fontSize = '13px';
          reason.textContent = String(r.reason || '');

          const actions = document.createElement('div');
          actions.style.display = 'flex';
          actions.style.gap = '10px';
          actions.style.flexWrap = 'wrap';
          actions.style.justifyContent = 'flex-end';
          const open = document.createElement('button');
          open.textContent = 'Open';
          open.style.border = 'none';
          open.style.background = 'rgba(59,130,246,0.18)';
          open.style.color = '#bfdbfe';
          open.style.fontWeight = '950';
          open.style.borderRadius = '12px';
          open.style.padding = '8px 10px';
          open.style.cursor = 'pointer';
          open.addEventListener('click', (e) => {
              e.preventDefault();
              openVoiceReportModal(String(r.reportedUserId || ''), String(r.reason || ''));
          });
          const timeout = document.createElement('button');
          timeout.textContent = 'Timeout';
          timeout.style.border = 'none';
          timeout.style.background = 'rgba(251,191,36,0.16)';
          timeout.style.color = '#fde68a';
          timeout.style.fontWeight = '950';
          timeout.style.borderRadius = '12px';
          timeout.style.padding = '8px 10px';
          timeout.style.cursor = 'pointer';
          timeout.addEventListener('click', async (e) => {
              e.preventDefault();
              const minsStr = prompt(`Timeout ${getDisplayName(r.reportedUserId)} for how many minutes?`, '10');
              const mins = Number(minsStr || 0);
              if (!isFinite(mins) || mins <= 0) return;
              const clamped = Math.max(1, Math.min(24 * 60, Math.floor(mins)));
              await sendVoiceModAction('timeout', r.reportedUserId, { untilTs: Date.now() + clamped * 60 * 1000, reason: 'From report inbox' });
          });
          const ban = document.createElement('button');
          ban.textContent = 'Ban';
          ban.style.border = 'none';
          ban.style.background = 'rgba(239,68,68,0.18)';
          ban.style.color = '#fecaca';
          ban.style.fontWeight = '950';
          ban.style.borderRadius = '12px';
          ban.style.padding = '8px 10px';
          ban.style.cursor = 'pointer';
          ban.addEventListener('click', async (e) => {
              e.preventDefault();
              const ok = confirm(`Ban ${getDisplayName(r.reportedUserId)} from voice chat?`);
              if (!ok) return;
              await sendVoiceModAction('ban', r.reportedUserId, { reason: 'From report inbox' });
          });
          actions.appendChild(open);
          actions.appendChild(timeout);
          actions.appendChild(ban);

          card.appendChild(header);
          card.appendChild(reason);
          card.appendChild(actions);
          listEl.appendChild(card);
      });
  }

  function openVoiceReportsInbox() {
      if (globalChatUsername !== '%Owner%') return;
      ensureVoiceReportsInboxModal();
      renderVoiceReportsInbox();
      voiceReportsInboxEl.style.display = 'flex';
      const closeBtn = voiceReportsInboxEl.querySelector('[data-reports-close="1"]');
      const clearBtn = voiceReportsInboxEl.querySelector('[data-reports-clear="1"]');
      const onClose = () => {
          voiceReportsInboxEl.style.display = 'none';
          closeBtn?.removeEventListener('click', onClose);
          clearBtn?.removeEventListener('click', onClear);
      };
      const onClear = () => {
          const ok = confirm('Clear all saved reports on this device?');
          if (!ok) return;
          saveVoiceReportsInbox([]);
          renderVoiceReportsInbox();
      };
      closeBtn?.addEventListener('click', onClose);
      clearBtn?.addEventListener('click', onClear);
  }

  // Owner-only Reports button (lets you ban/timeout directly from incoming reports)
  let ownerReportsBtnEl = null;
  function ensureOwnerReportsButton() {
      if (ownerReportsBtnEl) return ownerReportsBtnEl;
      if (!globalChatSettingsBtn || !globalChatSettingsBtn.parentElement) return null;
      const btn = document.createElement('button');
      btn.id = 'ownerReportsBtn';
      btn.type = 'button';
      btn.textContent = 'Reports';
      btn.style.padding = '10px 12px';
      btn.style.border = 'none';
      btn.style.borderRadius = '10px';
      btn.style.background = 'rgba(59,130,246,0.18)';
      btn.style.color = '#bfdbfe';
      btn.style.fontWeight = '900';
      btn.style.cursor = 'pointer';
      btn.style.display = 'none';
      btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openVoiceReportsInbox();
      });
      globalChatSettingsBtn.parentElement.insertBefore(btn, globalChatSettingsBtn);
      ownerReportsBtnEl = btn;
      return btn;
  }
  function updateOwnerReportsButtonVisibility() {
      ensureOwnerReportsButton();
      if (!ownerReportsBtnEl) return;
      ownerReportsBtnEl.style.display = (globalChatUsername === '%Owner%') ? 'inline-flex' : 'none';
  }

  // -------- Voice runtime (full) --------
  // PeerJS docs: https://peerjs.com/
  // Level/speaking sync now uses PeerJS data channels (P2P), not Supabase broadcasts.
  const VOICE_SPEAKING_RMS_THRESHOLD = 0.008;
  const VOICE_SPEAKING_LEVEL_THRESHOLD = 0.02;
  const VOICE_SPEAKING_HOLD_MS = 260;
  const VOICE_LEVEL_SEND_INTERVAL_MS = 120;
  let peerJsLoadPromise = null;
  let voicePeer = null;
  let voicePeerId = '';
  let voiceJoined = false;
  let voiceLocalStream = null;
  let voiceScreenStream = null;
  let voiceScreenSharing = false;
  let voiceMuted = false;
  let voiceRtChannel = null;
  let voiceRtSubscribed = false;
  // Observer channel: lets users see current voice participants before joining
  let voiceObserverChannel = null;
  let voiceObserverKey = '';
  const voiceCalls = new Map(); // peerId -> call
  const voiceDataConns = new Map(); // peerId -> PeerJS DataConnection
  const voiceParticipants = new Map(); // peerId -> { userId, lastSeen, lastSpokeTs, speaking, connected, lastBroadcastTs, level, lastLevelTs, muted }
  let voiceParticipantsLoading = false;

  function cleanupVoiceDataConn(peerId) {
      const dc = voiceDataConns.get(peerId);
      if (dc) {
          try { dc.close(); } catch (_) {}
      }
      voiceDataConns.delete(peerId);
  }

  function handleVoiceDataMessage(fromPeerId, msg) {
      try {
          if (!fromPeerId || !msg || typeof msg !== 'object') return;
          const type = String(msg.type || '');
          const now = Date.now();
          const info = voiceParticipants.get(fromPeerId) || { userId: '', lastSeen: now, lastSpokeTs: 0, speaking: false, connected: false, lastBroadcastTs: 0, level: 0, lastLevelTs: 0, muted: false };
          if (type === 'level') {
              const lvl = Math.max(0, Math.min(1, Number(msg.level) || 0));
              const muted = !!msg.muted;
              const next = { ...info, lastSeen: now, level: muted ? 0 : lvl, lastLevelTs: now, muted: muted };
              voiceParticipants.set(fromPeerId, next);
              setParticipantLevel(fromPeerId, muted ? 0 : lvl, now);
              if (muted) setParticipantSpeaking(fromPeerId, false);
              return;
          }
          if (type === 'speaking') {
              const speaking = !!msg.speaking;
              const next = {
                  ...info,
                  lastSeen: now,
                  lastBroadcastTs: now,
                  lastSpokeTs: speaking ? now : (info.lastSpokeTs || 0),
                  speaking: speaking && !info.muted
              };
              voiceParticipants.set(fromPeerId, next);
              setParticipantSpeaking(fromPeerId, next.speaking);
              return;
          }
      } catch (_) {}
  }

  function setupVoiceDataConn(conn) {
      if (!conn) return;
      const remoteId = String(conn.peer || '');
      if (!remoteId) return;
      const existing = voiceDataConns.get(remoteId);
      if (existing && existing !== conn) {
          try { existing.close(); } catch (_) {}
      }
      voiceDataConns.set(remoteId, conn);
      try {
          conn.on('data', (data) => handleVoiceDataMessage(remoteId, data));
          conn.on('close', () => cleanupVoiceDataConn(remoteId));
          conn.on('error', () => cleanupVoiceDataConn(remoteId));
      } catch (_) {}
  }

  function maybeEnsureVoiceDataConn(remotePeerId) {
      if (!voiceJoined || !voicePeer || !voicePeerId) return;
      if (!remotePeerId || remotePeerId === voicePeerId) return;
      const existing = voiceDataConns.get(remotePeerId);
      if (existing && existing.open) return;
      // Avoid double-connecting: only initiate when our peerId sorts lower
      if (String(voicePeerId) > String(remotePeerId)) return;
      try {
          const conn = voicePeer.connect(remotePeerId, { reliable: false, metadata: { room: VOICE_ROOM_ID } });
          setupVoiceDataConn(conn);
      } catch (_) {}
  }

  function broadcastVoiceData(msg) {
      try {
          voiceDataConns.forEach((conn) => {
              try {
                  if (!conn || !conn.open) return;
                  conn.send(msg);
              } catch (_) {}
          });
      } catch (_) {}
  }

  // --- Cloudflare Voice Discovery (Durable Objects + WebSocket) ---
  // This replaces Supabase Realtime for voice presence + join/leave banners when configured.
  // Set in HTML (recommended):
  //   window.__VOICE_DISCOVERY_WS_URL__ = "wss://<your-worker>.workers.dev/voice";
  const VOICE_DISCOVERY_WS_URL = String(window.__VOICE_DISCOVERY_WS_URL__ || '').trim();
  const VOICE_DISCOVERY_ENABLED = !!VOICE_DISCOVERY_WS_URL;
  let voiceDiscoveryWs = null;
  let voiceDiscoveryMode = 'off'; // 'observer' | 'joined' | 'off'
  let voiceDiscoveryConnectPromise = null;
  let voiceDiscoveryPingTimer = null;
  let voiceDiscoveryReconnectTimer = null;

  function buildVoiceDiscoveryUrl() {
      try {
          const u = new URL(VOICE_DISCOVERY_WS_URL);
          u.searchParams.set('room', VOICE_ROOM_ID);
          return u.toString();
      } catch (_) {
          return VOICE_DISCOVERY_WS_URL;
      }
  }

  function stopVoiceDiscoverySocket() {
      if (voiceDiscoveryReconnectTimer) {
          try { clearTimeout(voiceDiscoveryReconnectTimer); } catch (_) {}
          voiceDiscoveryReconnectTimer = null;
      }
      if (voiceDiscoveryPingTimer) {
          try { clearInterval(voiceDiscoveryPingTimer); } catch (_) {}
          voiceDiscoveryPingTimer = null;
      }
      const ws = voiceDiscoveryWs;
      voiceDiscoveryWs = null;
      voiceDiscoveryMode = 'off';
      voiceDiscoveryConnectPromise = null;
      if (ws) {
          try { ws.onopen = ws.onclose = ws.onerror = ws.onmessage = null; } catch (_) {}
          try { ws.close(); } catch (_) {}
      }
  }

  function sendVoiceDiscovery(obj) {
      try {
          if (!voiceDiscoveryWs || voiceDiscoveryWs.readyState !== 1) return false;
          voiceDiscoveryWs.send(JSON.stringify(obj));
          return true;
      } catch (_) {
          return false;
      }
  }

  function applyVoiceDiscoverySnapshot(list, room) {
      try {
          if (room && String(room) !== String(VOICE_ROOM_ID)) return;
          const now = Date.now();
          const incoming = Array.isArray(list) ? list : [];
          const seen = new Set();

          incoming.forEach((p) => {
              const pid = String(p?.peerId || '');
              const userId = String(p?.userId || '');
              if (!pid || !userId) return;
              seen.add(pid);
              const prev = voiceParticipants.get(pid) || { userId: '', lastSeen: now, lastSpokeTs: 0, speaking: false, connected: false, lastBroadcastTs: 0, level: 0, lastLevelTs: 0, muted: false, screenSharing: false };
              voiceParticipants.set(pid, {
                  ...prev,
                  userId,
                  lastSeen: Number(p?.ts || now) || now,
                  muted: !!p?.muted,
                  connected: true,
                  screenSharing: !!p?.screenSharing
              });
          });

          // Remove anyone not in the snapshot (except self if joined but snapshot is late)
          Array.from(voiceParticipants.keys()).forEach((pid) => {
              if (voiceJoined && pid === voicePeerId) return;
              if (!seen.has(pid)) {
                  cleanupVoiceCall(pid);
                  voiceParticipants.delete(pid);
              }
          });

          // Clear loading state when participants are received
          if (voiceParticipantsLoading) {
              voiceParticipantsLoading = false;
          }

          renderVoiceParticipants();
          if (voiceJoined) {
              voiceParticipants.forEach((_info, pid) => {
                  maybeCallPeer(pid);
                  maybeEnsureVoiceDataConn(pid);
              });
          }
      } catch (_) {}
  }

  function scheduleVoiceDiscoveryReconnect(mode) {
      if (!VOICE_DISCOVERY_ENABLED) return;
      if (voiceDiscoveryReconnectTimer) return;
      voiceDiscoveryReconnectTimer = setTimeout(() => {
          voiceDiscoveryReconnectTimer = null;
          try { ensureVoiceDiscoverySocket(mode); } catch (_) {}
      }, 1200);
  }

  function ensureVoiceDiscoverySocket(mode) {
      if (!VOICE_DISCOVERY_ENABLED) return null;
      const desired = (mode === 'joined') ? 'joined' : 'observer';

      // Keep existing connection if it's already for this mode and still alive/connecting
      if (voiceDiscoveryWs && voiceDiscoveryMode === desired) {
          if (voiceDiscoveryWs.readyState === 0 || voiceDiscoveryWs.readyState === 1) return voiceDiscoveryWs;
      }

      stopVoiceDiscoverySocket();
      voiceDiscoveryMode = desired;

      if (voiceDiscoveryConnectPromise) return voiceDiscoveryWs;
      voiceDiscoveryConnectPromise = Promise.resolve().then(() => {
          const url = buildVoiceDiscoveryUrl();
          const ws = new WebSocket(url);
          voiceDiscoveryWs = ws;

          ws.onopen = () => {
              try {
                  if (voiceDiscoveryPingTimer) {
                      try { clearInterval(voiceDiscoveryPingTimer); } catch (_) {}
                  }
                  voiceDiscoveryPingTimer = setInterval(() => {
                      try { sendVoiceDiscovery({ type: 'ping', ts: Date.now() }); } catch (_) {}
                  }, 25000);

                  // If we're in joined mode and already have peerId, send join immediately
                  if (voiceDiscoveryMode === 'joined' && voiceJoined && voicePeerId) {
                      sendVoiceDiscovery({ type: 'join', peerId: voicePeerId, userId: globalChatUsername || 'User', muted: !!voiceMuted, screenSharing: false, ts: Date.now() });
                      // Request current participants list immediately
                      sendVoiceDiscovery({ type: 'getParticipants', ts: Date.now() });
                  } else if (voiceDiscoveryMode === 'observer') {
                      // Request participants list when observing
                      sendVoiceDiscovery({ type: 'getParticipants', ts: Date.now() });
                  }
              } catch (_) {}
          };

          ws.onmessage = (evt) => {
              try {
                  const data = JSON.parse(String(evt.data || '{}'));
                  const t = String(data?.type || '');
                  if (t === 'participants') {
                      applyVoiceDiscoverySnapshot(data?.list, data?.room);
                      return;
                  }
                  if (t === 'activity') {
                      const action = String(data?.action || '');
                      const userId = String(data?.userId || '');
                      if (action === 'join' && userId) {
                          showVoiceActivity(`${getDisplayName(userId)} joined voice chat`);
                          // Clear loading state when someone joins
                          if (voiceParticipantsLoading) {
                              voiceParticipantsLoading = false;
                              renderVoiceParticipants();
                          }
                      }
                      else if (action === 'leave' && userId) showVoiceActivity(`${getDisplayName(userId)} left voice chat`);
                      return;
                  }
                  if (t === 'screenShare') {
                      const action = String(data?.action || '');
                      const peerId = String(data?.peerId || '');
                      const userId = String(data?.userId || '');
                      if (peerId && voiceParticipants.has(peerId)) {
                          const info = voiceParticipants.get(peerId);
                          if (info) {
                              info.screenSharing = (action === 'start');
                              voiceParticipants.set(peerId, info);
                              renderVoiceParticipants();
                              
                              // If screen sharing started, check existing call for video tracks
                              if (action === 'start' && voiceCalls.has(peerId)) {
                                  // Check immediately and also after a delay (video might take time to negotiate)
                                  checkCallForVideo(peerId);
                                  setTimeout(() => checkCallForVideo(peerId), 500);
                                  setTimeout(() => checkCallForVideo(peerId), 1500);
                              }
                          }
                      }
                      return;
                  }
              } catch (_) {}
          };

          ws.onerror = () => {
              scheduleVoiceDiscoveryReconnect(desired);
          };

          ws.onclose = () => {
              scheduleVoiceDiscoveryReconnect(desired);
          };
      }).finally(() => {
          voiceDiscoveryConnectPromise = null;
      });

      return voiceDiscoveryWs;
  }

  function ensureVoiceDiscoveryObserver() {
      return ensureVoiceDiscoverySocket('observer');
  }

  function ensureVoiceDiscoveryJoined() {
      return ensureVoiceDiscoverySocket('joined');
  }

  // Local mic meter (Web Audio analyser)
  let voiceAudioCtx = null;
  let voiceAnalyser = null;
  let voiceMeterRaf = null;
  let voiceLocalSpeaking = false;
  let voiceLocalLastSpeakingSendTs = 0;
  let voiceLocalLastLevelSendTs = 0;
  let voiceNoiseFloor = 0;
  let voiceNoiseFloorInitTs = 0;

  // Remote speaking detection (fallback, if broadcast packets are missed)
  let voiceRemoteAudioCtx = null;
  const voiceRemoteAnalysers = new Map(); // peerId -> { analyser, data }
  let voiceRemoteMeterRaf = null;

  // Local-only mutes (you can't hear specific peers; doesn't affect others)
  const VOICE_LOCAL_MUTES_KEY = 'voice_local_mutes_v1';
  let voiceLocallyMutedPeers = new Set();

  // Age gate / terms consent (localStorage-enforced UI gate)
  const VOICE_GATE_KEY = 'voice_gate_v1';
  // values: 'adult_accepted' | 'under18_declined'
  let voiceGateModalEl = null;

  // Join/leave notifications for everyone on chat pages
  const VOICE_BROADCAST_ACTIVITY_EVENT = 'activity';
  let voiceActivityEl = null;
  let voiceActivityTimer = null;
  let voiceActivityChannel = null;
  const voiceActivityLastTsByUser = new Map();
  const VOICE_ACTIVITY_HEARTBEAT_MS = 12000;
  const VOICE_ACTIVITY_STALE_MS = 28000;
  let voiceActivityHeartbeatTimer = null;

  function stopVoiceActivityHeartbeats() {
      if (voiceActivityHeartbeatTimer) {
          try { clearInterval(voiceActivityHeartbeatTimer); } catch (_) {}
          voiceActivityHeartbeatTimer = null;
      }
  }

  function pruneStaleVoiceParticipants() {
      try {
          const now = Date.now();
          let changed = false;
          voiceParticipants.forEach((info, pid) => {
              if (!pid) return;
              // Never prune yourself while joined
              if (voiceJoined && pid === voicePeerId) return;
              const last = Number(info?.lastSeen || 0) || 0;
              if (last && (now - last) > VOICE_ACTIVITY_STALE_MS) {
                  cleanupVoiceCall(pid);
                  voiceParticipants.delete(pid);
                  changed = true;
              }
          });
          if (changed) renderVoiceParticipants();
      } catch (_) {}
  }

  function startVoiceActivityHeartbeats() {
      // Skip Supabase heartbeats if Cloudflare discovery is enabled
      if (VOICE_DISCOVERY_ENABLED) return;
      if (voiceActivityHeartbeatTimer) return;
      voiceActivityHeartbeatTimer = setInterval(() => {
          try {
              if (!voiceJoined || !voicePeerId || !voiceActivityChannel) return;
              pruneStaleVoiceParticipants();
              voiceActivityChannel.send({
                  type: 'broadcast',
                  event: VOICE_BROADCAST_ACTIVITY_EVENT,
                  payload: { action: 'heartbeat', peerId: voicePeerId, userId: globalChatUsername || 'User', muted: !!voiceMuted, screenSharing: !!voiceScreenSharing, ts: Date.now() }
              });
          } catch (_) {}
      }, VOICE_ACTIVITY_HEARTBEAT_MS);
  }

  function ensureVoiceActivityBanner() {
      if (voiceActivityEl) return voiceActivityEl;
      voiceActivityEl = document.createElement('div');
      voiceActivityEl.id = 'voiceActivityBanner';
      voiceActivityEl.style.position = 'fixed';
      voiceActivityEl.style.top = '56px';
      voiceActivityEl.style.left = '50%';
      voiceActivityEl.style.transform = 'translateX(-50%)';
      voiceActivityEl.style.zIndex = '29999';
      voiceActivityEl.style.padding = '10px 14px';
      voiceActivityEl.style.borderRadius = '12px';
      voiceActivityEl.style.background = 'linear-gradient(135deg, rgba(2,132,199,0.95), rgba(37,99,235,0.92))';
      voiceActivityEl.style.border = '1px solid rgba(147,197,253,0.65)';
      voiceActivityEl.style.color = '#eff6ff';
      voiceActivityEl.style.fontSize = '13px';
      voiceActivityEl.style.fontWeight = '850';
      voiceActivityEl.style.boxShadow = '0 18px 46px rgba(0,0,0,0.45)';
      voiceActivityEl.style.display = 'none';
      voiceActivityEl.style.maxWidth = 'min(820px, 92vw)';
      voiceActivityEl.style.textAlign = 'center';
      voiceActivityEl.style.userSelect = 'none';
      document.body.appendChild(voiceActivityEl);
      return voiceActivityEl;
  }

  function showVoiceActivity(text) {
      if (!text) return;
      ensureVoiceActivityBanner();
      voiceActivityEl.textContent = text;
      voiceActivityEl.style.display = 'block';
      if (voiceActivityTimer) clearTimeout(voiceActivityTimer);
      voiceActivityTimer = setTimeout(() => {
          if (voiceActivityEl) voiceActivityEl.style.display = 'none';
      }, 2600);
  }

  async function ensureVoiceActivityChannel(client) {
      // Skip Supabase activity channel if Cloudflare discovery is enabled
      if (VOICE_DISCOVERY_ENABLED) return null;
      if (!client) return null;
      if (voiceActivityChannel) return voiceActivityChannel;
      // broadcast.self=true so the sender also receives their own join/leave banner
      voiceActivityChannel = client.channel(`voice-activity:${VOICE_ROOM_ID}`, {
          config: { broadcast: { self: true } }
      });
      voiceActivityChannel.on('broadcast', { event: VOICE_BROADCAST_ACTIVITY_EVENT }, (evt) => {
          try {
              const payload = evt?.payload || {};
              const action = String(payload?.action || '');
              const userId = String(payload?.userId || '');
              if (!action) return;
              const ts = Number(payload?.ts || 0) || Date.now();
              if (userId) {
                  const last = Number(voiceActivityLastTsByUser.get(userId) || 0) || 0;
                  // Drop out-of-order delivery (prevents "left" then a delayed "joined")
                  if (ts <= last) return;
                  voiceActivityLastTsByUser.set(userId, ts);
              }

              const pid = String(payload?.peerId || '');
              const muted = !!payload?.muted;

              // --- Banner (join/leave only) ---
              if (userId && action === 'join') showVoiceActivity(`${getDisplayName(userId)} joined voice chat`);
              else if (userId && action === 'leave') showVoiceActivity(`${getDisplayName(userId)} left voice chat`);

              // --- Fallback participant discovery (no Supabase presence required) ---
              if (action === 'leave') {
                  if (pid) {
                      cleanupVoiceCall(pid);
                      voiceParticipants.delete(pid);
                      renderVoiceParticipants();
                  }
                  return;
              }

              if (action === 'who') {
                  // Someone is asking who's currently in voice; answer if we're joined.
                  if (voiceJoined && voicePeerId && voiceActivityChannel) {
                      try {
                          voiceActivityChannel.send({
                              type: 'broadcast',
                              event: VOICE_BROADCAST_ACTIVITY_EVENT,
                              payload: { action: 'here', peerId: voicePeerId, userId: globalChatUsername || 'User', muted: !!voiceMuted, screenSharing: !!voiceScreenSharing, ts: Date.now() }
                          });
                      } catch (_) {}
                  }
                  return;
              }

              // Handle screen sharing messages
              if (action === 'screenShare') {
                  const subAction = String(payload?.subAction || '');
                  if (pid && voiceParticipants.has(pid)) {
                      const info = voiceParticipants.get(pid);
                      if (info) {
                          info.screenSharing = (subAction === 'start');
                          voiceParticipants.set(pid, info);
                          renderVoiceParticipants();
                      }
                  }
                  return;
              }

              if (!pid) return;
              if (!userId) return; // need a name for participant list
              const prev = voiceParticipants.get(pid);
              const wasNew = !prev;
              voiceParticipants.set(pid, {
                  userId: String(userId || prev?.userId || ''),
                  lastSeen: ts || Date.now(),
                  lastSpokeTs: prev?.lastSpokeTs || 0,
                  speaking: !!prev?.speaking,
                  lastBroadcastTs: prev?.lastBroadcastTs || 0,
                  level: prev?.level || 0,
                  lastLevelTs: prev?.lastLevelTs || 0,
                  muted: (action === 'join' || action === 'heartbeat' || action === 'here') ? muted : !!prev?.muted,
                  connected: true,
                  screenSharing: (action === 'join' || action === 'heartbeat' || action === 'here') ? !!payload?.screenSharing : !!prev?.screenSharing
              });
              // Clear loading state when a new participant is added
              if (wasNew && voiceParticipantsLoading && pid !== voicePeerId) {
                  voiceParticipantsLoading = false;
              }
              renderVoiceParticipants();
              if (voiceJoined) {
                  maybeCallPeer(pid);
                  maybeEnsureVoiceDataConn(pid);
              }
          } catch (_) {}
      });
      // Don't let subscribe stall UI; resolve quickly.
      try {
          await Promise.race([
              new Promise((resolve) => {
                  voiceActivityChannel.subscribe((s) => {
                      if (s === 'SUBSCRIBED' || s === 'TIMED_OUT' || s === 'CHANNEL_ERROR' || s === 'CLOSED') resolve(s);
                  });
              }),
              new Promise((resolve) => setTimeout(() => resolve('TIMEOUT_LOCAL'), 900))
          ]);
      } catch (_) {}
      return voiceActivityChannel;
  }

  let voiceUi = {
      built: false,
      toggleBtn: null,
      panel: null,
      joinBtn: null,
      leaveBtn: null,
      muteBtn: null,
      statusEl: null,
      listEl: null,
      audioBucket: null,
      meterCanvas: null,
      reportsBtn: null
  };

  async function ensurePeerJs() {
      if (window.Peer) return window.Peer;
      if (peerJsLoadPromise) return peerJsLoadPromise;
      peerJsLoadPromise = new Promise((resolve, reject) => {
          const existing = document.querySelector('script[data-peerjs]');
          if (existing && window.Peer) return resolve(window.Peer);
          const s = existing || document.createElement('script');
          if (!existing) {
              s.src = 'https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js';
              s.async = true;
              s.defer = true;
              s.crossOrigin = 'anonymous';
              s.dataset.peerjs = 'true';
              document.head.appendChild(s);
          }
          const timeout = setTimeout(() => reject(new Error('PeerJS load timeout')), 10000);
          s.onload = () => {
              clearTimeout(timeout);
              if (window.Peer) resolve(window.Peer);
              else reject(new Error('PeerJS loaded but window.Peer missing'));
          };
          s.onerror = () => {
              clearTimeout(timeout);
              reject(new Error('PeerJS script failed to load'));
          };
      }).catch((err) => {
          console.warn('PeerJS load failed', err);
          peerJsLoadPromise = null;
          return null;
      });
      return peerJsLoadPromise;
  }

  function setVoiceStatus(text, isError = false) {
      if (!voiceUi.statusEl) return;
      voiceUi.statusEl.textContent = text || '';
      voiceUi.statusEl.style.color = isError ? '#fecaca' : 'rgba(226,232,240,0.85)';
  }

  function loadVoiceLocalMutes() {
      try {
          const raw = localStorage.getItem(VOICE_LOCAL_MUTES_KEY);
          const arr = JSON.parse(raw || '[]');
          voiceLocallyMutedPeers = new Set(Array.isArray(arr) ? arr.map(String) : []);
      } catch (_) {
          voiceLocallyMutedPeers = new Set();
      }
  }
  function saveVoiceLocalMutes() {
      try {
          localStorage.setItem(VOICE_LOCAL_MUTES_KEY, JSON.stringify(Array.from(voiceLocallyMutedPeers)));
      } catch (_) {}
  }
  function isPeerLocallyMuted(peerId) {
      if (!peerId) return false;
      return voiceLocallyMutedPeers.has(String(peerId));
  }
  function applyLocalMuteToAudio(peerId) {
      try {
          if (!voiceUi.audioBucket) return;
          // Ensure we're not affecting our own audio
          if (String(peerId) === String(voicePeerId)) return;
          const audio = voiceUi.audioBucket.querySelector(`audio[data-peer-id="${peerId}"]`);
          if (!audio) return;
          audio.volume = isPeerLocallyMuted(peerId) ? 0 : 1;
          // Don't affect speaking state - this is just volume control
      } catch (_) {}
  }
  function toggleLocalMutePeer(peerId) {
      if (!peerId) return;
      const id = String(peerId);
      // Ensure we're not muting ourselves
      if (id === String(voicePeerId)) {
          console.warn('Cannot locally mute yourself');
          return;
      }
      if (voiceLocallyMutedPeers.has(id)) {
          voiceLocallyMutedPeers.delete(id);
      } else {
          voiceLocallyMutedPeers.add(id);
      }
      saveVoiceLocalMutes();
      applyLocalMuteToAudio(id);
      // Only re-render participants, don't affect speaking state
      renderVoiceParticipants();
  }

  function getVoiceGateState() {
      try { return String(localStorage.getItem(VOICE_GATE_KEY) || ''); } catch (_) { return ''; }
  }
  function setVoiceGateState(state) {
      try { localStorage.setItem(VOICE_GATE_KEY, String(state || '')); } catch (_) {}
  }

  function ensureVoiceGateModal() {
      if (voiceGateModalEl) return voiceGateModalEl;
      const overlay = document.createElement('div');
      overlay.id = 'voiceGateModal';
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.zIndex = '999999';
      overlay.style.display = 'none';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.padding = '16px';
      overlay.style.background = 'rgba(0,0,0,0.65)';
      overlay.style.backdropFilter = 'blur(6px)';
      overlay.innerHTML = `
        <div style="width:min(720px, 96vw); max-height:82vh; overflow:auto; border-radius:16px; border:1px solid rgba(255,255,255,0.14); background:linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,0.98)); box-shadow:0 24px 80px rgba(0,0,0,0.55); padding:16px 16px 14px;">
          <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px;">
            <div>
              <div style="font-weight:950; letter-spacing:0.2px; font-size:16px; color:#e2e8f0;">Voice chat safety & rules</div>
              <div style="margin-top:6px; font-size:12px; color:rgba(226,232,240,0.78); line-height:1.35;">Voice chat connects you to other users live. Don’t share personal info. Others may record.</div>
            </div>
            <button data-voice-gate-close="1" style="border:none; background:rgba(255,255,255,0.06); color:rgba(226,232,240,0.9); font-weight:900; border-radius:10px; padding:8px 10px; cursor:pointer;">Close</button>
          </div>

          <div style="margin-top:12px; padding:12px; border-radius:14px; border:1px solid rgba(255,255,255,0.10); background:rgba(255,255,255,0.04);">
            <div style="font-weight:900; color:#f1f5f9; font-size:13px;">Risks (read before joining)</div>
            <ul style="margin:8px 0 0 18px; padding:0; color:rgba(226,232,240,0.82); font-size:12px; line-height:1.35;">
              <li>People may say harmful or explicit things.</li>
              <li>Others can record audio without your permission.</li>
              <li>Sharing personal info can put you at risk.</li>
              <li>Not every session is actively moderated in real-time.</li>
            </ul>
          </div>

          <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
            <a href="/terms.html" target="_blank" rel="noopener" style="font-size:12px; font-weight:900; color:#93c5fd; text-decoration:none;">Read Terms</a>
            <a href="/privacy.html" target="_blank" rel="noopener" style="font-size:12px; font-weight:900; color:#93c5fd; text-decoration:none;">Read Privacy Policy</a>
          </div>

          <div style="margin-top:12px; padding:12px; border-radius:14px; border:1px solid rgba(255,255,255,0.10); background:rgba(255,255,255,0.03);">
            <label style="display:flex; align-items:center; gap:8px; font-size:12px; color:rgba(226,232,240,0.9); font-weight:800;">
              <input type="checkbox" data-voice-accept="1" style="width:16px; height:16px;" />
              I have read and agree to the Terms and Privacy Policy
            </label>
            <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
              <button data-voice-age-adult="1" style="flex:1; min-width:220px; padding:10px 12px; border:none; border-radius:12px; background:linear-gradient(135deg, #10b981, #06b6d4); color:#07121a; font-weight:950; cursor:pointer;">I am 18 or older</button>
              <button data-voice-age-minor="1" style="flex:1; min-width:220px; padding:10px 12px; border:none; border-radius:12px; background:rgba(255,255,255,0.06); color:rgba(226,232,240,0.92); font-weight:950; cursor:pointer;">I am younger than 18</button>
            </div>
            <div data-voice-gate-hint="1" style="margin-top:8px; font-size:12px; color:rgba(226,232,240,0.70); line-height:1.35;"></div>
          </div>
        </div>
      `;
      overlay.addEventListener('click', (e) => {
          if (e.target === overlay) overlay.style.display = 'none';
      });
      document.body.appendChild(overlay);
      voiceGateModalEl = overlay;
      return overlay;
  }

  async function openVoiceGateModal({ afterAccept } = {}) {
      ensureVoiceGateModal();
      const el = voiceGateModalEl;
      const closeBtn = el.querySelector('[data-voice-gate-close="1"]');
      const acceptCb = el.querySelector('[data-voice-accept="1"]');
      const adultBtn = el.querySelector('[data-voice-age-adult="1"]');
      const minorBtn = el.querySelector('[data-voice-age-minor="1"]');
      const hint = el.querySelector('[data-voice-gate-hint="1"]');
      if (hint) hint.textContent = '';
      if (acceptCb) acceptCb.checked = false;
      el.style.display = 'flex';

      const cleanup = () => {
          closeBtn?.removeEventListener('click', onClose);
          adultBtn?.removeEventListener('click', onAdult);
          minorBtn?.removeEventListener('click', onMinor);
      };
      const onClose = () => { el.style.display = 'none'; cleanup(); };
      const onMinor = () => {
          setVoiceGateState('under18_declined');
          if (hint) hint.textContent = 'Okay — voice chat will not be joined. You can click Voice again if you selected this by mistake.';
          setTimeout(() => { el.style.display = 'none'; cleanup(); }, 650);
      };
      const onAdult = () => {
          if (!acceptCb?.checked) {
              if (hint) hint.textContent = 'To join voice chat, you must agree to the Terms and Privacy Policy.';
              return;
          }
          setVoiceGateState('adult_accepted');
          el.style.display = 'none';
          cleanup();
          // Open science page in about:blank wrapper
          const scienceUrl = window.location.pathname.includes('/pages/') 
              ? 'science.html' 
              : 'pages/science.html';
          if (typeof openGameInBlank === 'function') {
              openGameInBlank(scienceUrl);
          } else {
              window.open(scienceUrl, '_blank');
          }
          if (typeof afterAccept === 'function') afterAccept();
      };
      closeBtn?.addEventListener('click', onClose);
      adultBtn?.addEventListener('click', onAdult);
      minorBtn?.addEventListener('click', onMinor);
  }

  // -------- "New edition" one-time popup --------
  const NEW_EDITION_POPUP_KEY = 'new_edition_voicechat_popup_v1';
  let newEditionPopupEl = null;

  function ensureNewEditionPopup() {
      if (newEditionPopupEl) return newEditionPopupEl;
      const overlay = document.createElement('div');
      overlay.id = 'newEditionPopup';
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.zIndex = '999998';
      overlay.style.display = 'none';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.padding = '16px';
      overlay.style.background = 'rgba(0,0,0,0.62)';
      overlay.style.backdropFilter = 'blur(6px)';

      overlay.innerHTML = `
        <div style="width:min(560px, 96vw); border-radius:16px; border:1px solid rgba(255,255,255,0.14); background:linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,0.98)); box-shadow:0 24px 80px rgba(0,0,0,0.55); padding:14px 14px 12px;">
          <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:10px;">
            <div>
              <div style="font-weight:950; font-size:15px; color:#e2e8f0; letter-spacing:0.2px;">New edition</div>
              <div style="margin-top:6px; font-size:12px; color:rgba(226,232,240,0.78); line-height:1.35;">
                <strong>Voice chat</strong> is now available in chat. Look for the <strong>Voice</strong> button.
              </div>
            </div>
            <button data-newedition-close="1" style="border:none; background:rgba(255,255,255,0.06); color:rgba(226,232,240,0.9); font-weight:900; border-radius:10px; padding:8px 10px; cursor:pointer;">Close</button>
          </div>

          <div style="margin-top:12px; padding:12px; border-radius:14px; border:1px solid rgba(255,255,255,0.10); background:rgba(255,255,255,0.04);">
            <div style="font-weight:900; color:#f1f5f9; font-size:13px;">Quick heads up</div>
            <ul style="margin:8px 0 0 18px; padding:0; color:rgba(226,232,240,0.82); font-size:12px; line-height:1.35;">
              <li>Voice chat is <strong>18+</strong> and requires agreeing to Terms & Privacy.</li>
              <li>Other people may record audio. Don’t share personal info.</li>
            </ul>
          </div>

          <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
            <a href="/terms.html" target="_blank" rel="noopener" style="font-size:12px; font-weight:900; color:#93c5fd; text-decoration:none;">Read Terms</a>
            <a href="/privacy.html" target="_blank" rel="noopener" style="font-size:12px; font-weight:900; color:#93c5fd; text-decoration:none;">Read Privacy Policy</a>
          </div>

          <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end;">
            <button data-newedition-ok="1" style="padding:10px 12px; border:none; border-radius:12px; background:linear-gradient(135deg, #10b981, #06b6d4); color:#07121a; font-weight:950; cursor:pointer;">Got it</button>
          </div>
        </div>
      `;

      overlay.addEventListener('click', (e) => {
          if (e.target === overlay) {
              overlay.style.display = 'none';
              try { localStorage.setItem(NEW_EDITION_POPUP_KEY, '1'); } catch (_) {}
          }
      });
      document.body.appendChild(overlay);
      newEditionPopupEl = overlay;
      return overlay;
  }

  function showNewEditionPopupOnce() {
      try {
          if (localStorage.getItem(NEW_EDITION_POPUP_KEY) === '1') return;
      } catch (_) {}
      const el = ensureNewEditionPopup();
      el.style.display = 'flex';
      const closeBtn = el.querySelector('[data-newedition-close="1"]');
      const okBtn = el.querySelector('[data-newedition-ok="1"]');
      const finish = () => {
          el.style.display = 'none';
          try { localStorage.setItem(NEW_EDITION_POPUP_KEY, '1'); } catch (_) {}
          closeBtn?.removeEventListener('click', finish);
          okBtn?.removeEventListener('click', finish);
      };
      closeBtn?.addEventListener('click', finish);
      okBtn?.addEventListener('click', finish);
  }

  document.addEventListener('DOMContentLoaded', () => {
      showNewEditionPopupOnce();
  }, { once: true });

  function ensureVoiceUi() {
      if (voiceUi.built) return;
      voiceUi.built = true;
      loadVoiceLocalMutes();

      // Insert Voice button next to Settings button (works on chat-only page too)
      if (globalChatSettingsBtn && globalChatSettingsBtn.parentElement) {
          const btn = document.createElement('button');
          btn.id = 'globalChatVoiceBtn';
          btn.innerHTML = '<i class="fas fa-microphone"></i> Voice';
          btn.style.padding = '10px 12px';
          btn.style.border = 'none';
          btn.style.borderRadius = '10px';
          btn.style.background = 'linear-gradient(135deg, #10b981, #06b6d4)';
          btn.style.color = '#07121a';
          btn.style.fontWeight = '800';
          btn.style.cursor = 'pointer';
          btn.style.display = 'flex';
          btn.style.alignItems = 'center';
          btn.style.gap = '8px';
          globalChatSettingsBtn.parentElement.insertBefore(btn, globalChatSettingsBtn);
          voiceUi.toggleBtn = btn;
      }

      const panel = document.createElement('div');
      panel.id = 'globalChatVoicePanel';
      panel.style.display = 'none';
      panel.style.padding = '12px';
      panel.style.borderRadius = '14px';
      panel.style.border = '1px solid rgba(255,255,255,0.10)';
      panel.style.background = 'rgba(255,255,255,0.04)';
      panel.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.06)';
      panel.style.position = 'relative';
      panel.style.width = '100%';
      panel.style.maxWidth = '100%';

      panel.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; padding-bottom:16px; border-bottom:2px solid rgba(255,255,255,0.1); margin-bottom:20px;">
          <div style="font-weight:900; letter-spacing:0.5px; color:#d1fae5; font-size:20px;">
            <i class="fas fa-headset"></i> Voice Chat
          </div>
          <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
            <button id="voiceLeaveBtn" style="padding:10px 18px; border:none; border-radius:12px; background:rgba(248,113,113,0.25); color:#fecaca; font-weight:800; cursor:pointer; display:none; font-size:14px; transition:all 0.2s;">Leave</button>
            <button id="voiceMuteBtn" style="padding:10px 18px; border:none; border-radius:12px; background:rgba(255,255,255,0.12); color:#e5e7eb; font-weight:800; cursor:pointer; display:none; font-size:14px; transition:all 0.2s;">Mute</button>
            <button id="voiceReportsBtn" style="display:none; padding:10px 18px; border:none; border-radius:12px; background:rgba(59,130,246,0.2); color:#bfdbfe; font-weight:900; cursor:pointer; font-size:14px; transition:all 0.2s;">Reports</button>
          </div>
        </div>
        <div id="voiceJoinBtnContainer" style="width:100%; display:flex !important; justify-content:center !important; align-items:center !important; margin:60px 0; padding:0;">
          <button id="voiceJoinBtn" style="padding:24px 60px; border:3px solid rgba(16,185,129,0.6); border-radius:20px; background:linear-gradient(135deg, rgba(16,185,129,0.4), rgba(6,182,212,0.4)); color:#bbf7d0; font-weight:900; font-size:24px; cursor:pointer; letter-spacing:1px; box-shadow:0 8px 30px rgba(16,185,129,0.35); transition:all 0.3s; min-width:300px;">Join Voice Chat</button>
        </div>
        <div id="voiceStatus" style="margin-top:8px; font-size:12px; color:rgba(226,232,240,0.85);"></div>
        <div style="margin-top:10px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <div style="font-size:12px; color:rgba(226,232,240,0.75); font-weight:800;">Mic</div>
          <canvas id="voiceMeter" width="220" height="26" style="width:220px; height:26px; border-radius:999px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.10);"></canvas>
        </div>
        <div style="margin-top:20px; font-size:16px; color:rgba(226,232,240,0.9); font-weight:900; letter-spacing:0.5px;">Participants</div>
        <div id="voiceParticipants" style="margin-top:16px; display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:16px; width:100%; padding-bottom:20px; align-items:start;"></div>
      `;

      if (globalChatPanel && globalChatBox && globalChatBox.parentElement === globalChatPanel) {
          globalChatPanel.insertBefore(panel, globalChatBox);
      } else if (globalChatPanel) {
          globalChatPanel.insertBefore(panel, globalChatPanel.firstChild || null);
      }

      voiceUi.panel = panel;
      voiceUi.joinBtn = panel.querySelector('#voiceJoinBtn');
      voiceUi.joinBtnContainer = panel.querySelector('#voiceJoinBtnContainer');
      voiceUi.leaveBtn = panel.querySelector('#voiceLeaveBtn');
      voiceUi.muteBtn = panel.querySelector('#voiceMuteBtn');
      voiceUi.shareScreenBtn = panel.querySelector('#voiceShareScreenBtn');
      voiceUi.statusEl = panel.querySelector('#voiceStatus');
      voiceUi.listEl = panel.querySelector('#voiceParticipants');
      voiceUi.meterCanvas = panel.querySelector('#voiceMeter');
      voiceUi.reportsBtn = panel.querySelector('#voiceReportsBtn');

      voiceUi.audioBucket = document.createElement('div');
      voiceUi.audioBucket.style.display = 'none';
      voiceUi.audioBucket.style.position = 'absolute';
      voiceUi.audioBucket.style.left = '-9999px';
      voiceUi.audioBucket.style.width = '1px';
      voiceUi.audioBucket.style.height = '1px';
      voiceUi.audioBucket.style.overflow = 'hidden';
      document.body.appendChild(voiceUi.audioBucket); // Put in body to ensure it works

      const togglePanel = () => {
          panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
          if (panel.style.display !== 'none' && globalChatUsername === '%Owner%' && voiceUi.reportsBtn) {
              voiceUi.reportsBtn.style.display = 'inline-block';
          }
          // Pre-join participant preview
          if (panel.style.display !== 'none' && !voiceJoined) {
              if (VOICE_DISCOVERY_ENABLED) {
                  try { ensureVoiceDiscoveryObserver(); } catch (_) {}
              } else {
                  initGlobalChatClient().then((client) => {
                      try { ensureVoiceObserverChannel(client); } catch (_) {}
                  });
              }
          }
      };

      voiceUi.toggleBtn?.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          // Open the voice chat panel in full-page mode
          if (voiceUi.panel) {
              // Move panel to body if not already there
              if (voiceUi.panel.parentElement !== document.body) {
                  document.body.appendChild(voiceUi.panel);
              }
              
              // Apply full-page styles
              voiceUi.panel.style.setProperty('display', 'block', 'important');
              voiceUi.panel.style.setProperty('position', 'fixed', 'important');
              voiceUi.panel.style.setProperty('top', '0', 'important');
              voiceUi.panel.style.setProperty('left', '0', 'important');
              voiceUi.panel.style.setProperty('right', '0', 'important');
              voiceUi.panel.style.setProperty('bottom', '0', 'important');
              voiceUi.panel.style.setProperty('width', '100vw', 'important');
              voiceUi.panel.style.setProperty('height', '100vh', 'important');
              voiceUi.panel.style.setProperty('max-width', '100vw', 'important');
              voiceUi.panel.style.setProperty('max-height', '100vh', 'important');
              voiceUi.panel.style.setProperty('padding', '24px', 'important');
              voiceUi.panel.style.setProperty('border-radius', '0', 'important');
              voiceUi.panel.style.setProperty('z-index', '99999', 'important');
              voiceUi.panel.style.setProperty('overflow-y', 'auto', 'important');
              voiceUi.panel.style.setProperty('background', 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.95))', 'important');
              voiceUi.panel.style.setProperty('border', 'none', 'important');
              voiceUi.panel.style.setProperty('box-shadow', 'none', 'important');
              voiceUi.panel.style.setProperty('margin', '0', 'important');
          }
      });
      voiceUi.joinBtn?.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          joinVoiceChat();
      });
      voiceUi.leaveBtn?.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          leaveVoiceChat();
      });
      voiceUi.muteBtn?.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleVoiceMute();
      });
      voiceUi.reportsBtn?.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openVoiceReportsInbox();
      });
  }

  function renderVoiceParticipants() {
      if (!voiceUi.listEl) return;
      const items = Array.from(voiceParticipants.entries())
          .sort((a, b) => String(a[1]?.userId || '').localeCompare(String(b[1]?.userId || '')));
      
      // Show loading animation if loading and no participants yet (excluding self)
      const otherParticipants = items.filter(([pid]) => pid !== voicePeerId);
      if (voiceParticipantsLoading && voiceJoined && otherParticipants.length === 0) {
          voiceUi.listEl.innerHTML = `
              <div style="padding:20px; text-align:center; color:rgba(226,232,240,0.8);">
                  <div style="display:inline-block; margin-bottom:12px;">
                      <div style="width:40px; height:40px; border:3px solid rgba(16,185,129,0.3); border-top-color:rgba(16,185,129,0.9); border-radius:50%; animation:spin 0.8s linear infinite;"></div>
                  </div>
                  <div style="font-size:13px; font-weight:800; color:rgba(226,232,240,0.9);">Loading users...</div>
              </div>
              <style>
                  @keyframes spin {
                      to { transform: rotate(360deg); }
                  }
              </style>
          `;
          return;
      }
      
      voiceUi.listEl.innerHTML = '';
      items.forEach(([peerId, info]) => {
          const chip = document.createElement('div');
          chip.dataset.peerId = peerId;
          chip.style.display = 'flex';
          chip.style.flexDirection = 'column';
          chip.style.gap = '12px';
          chip.style.padding = '20px';
          chip.style.borderRadius = '16px';
          chip.style.minHeight = '160px';
          chip.style.position = 'relative';
          chip.style.overflow = 'hidden';
          const speaking = !!info?.speaking;
          const connected = !!info?.connected;
          const muted = !!info?.muted;
          const isMe = peerId === voicePeerId;
          chip.style.background = speaking
              ? 'linear-gradient(135deg, rgba(134,239,172,0.4), rgba(74,222,128,0.3))'
              : isMe
              ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))'
              : 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))';
          chip.style.border = speaking 
              ? '2px solid rgba(134,239,172,0.8)' 
              : isMe
              ? '2px solid rgba(99,102,241,0.5)'
              : '2px solid rgba(255,255,255,0.12)';
          chip.style.boxShadow = speaking 
              ? '0 8px 24px rgba(134,239,172,0.3), 0 0 0 1px rgba(134,239,172,0.2) inset' 
              : '0 4px 12px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.05) inset';
          chip.style.transition = 'all 0.3s ease';
          chip.style.width = '100%';
          chip.style.boxSizing = 'border-box';

          // Avatar/Icon section
          const avatarSection = document.createElement('div');
          avatarSection.style.display = 'flex';
          avatarSection.style.flexDirection = 'column';
          avatarSection.style.alignItems = 'center';
          avatarSection.style.gap = '8px';
          avatarSection.style.marginBottom = '4px';
          avatarSection.style.width = '100%';
          
          const avatar = document.createElement('div');
          avatar.style.width = '60px';
          avatar.style.height = '60px';
          avatar.style.borderRadius = '50%';
          avatar.style.background = speaking
              ? 'linear-gradient(135deg, rgba(134,239,172,0.95), rgba(74,222,128,0.85))'
              : isMe
              ? 'linear-gradient(135deg, rgba(99,102,241,0.9), rgba(139,92,246,0.7))'
              : 'linear-gradient(135deg, rgba(148,163,184,0.6), rgba(100,116,139,0.4))';
          avatar.style.display = 'flex';
          avatar.style.alignItems = 'center';
          avatar.style.justifyContent = 'center';
          avatar.style.fontSize = '24px';
          avatar.style.fontWeight = '900';
          avatar.style.color = '#ffffff';
          avatar.style.border = speaking ? '3px solid rgba(134,239,172,0.9)' : '3px solid rgba(255,255,255,0.2)';
          avatar.style.boxShadow = speaking 
              ? '0 0 20px rgba(134,239,172,0.5)' 
              : '0 4px 12px rgba(0,0,0,0.2)';
          const initials = (getDisplayName(info?.userId || peerId.slice(0, 8)) || 'U').substring(0, 2).toUpperCase();
          avatar.textContent = initials;
          
          const statusDot = document.createElement('div');
          statusDot.dataset.peerDot = '1';
          statusDot.style.width = '14px';
          statusDot.style.height = '14px';
          statusDot.style.borderRadius = '50%';
          statusDot.style.background = connected ? 'rgba(34,197,94,1)' : 'rgba(239,68,68,1)';
          statusDot.style.border = '2px solid rgba(15,23,42,0.9)';
          statusDot.style.boxShadow = connected ? '0 0 8px rgba(34,197,94,0.6)' : '0 0 8px rgba(239,68,68,0.4)';
          statusDot.style.position = 'absolute';
          statusDot.style.top = '12px';
          statusDot.style.right = '12px';
          statusDot.style.zIndex = '10';
          
          avatarSection.appendChild(avatar);

          const topRow = document.createElement('div');
          topRow.style.display = 'flex';
          topRow.style.flexDirection = 'column';
          topRow.style.alignItems = 'center';
          topRow.style.gap = '6px';
          topRow.style.width = '100%';
          topRow.style.flexShrink = '0';

          const name = document.createElement('div');
          name.textContent = getDisplayName(info?.userId || peerId.slice(0, 8));
          name.style.fontSize = '14px';
          name.style.fontWeight = '900';
          name.style.color = speaking ? '#86efac' : isMe ? '#c4b5fd' : 'rgba(226,232,240,0.95)';
          name.style.textAlign = 'center';
          name.style.letterSpacing = '0.5px';
          
          const statusText = document.createElement('div');
          statusText.style.fontSize = '11px';
          statusText.style.fontWeight = '700';
          statusText.style.color = muted 
              ? 'rgba(239,68,68,0.9)' 
              : speaking 
              ? 'rgba(134,239,172,0.95)' 
              : 'rgba(148,163,184,0.8)';
          statusText.textContent = muted ? 'Muted' : speaking ? 'Speaking' : isMe ? 'You' : 'Connected';
          statusText.style.textAlign = 'center';

          topRow.appendChild(name);
          topRow.appendChild(statusText);

          const right = document.createElement('div');
          right.style.display = 'flex';
          right.style.alignItems = 'center';
          right.style.justifyContent = 'center';
          right.style.gap = '6px';
          right.style.marginTop = '6px';
          right.style.flexWrap = 'wrap';
          right.style.width = '100%';
          right.style.flexShrink = '0';

          // Local-only mute toggle (doesn't affect others)
          if (voicePeerId && peerId !== voicePeerId) {
              const localMuted = isPeerLocallyMuted(peerId);
              const btn = document.createElement('button');
              btn.type = 'button';
              btn.textContent = localMuted ? 'Unmute' : 'Mute';
              btn.style.padding = '8px 14px';
              btn.style.borderRadius = '10px';
              btn.style.border = '1px solid rgba(255,255,255,0.15)';
              btn.style.background = localMuted ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.1)';
              btn.style.color = localMuted ? '#fecaca' : 'rgba(226,232,240,0.95)';
              btn.style.fontWeight = '800';
              btn.style.cursor = 'pointer';
              btn.style.fontSize = '12px';
              btn.style.transition = 'all 0.2s ease';
              btn.addEventListener('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleLocalMutePeer(peerId);
              });
              right.appendChild(btn);
          }

          // Report (everyone, except self)
          if (voicePeerId && peerId !== voicePeerId) {
              const reportBtn = document.createElement('button');
              reportBtn.type = 'button';
              reportBtn.textContent = 'Report';
              reportBtn.style.padding = '8px 14px';
              reportBtn.style.borderRadius = '10px';
              reportBtn.style.border = '1px solid rgba(255,255,255,0.15)';
              reportBtn.style.background = 'rgba(59,130,246,0.2)';
              reportBtn.style.color = '#bfdbfe';
              reportBtn.style.fontWeight = '800';
              reportBtn.style.cursor = 'pointer';
              reportBtn.style.fontSize = '12px';
              reportBtn.style.transition = 'all 0.2s ease';
              reportBtn.addEventListener('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openVoiceReportModal(String(info?.userId || ''));
              });
              right.appendChild(reportBtn);
          }

          // Audio level meter
          const meterOuter = document.createElement('div');
          meterOuter.dataset.peerMeter = '1';
          meterOuter.style.width = '100%';
          meterOuter.style.height = '8px';
          meterOuter.style.borderRadius = '999px';
          meterOuter.style.background = 'rgba(15,23,42,0.6)';
          meterOuter.style.border = '1px solid rgba(255,255,255,0.1)';
          meterOuter.style.overflow = 'hidden';
          meterOuter.style.marginTop = '8px';
          meterOuter.style.flexShrink = '0';

          const meterFill = document.createElement('div');
          meterFill.dataset.peerMeterFill = '1';
          meterFill.style.height = '100%';
          meterFill.style.width = '0%';
          meterFill.style.borderRadius = '999px';
          meterFill.style.background = muted
              ? 'linear-gradient(90deg, rgba(239,68,68,0.95), rgba(220,38,38,0.9))'
              : (speaking 
                  ? 'linear-gradient(90deg, rgba(134,239,172,0.95), rgba(74,222,128,0.9))' 
                  : 'linear-gradient(90deg, rgba(99,102,241,0.9), rgba(139,92,246,0.8))');
          meterFill.style.transition = 'width 80ms linear';
          meterFill.style.boxShadow = speaking ? '0 0 8px rgba(134,239,172,0.6)' : 'none';
          meterOuter.appendChild(meterFill);

          // Build structure properly
          chip.appendChild(statusDot); // Status dot first (absolute positioned)
          chip.appendChild(avatarSection);
          chip.appendChild(topRow);
          chip.appendChild(right);
          chip.appendChild(meterOuter);
          
          // Ensure chip is properly sized for grid
          chip.style.minWidth = '0';
          chip.style.maxWidth = '100%';

          const lvl = Math.max(0, Math.min(1, Number(info?.level) || 0));
          meterFill.style.width = `${Math.round(lvl * 100)}%`;

          voiceUi.listEl.appendChild(chip);
      });
  }

  function cleanupVoiceCall(remotePeerId) {
      const call = voiceCalls.get(remotePeerId);
      if (call) {
          try { call.close(); } catch (_) {}
      }
      voiceCalls.delete(remotePeerId);
      cleanupVoiceDataConn(remotePeerId);
      if (voiceUi.audioBucket) {
          const el = voiceUi.audioBucket.querySelector(`audio[data-peer-id="${remotePeerId}"]`);
          if (el) el.remove();
      }
      // Remove video element if it exists
      if (voiceUi.videoBucket) {
          const videoEl = voiceUi.videoBucket.querySelector(`video[data-peer-id="${remotePeerId}"]`);
          if (videoEl) {
              const container = videoEl.closest('div');
              if (container) container.remove();
          }
      }
      stopRemoteSpeakingMeter(remotePeerId);
      const info = voiceParticipants.get(remotePeerId);
      if (info) voiceParticipants.set(remotePeerId, { ...info, connected: false, speaking: false });
      renderVoiceParticipants();
  }

  function checkCallForVideo(peerId) {
      // Check if an existing call has video tracks that we haven't displayed yet
      const call = voiceCalls.get(peerId);
      if (!call || !call.peerConnection) return;
      
      try {
          // First, check if call has a remoteStream property with video
          if (call.remoteStream) {
              const videoTracks = call.remoteStream.getVideoTracks();
              if (videoTracks.length > 0) {
                  const existingVideo = voiceUi.videoBucket?.querySelector(`video[data-peer-id="${peerId}"]`);
                  if (!existingVideo) {
                      attachRemoteAudio(peerId, call.remoteStream);
                      return;
                  }
              }
          }
          
          // Also check receivers for video tracks
          const receivers = call.peerConnection.getReceivers();
          const videoReceivers = receivers.filter(r => r.track && r.track.kind === 'video' && r.track.readyState === 'live');
          if (videoReceivers.length > 0) {
              const existingVideo = voiceUi.videoBucket?.querySelector(`video[data-peer-id="${peerId}"]`);
              if (!existingVideo) {
                  // Create a stream from all video tracks
                  const videoStream = new MediaStream(videoReceivers.map(r => r.track));
                  attachRemoteAudio(peerId, videoStream);
              }
          }
      } catch (_) {}
  }

  function attachRemoteAudio(remotePeerId, stream) {
      if (!voiceUi.audioBucket) return;
      if (!stream) return;
      
      // Check if stream has audio tracks
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
          // No audio tracks in this stream, skip
          return;
      }
      
      let audio = voiceUi.audioBucket.querySelector(`audio[data-peer-id="${remotePeerId}"]`);
      if (!audio) {
          audio = document.createElement('audio');
          audio.autoplay = true;
          audio.playsInline = true;
          audio.dataset.peerId = remotePeerId;
          audio.setAttribute('playsinline', 'true');
          audio.setAttribute('autoplay', 'true');
          voiceUi.audioBucket.appendChild(audio);
      }
      
      try {
          // Use the original stream directly - don't create a new one as it breaks track references
          // Only update srcObject if it's different to avoid interrupting playback
          if (audio.srcObject !== stream) {
              audio.srcObject = stream;
          }
          audio.volume = isPeerLocallyMuted(remotePeerId) ? 0 : 1;
          
          // Force play with error handling
          const playPromise = audio.play();
          if (playPromise !== undefined) {
              playPromise.then(() => {
                  console.log('Audio playing for', remotePeerId);
              }).catch(err => {
                  console.warn('Audio play failed for', remotePeerId, err);
                  // Try again after a short delay - user interaction might be needed
                  setTimeout(() => {
                      try {
                          audio.play().catch(() => {});
                      } catch (_) {}
                  }, 500);
              });
          }
          
          // Ensure audio is not muted
          audio.muted = false;
          
          // Listen for when audio tracks are added to the stream
          stream.getAudioTracks().forEach(track => {
              track.onended = () => {
                  console.log('Audio track ended for', remotePeerId);
              };
              track.onmute = () => {
                  console.warn('Audio track muted for', remotePeerId);
              };
              track.onunmute = () => {
                  console.log('Audio track unmuted for', remotePeerId);
                  // Try to play again when unmuted
                  try {
                      audio.play().catch(() => {});
                  } catch (_) {}
              };
          });
      } catch (err) {
          console.warn('Error attaching remote audio for', remotePeerId, err);
      }
      // Check for video tracks and display screen share
      try {
          const videoTracks = stream.getVideoTracks();
          if (videoTracks.length > 0) {
              // Display video in voice UI
              if (!voiceUi.videoBucket) {
                  voiceUi.videoBucket = document.createElement('div');
                  voiceUi.videoBucket.id = 'voiceVideoBucket';
                  voiceUi.videoBucket.style.position = 'fixed';
                  voiceUi.videoBucket.style.top = '80px';
                  voiceUi.videoBucket.style.right = '20px';
                  voiceUi.videoBucket.style.zIndex = '10000';
                  voiceUi.videoBucket.style.maxWidth = 'min(800px, 90vw)';
                  voiceUi.videoBucket.style.maxHeight = 'min(600px, 80vh)';
                  document.body.appendChild(voiceUi.videoBucket);
              }
              
              const info = voiceParticipants.get(remotePeerId);
              const userName = info?.userId || 'User';
              
              // Remove existing video for this peer
              const existingVideo = voiceUi.videoBucket.querySelector(`video[data-peer-id="${remotePeerId}"]`);
              if (existingVideo) existingVideo.remove();
              
              // Create video container
              const videoContainer = document.createElement('div');
              videoContainer.style.position = 'relative';
              videoContainer.style.background = 'rgba(0,0,0,0.9)';
              videoContainer.style.borderRadius = '12px';
              videoContainer.style.padding = '12px';
              videoContainer.style.marginBottom = '12px';
              videoContainer.style.border = '2px solid rgba(139,92,246,0.5)';
              videoContainer.style.boxShadow = '0 8px 32px rgba(0,0,0,0.5)';
              
              const videoTitle = document.createElement('div');
              videoTitle.textContent = `${getDisplayName(userName)} is sharing`;
              videoTitle.style.color = '#c4b5fd';
              videoTitle.style.fontWeight = '900';
              videoTitle.style.fontSize = '14px';
              videoTitle.style.marginBottom = '8px';
              
              const video = document.createElement('video');
              video.autoplay = true;
              video.playsInline = true;
              video.controls = false;
              video.dataset.peerId = remotePeerId;
              video.style.width = '100%';
              video.style.height = 'auto';
              video.style.borderRadius = '8px';
              video.style.background = '#000';
              
              const closeBtn = document.createElement('button');
              closeBtn.innerHTML = '&times;';
              closeBtn.style.position = 'absolute';
              closeBtn.style.top = '8px';
              closeBtn.style.right = '8px';
              closeBtn.style.width = '32px';
              closeBtn.style.height = '32px';
              closeBtn.style.borderRadius = '50%';
              closeBtn.style.border = 'none';
              closeBtn.style.background = 'rgba(239,68,68,0.9)';
              closeBtn.style.color = '#fff';
              closeBtn.style.fontSize = '20px';
              closeBtn.style.cursor = 'pointer';
              closeBtn.style.fontWeight = '900';
              closeBtn.style.display = 'flex';
              closeBtn.style.alignItems = 'center';
              closeBtn.style.justifyContent = 'center';
              closeBtn.onclick = () => videoContainer.remove();
              
              videoContainer.appendChild(videoTitle);
              videoContainer.appendChild(video);
              videoContainer.appendChild(closeBtn);
              voiceUi.videoBucket.appendChild(videoContainer);
              
              video.srcObject = stream;
              video.play().catch(() => {});
              
              // Also call the window function if it exists (for compatibility)
              if (typeof window.onRemoteVideoStream === 'function') {
              window.onRemoteVideoStream(remotePeerId, stream);
              }
          }
      } catch (_) {}
      const info = voiceParticipants.get(remotePeerId);
      if (info) voiceParticipants.set(remotePeerId, { ...info, connected: true });
      startRemoteSpeakingMeter(remotePeerId, stream);
      renderVoiceParticipants();
  }

  function maybeCallPeer(remotePeerId) {
      if (!voiceJoined || !voicePeer || !voicePeerId || !voiceLocalStream) return;
      if (!remotePeerId || remotePeerId === voicePeerId) return;
      if (voiceCalls.has(remotePeerId)) return;
      // Respect owner moderation (don't connect to banned/timed-out users)
      try {
          const info = voiceParticipants.get(remotePeerId);
          const uid = String(info?.userId || '');
          const block = getVoiceBlockReason(uid);
          if (block.blocked) return;
      } catch (_) {}
      // Avoid double-calling: only initiate when our peerId sorts lower
      if (String(voicePeerId) > String(remotePeerId)) return;
      try {
          // Create combined stream with audio and video (if screen sharing)
          let streamToSend = voiceLocalStream;
          if (voiceScreenSharing && voiceScreenStream) {
              // Combine audio from mic and video from screen
              const combinedStream = new MediaStream();
              voiceLocalStream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
              voiceScreenStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
              streamToSend = combinedStream;
          }
          const call = voicePeer.call(remotePeerId, streamToSend, { metadata: { room: VOICE_ROOM_ID } });
          voiceCalls.set(remotePeerId, call);
          call.on('stream', (remoteStream) => {
              // Store the remote stream on the call object
              call.remoteStream = remoteStream;
              console.log('Received remote stream for', remotePeerId, 'Audio tracks:', remoteStream.getAudioTracks().length);
              attachRemoteAudio(remotePeerId, remoteStream);
          });
          // Listen for track events to detect when audio/video tracks are added
          if (call.peerConnection) {
              call.peerConnection.ontrack = (event) => {
                  const track = event.track;
                  if (!track) return;
                  
                  console.log('Track event for', remotePeerId, 'Kind:', track.kind, 'Enabled:', track.enabled);
                  
                  if (track.kind === 'audio') {
                      // Audio track added
                      if (!call.remoteStream) {
                          call.remoteStream = new MediaStream();
                      }
                      // Check if track already exists
                      if (!call.remoteStream.getAudioTracks().some(t => t.id === track.id)) {
                          call.remoteStream.addTrack(track);
                          console.log('Added audio track to stream for', remotePeerId);
                          attachRemoteAudio(remotePeerId, call.remoteStream);
                      }
                  } else if (track.kind === 'video') {
                      // Video track added
                      if (event.streams && event.streams.length > 0) {
                          const stream = event.streams[0];
                          if (call.remoteStream) {
                              // Merge tracks into existing stream
                              stream.getTracks().forEach(t => {
                                  if (!call.remoteStream.getTracks().some(existing => existing.id === t.id)) {
                                      call.remoteStream.addTrack(t);
                                  }
                              });
                          } else {
                              call.remoteStream = stream;
                          }
                          attachRemoteAudio(remotePeerId, call.remoteStream);
                      } else if (track) {
                          // Track without stream - create stream
                          if (!call.remoteStream) {
                              call.remoteStream = new MediaStream();
                          }
                          if (!call.remoteStream.getTracks().some(t => t.id === track.id)) {
                              call.remoteStream.addTrack(track);
                              attachRemoteAudio(remotePeerId, call.remoteStream);
                          }
                      }
                  }
              };
          }
          call.on('close', () => cleanupVoiceCall(remotePeerId));
          call.on('error', () => cleanupVoiceCall(remotePeerId));
      } catch (err) {
          console.warn('Call failed', err);
      }
  }

  function setParticipantConnected(peerId, isConnected) {
      if (!peerId) return;
      const info = voiceParticipants.get(peerId);
      if (!info) return;
      const next = !!isConnected;
      if (!!info.connected === next) return;
      info.connected = next;
      voiceParticipants.set(peerId, info);
      if (voiceUi.listEl) {
          const chip = voiceUi.listEl.querySelector(`[data-peer-id="${peerId}"]`);
          const dot = chip ? chip.querySelector('span[data-peer-dot="1"]') : null;
          if (dot) {
              dot.style.background = next ? 'rgba(34,197,94,0.95)' : 'rgba(148,163,184,0.75)';
              dot.style.boxShadow = next ? '0 0 0 3px rgba(34,197,94,0.14)' : 'none';
          } else {
              renderVoiceParticipants();
          }
      }
  }

  function setParticipantSpeaking(peerId, isSpeaking) {
      if (!peerId) return;
      const info = voiceParticipants.get(peerId);
      if (!info) return;
      const next = !!isSpeaking;
      if (!!info.speaking === next) return;
      info.speaking = next;
      voiceParticipants.set(peerId, info);
      if (voiceUi.listEl) {
          const chip = voiceUi.listEl.querySelector(`[data-peer-id="${peerId}"]`);
          if (chip) {
              chip.style.border = next ? '1px solid rgba(34,197,94,0.85)' : '1px solid rgba(255,255,255,0.10)';
              chip.style.boxShadow = next ? '0 0 0 3px rgba(34,197,94,0.10)' : 'none';
              chip.style.background = next
                  ? 'linear-gradient(135deg, rgba(34,197,94,0.28), rgba(16,185,129,0.16))'
                  : 'rgba(255,255,255,0.08)';
              const dot = chip.querySelector('span[data-peer-dot="1"]');
              const label = chip.querySelector('span:not([data-peer-dot])');
              const connected = !!info.connected;
              if (dot) {
                  dot.style.background = next
                      ? 'rgba(34,197,94,0.95)'
                      : (connected ? 'rgba(34,197,94,0.95)' : 'rgba(148,163,184,0.75)');
                  dot.style.boxShadow = next
                      ? '0 0 0 4px rgba(34,197,94,0.18)'
                      : (connected ? '0 0 0 3px rgba(34,197,94,0.14)' : 'none');
              }
              if (label) label.style.color = next ? '#bbf7d0' : 'rgba(226,232,240,0.92)';
              const meterFill = chip.querySelector('div[data-peer-meter-fill="1"]');
              if (meterFill) {
                  const muted = !!info.muted;
                  meterFill.style.background = muted
                      ? 'rgba(239,68,68,0.95)'
                      : (next ? 'rgba(34,197,94,0.95)' : 'rgba(99,102,241,0.9)');
              }
          } else {
              renderVoiceParticipants();
          }
      }
  }

  function setParticipantLevel(peerId, level01, ts = Date.now()) {
      if (!peerId) return;
      const info = voiceParticipants.get(peerId);
      if (!info) return;
      const lvl = Math.max(0, Math.min(1, Number(level01) || 0));
      info.level = lvl;
      info.lastLevelTs = ts || Date.now();
      voiceParticipants.set(peerId, info);
      if (voiceUi.listEl) {
          const chip = voiceUi.listEl.querySelector(`[data-peer-id="${peerId}"]`);
          const fill = chip ? chip.querySelector('div[data-peer-meter-fill="1"]') : null;
          if (fill) {
              fill.style.width = `${Math.round(lvl * 100)}%`;
              const muted = !!info.muted;
              const speaking = !!info.speaking;
              fill.style.background = muted
                  ? 'rgba(239,68,68,0.95)'
                  : (speaking ? 'rgba(34,197,94,0.95)' : 'rgba(99,102,241,0.9)');
          } else {
              renderVoiceParticipants();
          }
      }
  }

  function broadcastLocalSpeaking(nextSpeaking) {
      try {
          if (!voiceJoined || !voicePeerId) return;
          const next = !!nextSpeaking;
          const now = Date.now();
          // Heartbeat while speaking so remotes stay synced
          if (voiceLocalSpeaking === next) {
              if (!next) return;
              if ((now - voiceLocalLastSpeakingSendTs) < 700) return;
          }
          if ((now - voiceLocalLastSpeakingSendTs) < 120) return;
          voiceLocalLastSpeakingSendTs = now;
          voiceLocalSpeaking = next;
          broadcastVoiceData({ type: 'speaking', peerId: voicePeerId, speaking: next, ts: now });
      } catch (_) {}
  }

  function broadcastLocalLevel(level01) {
      try {
          if (!voiceJoined || !voicePeerId) return;
          const now = Date.now();
          if ((now - voiceLocalLastLevelSendTs) < VOICE_LEVEL_SEND_INTERVAL_MS) return;
          voiceLocalLastLevelSendTs = now;
          const lvl = Math.max(0, Math.min(1, Number(level01) || 0));
          broadcastVoiceData({ type: 'level', peerId: voicePeerId, level: lvl, muted: !!voiceMuted, ts: now });
      } catch (_) {}
  }

  function stopVoiceMeter() {
      if (voiceMeterRaf) cancelAnimationFrame(voiceMeterRaf);
      voiceMeterRaf = null;
      voiceAnalyser = null;
      if (voiceAudioCtx) {
          try { voiceAudioCtx.close(); } catch (_) {}
      }
      voiceAudioCtx = null;
      if (voiceUi.meterCanvas) {
          const ctx = voiceUi.meterCanvas.getContext('2d');
          if (ctx) ctx.clearRect(0, 0, voiceUi.meterCanvas.width, voiceUi.meterCanvas.height);
      }
  }

  function startVoiceMeter(stream) {
      stopVoiceMeter();
      if (!voiceUi.meterCanvas) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      try {
          voiceAudioCtx = new AudioCtx();
          const src = voiceAudioCtx.createMediaStreamSource(stream);
          voiceAnalyser = voiceAudioCtx.createAnalyser();
          voiceAnalyser.fftSize = 1024;
          voiceAnalyser.smoothingTimeConstant = 0.85;
          src.connect(voiceAnalyser);
      } catch (err) {
          console.warn('Voice meter init failed', err);
          stopVoiceMeter();
          return;
      }
      const canvas = voiceUi.meterCanvas;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const data = new Uint8Array(voiceAnalyser.frequencyBinCount);

      const draw = () => {
          if (!voiceAnalyser || !ctx) return;
          voiceAnalyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
              const v = (data[i] - 128) / 128;
              sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);
          const level = Math.min(1, Math.max(0, rms * 2.2));

          // Update speaking + broadcast
          if (voicePeerId) {
              const now = Date.now();
              const info = voiceParticipants.get(voicePeerId) || { userId: globalChatUsername || 'User', lastSeen: now, lastSpokeTs: 0, speaking: false, connected: true, lastBroadcastTs: 0, level: 0, lastLevelTs: 0, muted: false };
              if (!voiceNoiseFloorInitTs) voiceNoiseFloorInitTs = now;
              const warmup = (now - voiceNoiseFloorInitTs) < 1200;
              const alpha = warmup ? 0.12 : 0.04;
              if (voiceMuted || !info.speaking) {
                  if (!voiceNoiseFloor) voiceNoiseFloor = rms;
                  else voiceNoiseFloor = (voiceNoiseFloor * (1 - alpha)) + (rms * alpha);
              }
              const gate = Math.max(VOICE_SPEAKING_RMS_THRESHOLD, (voiceNoiseFloor * 2.8 + 0.002));
              const crosses = (!voiceMuted) && (rms > gate) && (level > VOICE_SPEAKING_LEVEL_THRESHOLD);
              if (crosses) info.lastSpokeTs = now;
              const speaking = (!voiceMuted) && (now - (info.lastSpokeTs || 0)) < VOICE_SPEAKING_HOLD_MS;
              voiceParticipants.set(voicePeerId, { ...info, speaking });
              setParticipantSpeaking(voicePeerId, speaking);
              broadcastLocalSpeaking(speaking);
              const sendLevel = voiceMuted ? 0 : level;
              setParticipantLevel(voicePeerId, sendLevel, now);
              broadcastLocalLevel(sendLevel);
          }

          // Draw meter
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const w = Math.floor(canvas.width * level);
          const h = canvas.height;
          const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
          grad.addColorStop(0, 'rgba(16,185,129,0.95)');
          grad.addColorStop(0.6, 'rgba(34,211,238,0.95)');
          grad.addColorStop(1, 'rgba(99,102,241,0.95)');
          ctx.fillStyle = voiceMuted ? 'rgba(148,163,184,0.55)' : grad;
          ctx.fillRect(0, 0, w, h);
          ctx.globalAlpha = 0.25;
          ctx.strokeStyle = 'rgba(255,255,255,0.55)';
          for (let x = 22; x < canvas.width; x += 22) {
              ctx.beginPath();
              ctx.moveTo(x, 4);
              ctx.lineTo(x, h - 4);
              ctx.stroke();
          }
          ctx.globalAlpha = 1;

          voiceMeterRaf = requestAnimationFrame(draw);
      };
      voiceMeterRaf = requestAnimationFrame(draw);
  }

  function stopRemoteSpeakingMeter(peerId) {
      if (peerId) {
          voiceRemoteAnalysers.delete(peerId);
          setParticipantSpeaking(peerId, false);
      }
      if (voiceRemoteAnalysers.size === 0) {
          if (voiceRemoteMeterRaf) cancelAnimationFrame(voiceRemoteMeterRaf);
          voiceRemoteMeterRaf = null;
          if (voiceRemoteAudioCtx) {
              try { voiceRemoteAudioCtx.close(); } catch (_) {}
          }
          voiceRemoteAudioCtx = null;
      }
  }

  function startRemoteSpeakingMeter(peerId, stream) {
      if (!peerId || !stream) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!voiceRemoteAudioCtx) {
          try { voiceRemoteAudioCtx = new AudioCtx(); } catch (_) { voiceRemoteAudioCtx = null; }
      }
      if (!voiceRemoteAudioCtx) return;
      try {
          const analyser = voiceRemoteAudioCtx.createAnalyser();
          analyser.fftSize = 1024;
          analyser.smoothingTimeConstant = 0.85;
          const src = voiceRemoteAudioCtx.createMediaStreamSource(stream);
          src.connect(analyser);
          const data = new Uint8Array(analyser.frequencyBinCount);
          voiceRemoteAnalysers.set(peerId, { analyser, data });
      } catch (err) {
          console.warn('Remote voice meter init failed', err);
          return;
      }
      if (!voiceRemoteMeterRaf) {
          const tick = () => {
              voiceRemoteAnalysers.forEach((entry, pid) => {
                  try {
                      const now = Date.now();
                      const existing = voiceParticipants.get(pid);
                      // If we recently got broadcast speaking, don't fight it
                      if (existing?.lastBroadcastTs && (now - existing.lastBroadcastTs) < 1500) return;
                      entry.analyser.getByteTimeDomainData(entry.data);
                      let sum = 0;
                      for (let i = 0; i < entry.data.length; i++) {
                          const v = (entry.data[i] - 128) / 128;
                          sum += v * v;
                      }
                      const rms = Math.sqrt(sum / entry.data.length);
                      const threshold = 0.020;
                      const info = voiceParticipants.get(pid) || { userId: '', lastSeen: now, lastSpokeTs: 0, speaking: false, connected: false, lastBroadcastTs: 0, level: 0, lastLevelTs: 0, muted: false };
                      if (rms > threshold) info.lastSpokeTs = now;
                      const speaking = (now - (info.lastSpokeTs || 0)) < 350;
                      voiceParticipants.set(pid, { ...info, speaking });
                      setParticipantSpeaking(pid, speaking);
                  } catch (_) {}
              });
              voiceRemoteMeterRaf = requestAnimationFrame(tick);
          };
          voiceRemoteMeterRaf = requestAnimationFrame(tick);
      }
  }

  async function ensureVoiceRealtimeChannel(client) {
      // DISABLED: Supabase realtime uses too many messages - disabled to save quota
      return null;
      if (!client) return null;
      if (!voicePeerId) return null;
      if (voiceRtChannel) return voiceRtChannel;
      voiceRtSubscribed = false;
      voiceRtChannel = client.channel(`voice:${VOICE_ROOM_ID}`, { config: { presence: { key: voicePeerId } } });
      voiceRtChannel
          .on('presence', { event: 'sync' }, () => {
              try {
                  const state = voiceRtChannel.presenceState();
                  const prevMap = new Map(voiceParticipants);
                  voiceParticipants.clear();
                  Object.keys(state || {}).forEach((key) => {
                      const metas = state[key] || [];
                      metas.forEach((m) => {
                          const pid = String(m?.peerId || key || '');
                          if (!pid) return;
                          const prev = prevMap.get(pid);
                          voiceParticipants.set(pid, {
                              userId: String(m?.userId || ''),
                              lastSeen: Date.now(),
                              lastSpokeTs: prev?.lastSpokeTs || 0,
                              speaking: !!prev?.speaking,
                              lastBroadcastTs: prev?.lastBroadcastTs || 0,
                              level: prev?.level || 0,
                              lastLevelTs: prev?.lastLevelTs || 0,
                              muted: !!prev?.muted,
                              connected: !!prev?.connected
                          });
                      });
                  });
                  // Ensure me is visible
                  if (voicePeerId && !voiceParticipants.has(voicePeerId)) {
                      const prev = prevMap.get(voicePeerId);
                      voiceParticipants.set(voicePeerId, {
                          userId: globalChatUsername || 'User',
                          lastSeen: Date.now(),
                          lastSpokeTs: prev?.lastSpokeTs || 0,
                          speaking: !!prev?.speaking,
                          lastBroadcastTs: prev?.lastBroadcastTs || 0,
                          level: prev?.level || 0,
                          lastLevelTs: prev?.lastLevelTs || 0,
                          muted: !!prev?.muted,
                          connected: prev ? !!prev.connected : true
                      });
                  }
                  renderVoiceParticipants();
                  voiceParticipants.forEach((_info, pid) => {
                      maybeCallPeer(pid);
                      maybeEnsureVoiceDataConn(pid);
                  });
              } catch (_) {}
          })
          .on('presence', { event: 'join' }, ({ newPresences }) => {
              (newPresences || []).forEach((m) => {
                  const pid = String(m?.peerId || '');
                  if (!pid) return;
                  const prev = voiceParticipants.get(pid);
                  voiceParticipants.set(pid, {
                      userId: String(m?.userId || ''),
                      lastSeen: Date.now(),
                      lastSpokeTs: prev?.lastSpokeTs || 0,
                      speaking: !!prev?.speaking,
                      lastBroadcastTs: prev?.lastBroadcastTs || 0,
                      level: prev?.level || 0,
                      lastLevelTs: prev?.lastLevelTs || 0,
                      muted: !!prev?.muted,
                      connected: !!prev?.connected
                  });
              });
              renderVoiceParticipants();
              voiceParticipants.forEach((_info, pid) => {
                  maybeCallPeer(pid);
                  maybeEnsureVoiceDataConn(pid);
              });
          })
          .on('presence', { event: 'leave' }, ({ leftPresences }) => {
              (leftPresences || []).forEach((m) => {
                  const pid = String(m?.peerId || '');
                  if (!pid) return;
                  cleanupVoiceCall(pid);
                  voiceParticipants.delete(pid);
              });
              renderVoiceParticipants();
          });

      const status = await new Promise((resolve) => {
          try {
              voiceRtChannel.subscribe((s) => {
                  if (s === 'SUBSCRIBED' || s === 'TIMED_OUT' || s === 'CHANNEL_ERROR' || s === 'CLOSED') resolve(s);
              });
          } catch (_) { resolve('CHANNEL_ERROR'); }
      });
      voiceRtSubscribed = (status === 'SUBSCRIBED');

      if (voiceRtSubscribed) {
          try {
              await voiceRtChannel.track({ peerId: voicePeerId, userId: globalChatUsername || 'User', ts: Date.now() });
          } catch (_) {}
      } else {
          // If not subscribed, do NOT broadcast (prevents send() REST fallback spam)
          console.warn('Voice realtime subscribe status:', status);
          if (String(status) === 'TIMED_OUT') {
                  showChatNotice('Supabase Realtime timed out. This can happen if WebSockets are blocked, an extension blocks Realtime, or the project is restricted/over quota. Voice peer discovery may fall back to activity heartbeats.', true);
                  setVoiceStatus('Realtime timed out. Trying fallback discovery…', true);
          }
      }

      return voiceRtChannel;
  }

  async function ensureVoiceObserverChannel(client) {
      // DISABLED: Supabase realtime uses too many messages - disabled to save quota
      return null;
      if (!client) return null;
      if (voiceJoined) return null;
      if (voiceObserverChannel) return voiceObserverChannel;
      if (!voiceObserverKey) voiceObserverKey = `obs_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
      voiceObserverChannel = client.channel(`voice:${VOICE_ROOM_ID}`, { config: { presence: { key: voiceObserverKey } } });

      const mergePresence = (meta) => {
          const pid = String(meta?.peerId || '');
          if (!pid) return;
          const prev = voiceParticipants.get(pid);
          voiceParticipants.set(pid, {
              userId: String(meta?.userId || prev?.userId || ''),
              lastSeen: Date.now(),
              lastSpokeTs: prev?.lastSpokeTs || 0,
              speaking: !!prev?.speaking,
              lastBroadcastTs: prev?.lastBroadcastTs || 0,
              level: prev?.level || 0,
              lastLevelTs: prev?.lastLevelTs || 0,
              muted: !!prev?.muted,
              connected: prev ? !!prev.connected : false
          });
      };

      voiceObserverChannel
          .on('presence', { event: 'sync' }, () => {
              try {
                  const state = voiceObserverChannel.presenceState();
                  const prevMap = new Map(voiceParticipants);
                  voiceParticipants.clear();
                  Object.keys(state || {}).forEach((key) => {
                      const metas = state[key] || [];
                      metas.forEach((m) => {
                          const pid = String(m?.peerId || key || '');
                          if (!pid) return;
                          const prev = prevMap.get(pid);
                          voiceParticipants.set(pid, {
                              userId: String(m?.userId || prev?.userId || ''),
                              lastSeen: Date.now(),
                              lastSpokeTs: prev?.lastSpokeTs || 0,
                              speaking: !!prev?.speaking,
                              lastBroadcastTs: prev?.lastBroadcastTs || 0,
                              level: prev?.level || 0,
                              lastLevelTs: prev?.lastLevelTs || 0,
                              muted: !!prev?.muted,
                              connected: prev ? !!prev.connected : false
                          });
                      });
                  });
                  renderVoiceParticipants();
              } catch (_) {}
          })
          .on('presence', { event: 'join' }, ({ newPresences }) => {
              (newPresences || []).forEach((m) => mergePresence(m));
              renderVoiceParticipants();
          })
          .on('presence', { event: 'leave' }, ({ leftPresences }) => {
              (leftPresences || []).forEach((m) => {
                  const pid = String(m?.peerId || '');
                  if (pid) voiceParticipants.delete(pid);
              });
              renderVoiceParticipants();
          });

      try {
          await new Promise((resolve) => {
              voiceObserverChannel.subscribe((s) => {
                  if (s === 'SUBSCRIBED' || s === 'TIMED_OUT' || s === 'CHANNEL_ERROR' || s === 'CLOSED') resolve(s);
              });
          });
      } catch (_) {}

      return voiceObserverChannel;
  }

  async function joinVoiceChat() {
      ensureVoiceUi();
      if (voiceJoined) return;
      if (!globalChatUsername) {
          showChatNotice('Set your chat name before joining voice.', true);
          return;
      }
      const gate = getVoiceGateState();
      if (gate !== 'adult_accepted') {
          await openVoiceGateModal({ afterAccept: () => joinVoiceChat() });
          return;
      }
      const block = getVoiceBlockReason(globalChatUsername);
      if (block.blocked) {
          if (block.type === 'ban') {
              showChatNotice('You are banned from voice chat.', true);
              setVoiceStatus('Voice banned.', true);
              return;
          }
          if (block.type === 'timeout') {
              const ms = Math.max(0, (block.until || 0) - Date.now());
              const mins = Math.ceil(ms / 60000);
              showChatNotice(`You are timed out from voice chat (${mins}m).`, true);
              setVoiceStatus('Voice timed out.', true);
              return;
          }
      }

      setVoiceStatus('Requesting microphone permission…');
      const Peer = await ensurePeerJs();
      if (!Peer) {
          showChatNotice('Voice chat failed: PeerJS did not load.', true);
          setVoiceStatus('PeerJS failed to load.', true);
          return;
      }

      try {
          voiceLocalStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch (err) {
          console.warn('getUserMedia failed', err);
          showChatNotice('Mic permission denied/unavailable.', true);
          setVoiceStatus('Mic unavailable.', true);
          return;
      }

      setVoiceStatus('Connecting voice…');
      voicePeer = new Peer();
      // PeerJS data channel: used for voice meter + speaking sync (reduces Supabase realtime usage)
      try {
          voicePeer.on('connection', (conn) => {
              try { setupVoiceDataConn(conn); } catch (_) {}
          });
      } catch (_) {}
      voicePeer.on('open', async (id) => {
          voicePeerId = String(id || '');
          voiceJoined = true;
          voiceMuted = false;
          if (voiceUi.joinBtn) voiceUi.joinBtn.style.display = 'none';
          if (voiceUi.joinBtnContainer) voiceUi.joinBtnContainer.style.display = 'none';
          if (voiceUi.leaveBtn) voiceUi.leaveBtn.style.display = 'inline-block';
          if (voiceUi.muteBtn) voiceUi.muteBtn.style.display = 'inline-block';
          if (voiceUi.muteBtn) voiceUi.muteBtn.textContent = 'Mute';
          // Screen sharing removed - no longer needed
          if (voiceUi.reportsBtn) voiceUi.reportsBtn.style.display = (globalChatUsername === '%Owner%') ? 'inline-block' : 'none';
          
          // Make panel full-page - move to body and apply full-page styles
          if (voiceUi.panel) {
              // Move panel to body if it's not already there
              if (voiceUi.panel.parentElement !== document.body) {
                  document.body.appendChild(voiceUi.panel);
              }
              
              // Apply full-page styles with !important to override any parent constraints
              voiceUi.panel.style.setProperty('display', 'block', 'important');
              voiceUi.panel.style.setProperty('position', 'fixed', 'important');
              voiceUi.panel.style.setProperty('top', '0', 'important');
              voiceUi.panel.style.setProperty('left', '0', 'important');
              voiceUi.panel.style.setProperty('right', '0', 'important');
              voiceUi.panel.style.setProperty('bottom', '0', 'important');
              voiceUi.panel.style.setProperty('width', '100vw', 'important');
              voiceUi.panel.style.setProperty('height', '100vh', 'important');
              voiceUi.panel.style.setProperty('max-width', '100vw', 'important');
              voiceUi.panel.style.setProperty('max-height', '100vh', 'important');
              voiceUi.panel.style.setProperty('padding', '24px', 'important');
              voiceUi.panel.style.setProperty('border-radius', '0', 'important');
              voiceUi.panel.style.setProperty('z-index', '99999', 'important');
              voiceUi.panel.style.setProperty('overflow-y', 'auto', 'important');
              voiceUi.panel.style.setProperty('background', 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.95))', 'important');
              voiceUi.panel.style.setProperty('border', 'none', 'important');
              voiceUi.panel.style.setProperty('box-shadow', 'none', 'important');
              voiceUi.panel.style.setProperty('margin', '0', 'important');
          }

          voiceNoiseFloor = 0;
          voiceNoiseFloorInitTs = Date.now();
          startVoiceMeter(voiceLocalStream);

          voiceParticipants.set(voicePeerId, {
              userId: globalChatUsername || 'User',
              lastSeen: Date.now(),
              lastSpokeTs: 0,
              speaking: false,
              lastBroadcastTs: 0,
              level: 0,
              lastLevelTs: 0,
              muted: false,
              connected: true,
              screenSharing: false
          });
          // Set loading state while waiting for other participants
          voiceParticipantsLoading = true;
          renderVoiceParticipants();
          setVoiceStatus('Joined voice.');
          
          // Clear loading state after 5 seconds max (in case participants never arrive)
          setTimeout(() => {
              if (voiceParticipantsLoading) {
                  voiceParticipantsLoading = false;
                  renderVoiceParticipants();
              }
          }, 5000);

          if (VOICE_DISCOVERY_ENABLED) {
              // Cloudflare discovery handles join/leave + participant list
              try { 
                  ensureVoiceDiscoveryJoined();
                  // Send join message and request participants when socket is ready
                  const sendJoinAndRequestParticipants = () => {
                      if (voiceDiscoveryWs && voiceDiscoveryWs.readyState === 1) {
                          // Socket is open, send immediately
                          sendVoiceDiscovery({ type: 'join', peerId: voicePeerId, userId: globalChatUsername || 'User', muted: !!voiceMuted, screenSharing: false, ts: Date.now() });
                          sendVoiceDiscovery({ type: 'getParticipants', ts: Date.now() });
                      } else if (voiceDiscoveryWs && voiceDiscoveryWs.readyState === 0) {
                          // Socket is connecting, wait for onopen (which will also send)
                          // But retry in case onopen already fired
                          setTimeout(() => {
                              if (voiceDiscoveryWs && voiceDiscoveryWs.readyState === 1) {
                                  sendVoiceDiscovery({ type: 'join', peerId: voicePeerId, userId: globalChatUsername || 'User', muted: !!voiceMuted, screenSharing: false, ts: Date.now() });
                                  sendVoiceDiscovery({ type: 'getParticipants', ts: Date.now() });
                              }
                          }, 200);
                      } else {
                          // Socket not created yet, wait a bit
                          setTimeout(sendJoinAndRequestParticipants, 100);
                      }
                  };
                  sendJoinAndRequestParticipants();
              } catch (_) {}
              // Stop Supabase observer channel if it exists (avoid extra realtime usage)
              if (voiceObserverChannel) {
                  try { await voiceObserverChannel.unsubscribe(); } catch (_) {}
                  voiceObserverChannel = null;
              }
          } else {
              const client = await initGlobalChatClient();
              // Ensure the global observer channel is active (join/leave banners for everyone)
              try { await ensureVoiceActivityChannel(client); } catch (_) {}
              // Heartbeats let everyone see current participants and enable fallback peer discovery if presence times out.
              try { startVoiceActivityHeartbeats(); } catch (_) {}
              await ensureVoiceRealtimeChannel(client);
              // Stop observer channel to avoid double presence syncing
              if (voiceObserverChannel) {
                  try { await voiceObserverChannel.unsubscribe(); } catch (_) {}
                  voiceObserverChannel = null;
              }
              // Broadcast join so everyone on chat page sees it (including sender)
              try {
                  voiceActivityChannel?.send({
                      type: 'broadcast',
                      event: VOICE_BROADCAST_ACTIVITY_EVENT,
                      payload: { action: 'join', peerId: voicePeerId, userId: globalChatUsername || 'User', screenSharing: false, ts: Date.now() }
                  });
                  // Ask for current voice members (helps late joiners when presence is blocked)
                  voiceActivityChannel?.send({
                      type: 'broadcast',
                      event: VOICE_BROADCAST_ACTIVITY_EVENT,
                      payload: { action: 'who', peerId: voicePeerId, userId: globalChatUsername || 'User', ts: Date.now() }
                  });
              } catch (_) {}
          }
      });
      voicePeer.on('call', (call) => {
          if (!voiceLocalStream) {
              try { call.close(); } catch (_) {}
              return;
          }
          const remoteId = call.peer;
          // Respect owner moderation
          try {
              const info = voiceParticipants.get(remoteId);
              const uid = String(info?.userId || '');
              const block = getVoiceBlockReason(uid);
              if (block.blocked) {
                  try { call.close(); } catch (_) {}
                  return;
              }
          } catch (_) {}
          voiceCalls.set(remoteId, call);
          // Answer with combined stream (audio + screen video if sharing)
          let streamToAnswer = voiceLocalStream;
          if (voiceScreenSharing && voiceScreenStream) {
              const combinedStream = new MediaStream();
              voiceLocalStream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
              voiceScreenStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
              streamToAnswer = combinedStream;
          }
          try { call.answer(streamToAnswer); } catch (_) {}
          call.on('stream', (remoteStream) => {
              // Store the remote stream on the call object
              call.remoteStream = remoteStream;
              console.log('Received incoming call stream for', remoteId, 'Audio tracks:', remoteStream.getAudioTracks().length);
              attachRemoteAudio(remoteId, remoteStream);
          });
          // Listen for track events to detect when audio/video tracks are added
          if (call.peerConnection) {
              call.peerConnection.ontrack = (event) => {
                  const track = event.track;
                  if (!track) return;
                  
                  console.log('Incoming call track event for', remoteId, 'Kind:', track.kind, 'Enabled:', track.enabled);
                  
                  if (track.kind === 'audio') {
                      // Audio track added - ensure it's in the remote stream
                      if (!call.remoteStream) {
                          call.remoteStream = new MediaStream();
                      }
                      // Check if track already exists
                      if (!call.remoteStream.getAudioTracks().some(t => t.id === track.id)) {
                          call.remoteStream.addTrack(track);
                          console.log('Added audio track to incoming call stream for', remoteId);
                          attachRemoteAudio(remoteId, call.remoteStream);
                      }
                  } else if (track.kind === 'video') {
                      // Video track added
                      if (event.streams && event.streams.length > 0) {
                          const stream = event.streams[0];
                          if (call.remoteStream) {
                              // Merge tracks into existing stream
                              stream.getTracks().forEach(t => {
                                  if (!call.remoteStream.getTracks().some(existing => existing.id === t.id)) {
                                      call.remoteStream.addTrack(t);
                                  }
                              });
                          } else {
                              call.remoteStream = stream;
                          }
                          attachRemoteAudio(remoteId, call.remoteStream);
                      } else if (track) {
                          // Track without stream - create stream
                          if (!call.remoteStream) {
                              call.remoteStream = new MediaStream();
                          }
                          if (!call.remoteStream.getTracks().some(t => t.id === track.id)) {
                              call.remoteStream.addTrack(track);
                              attachRemoteAudio(remoteId, call.remoteStream);
                          }
                      }
                  }
              };
          }
          call.on('close', () => cleanupVoiceCall(remoteId));
          call.on('error', () => cleanupVoiceCall(remoteId));
      });
      voicePeer.on('error', (err) => {
          console.warn('Peer error', err);
          setVoiceStatus('Voice connection error.', true);
      });
  }

  async function leaveVoiceChat() {
      if (!voiceJoined) return;
      setVoiceStatus('Leaving voice…');
      // Make leaving instant; do realtime cleanup/broadcast in the background (realtime may be TIMED_OUT).
      const leavingPeerId = voicePeerId;
      const leavingUserId = globalChatUsername || 'User';

      // Send leave message BEFORE closing anything (so Cloudflare can broadcast it)
      if (VOICE_DISCOVERY_ENABLED) {
          try { sendVoiceDiscovery({ type: 'leave', peerId: leavingPeerId, userId: leavingUserId, ts: Date.now() }); } catch (_) {}
          // Give the message time to send before switching to observer mode
          await new Promise((r) => setTimeout(r, 150));
      }

      Array.from(voiceCalls.keys()).forEach((pid) => cleanupVoiceCall(pid));
      voiceCalls.clear();
      voiceDataConns.clear();
      stopVoiceActivityHeartbeats();
      voiceParticipants.clear();
      renderVoiceParticipants();
      if (voiceLocalStream) {
          try { voiceLocalStream.getTracks().forEach(t => t.stop()); } catch (_) {}
      }
      voiceLocalStream = null;
      // Stop screen sharing if active
      if (voiceScreenStream) {
          try {
              voiceScreenStream.getTracks().forEach(t => t.stop());
          } catch (_) {}
          voiceScreenStream = null;
      }
      voiceScreenSharing = false;
      stopVoiceMeter();
      if (voicePeer) {
          try { voicePeer.destroy(); } catch (_) {}
      }
      voicePeer = null;
      voicePeerId = '';
      voiceJoined = false;
      voiceMuted = false;
      voiceScreenSharing = false;
      if (voiceUi.joinBtn) voiceUi.joinBtn.style.display = 'block';
      if (voiceUi.joinBtnContainer) voiceUi.joinBtnContainer.style.display = 'flex';
      if (voiceUi.leaveBtn) voiceUi.leaveBtn.style.display = 'none';
      if (voiceUi.muteBtn) voiceUi.muteBtn.style.display = 'none';
      if (voiceUi.shareScreenBtn) {
          voiceUi.shareScreenBtn.style.display = 'none';
          voiceUi.shareScreenBtn.innerHTML = '<i class="fas fa-desktop"></i> Share';
          voiceUi.shareScreenBtn.style.background = 'rgba(139,92,246,0.18)';
          voiceUi.shareScreenBtn.style.color = '#c4b5fd';
      }
      
      // Restore panel to normal size and move back to original location
      if (voiceUi.panel) {
          // Move panel back to original location
          const originalParent = globalChatPanel;
          if (originalParent && voiceUi.panel.parentElement === document.body) {
              if (globalChatBox && globalChatBox.parentElement === originalParent) {
                  originalParent.insertBefore(voiceUi.panel, globalChatBox);
              } else {
                  originalParent.insertBefore(voiceUi.panel, originalParent.firstChild || null);
              }
          }
          
          // Restore normal styles
          voiceUi.panel.style.cssText = `
              display: none;
              position: relative;
              padding: 12px;
              border-radius: 14px;
              border: 1px solid rgba(255,255,255,0.10);
              background: rgba(255,255,255,0.04);
              box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
              width: 100%;
              max-width: 100%;
          `;
      }
      setVoiceStatus('Left voice.');

      // Background cleanup (best effort)
      setTimeout(async () => {
          if (!VOICE_DISCOVERY_ENABLED) {
              try {
                  const client = await initGlobalChatClient();
                  // Leave banner (fire-and-forget)
                  try {
                      await ensureVoiceActivityChannel(client);
                      voiceActivityChannel?.send({
                          type: 'broadcast',
                          event: VOICE_BROADCAST_ACTIVITY_EVENT,
                          payload: { action: 'leave', peerId: leavingPeerId, userId: leavingUserId, ts: Date.now() }
                      });
                  } catch (_) {}
              } catch (_) {}
          }

          if (voiceRtChannel) {
              const ch = voiceRtChannel;
              voiceRtChannel = null;
              voiceRtSubscribed = false;
              try { await Promise.race([ch.untrack(), new Promise((r) => setTimeout(r, 700))]); } catch (_) {}
              try { await Promise.race([ch.unsubscribe(), new Promise((r) => setTimeout(r, 700))]); } catch (_) {}
          }
      }, 0);

      // Re-enable observer channel so users can see participants without joining
      // Do this AFTER sending leave so observer can receive the leave broadcast
      try {
          const client = await initGlobalChatClient();
          if (VOICE_DISCOVERY_ENABLED) {
              stopVoiceDiscoverySocket();
              // Small delay to ensure leave message was broadcasted before observer connects
              setTimeout(() => {
                  try { ensureVoiceDiscoveryObserver(); } catch (_) {}
              }, 100);
          } else {
              await ensureVoiceObserverChannel(client);
          }
      } catch (_) {}
  }

  function toggleVoiceMute() {
      if (!voiceLocalStream) return;
      voiceMuted = !voiceMuted;
      try { voiceLocalStream.getAudioTracks().forEach(t => { t.enabled = !voiceMuted; }); } catch (_) {}
      if (voiceUi.muteBtn) voiceUi.muteBtn.textContent = voiceMuted ? 'Unmute' : 'Mute';
      setVoiceStatus(voiceMuted ? 'Muted.' : 'Unmuted.');
      if (VOICE_DISCOVERY_ENABLED && voicePeerId) {
          try { sendVoiceDiscovery({ type: 'update', peerId: voicePeerId, muted: !!voiceMuted, ts: Date.now() }); } catch (_) {}
      }
      // Broadcast mute state via level packets (so mini meter turns red for everyone)
      if (voicePeerId && voiceParticipants.has(voicePeerId)) {
          const info = voiceParticipants.get(voicePeerId);
          info.muted = !!voiceMuted;
          voiceParticipants.set(voicePeerId, info);
          setParticipantLevel(voicePeerId, voiceMuted ? 0 : (info.level || 0), Date.now());
          if (voiceMuted) setParticipantSpeaking(voicePeerId, false);
          broadcastLocalLevel(voiceMuted ? 0 : (info.level || 0));
      }
  }

  async function toggleScreenShare() {
      if (!voiceJoined || !voicePeer || !voiceLocalStream) {
          showChatNotice('Join voice chat first to share screen.', true);
          return;
      }

      // Check if someone else is already sharing
      if (!voiceScreenSharing) {
          let someoneElseSharing = false;
          let sharingPeerId = null;
          let sharingUserName = null;
          for (const [peerId, info] of voiceParticipants.entries()) {
              if (peerId !== voicePeerId && info.screenSharing) {
                  someoneElseSharing = true;
                  sharingPeerId = peerId;
                  sharingUserName = info.userId || 'Someone';
                  break;
              }
          }
          if (someoneElseSharing) {
              showChatNotice(`${sharingUserName} is already sharing their screen. Only one person can share at a time.`, true);
              setVoiceStatus(`${sharingUserName} is sharing.`, true);
              return;
          }
      }

      if (voiceScreenSharing) {
          // Stop screen sharing
          try {
              if (voiceScreenStream) {
                  // Remove video tracks from all active calls before stopping
                  voiceCalls.forEach((call, peerId) => {
                      try {
                          if (call.peerConnection) {
                              const senders = call.peerConnection.getSenders();
                              const videoSender = senders.find(s => 
                                  s.track && s.track.kind === 'video'
                              );
                              if (videoSender) {
                                  // Replace with null track to stop video
                                  videoSender.replaceTrack(null).catch(() => {});
                              }
                          }
                      } catch (_) {}
                  });
                  // Stop all tracks
                  voiceScreenStream.getTracks().forEach(track => track.stop());
                  voiceScreenStream = null;
              }
          } catch (err) {
              console.warn('Error stopping screen share', err);
          }
          voiceScreenSharing = false;
          // Update participant info
          if (voicePeerId && voiceParticipants.has(voicePeerId)) {
              const info = voiceParticipants.get(voicePeerId);
              if (info) {
                  info.screenSharing = false;
                  voiceParticipants.set(voicePeerId, info);
              }
          }
          // Broadcast stop sharing
          if (VOICE_DISCOVERY_ENABLED && voicePeerId) {
              try { sendVoiceDiscovery({ type: 'screenShare', action: 'stop', peerId: voicePeerId, userId: globalChatUsername || 'User', ts: Date.now() }); } catch (_) {}
          } else {
              try {
                  const client = await initGlobalChatClient();
                  await ensureVoiceActivityChannel(client);
                  voiceActivityChannel?.send({
                      type: 'broadcast',
                      event: VOICE_BROADCAST_ACTIVITY_EVENT,
                      payload: { action: 'screenShare', subAction: 'stop', peerId: voicePeerId, userId: globalChatUsername || 'User', ts: Date.now() }
                  });
              } catch (_) {}
          }
          if (voiceUi.shareScreenBtn) {
              voiceUi.shareScreenBtn.innerHTML = '<i class="fas fa-desktop"></i> Share';
              voiceUi.shareScreenBtn.style.background = 'rgba(139,92,246,0.18)';
              voiceUi.shareScreenBtn.style.color = '#c4b5fd';
          }
          setVoiceStatus('Screen sharing stopped.');
      } else {
          // Start screen sharing
          try {
              setVoiceStatus('Requesting screen permission…');
              voiceScreenStream = await navigator.mediaDevices.getDisplayMedia({ 
                  video: true, 
                  audio: false 
              });
              
              voiceScreenSharing = true;
              // Update participant info
              if (voicePeerId && voiceParticipants.has(voicePeerId)) {
                  const info = voiceParticipants.get(voicePeerId);
                  if (info) {
                      info.screenSharing = true;
                      voiceParticipants.set(voicePeerId, info);
                  }
              }
              // Broadcast start sharing
              if (VOICE_DISCOVERY_ENABLED && voicePeerId) {
                  try { sendVoiceDiscovery({ type: 'screenShare', action: 'start', peerId: voicePeerId, userId: globalChatUsername || 'User', ts: Date.now() }); } catch (_) {}
              } else {
                  try {
                      const client = await initGlobalChatClient();
                      await ensureVoiceActivityChannel(client);
                      voiceActivityChannel?.send({
                          type: 'broadcast',
                          event: VOICE_BROADCAST_ACTIVITY_EVENT,
                          payload: { action: 'screenShare', subAction: 'start', peerId: voicePeerId, userId: globalChatUsername || 'User', ts: Date.now() }
                      });
                  } catch (_) {}
              }
              if (voiceUi.shareScreenBtn) {
                  voiceUi.shareScreenBtn.innerHTML = '<i class="fas fa-stop"></i> Stop';
                  voiceUi.shareScreenBtn.style.background = 'rgba(239,68,68,0.18)';
                  voiceUi.shareScreenBtn.style.color = '#fca5a5';
              }
              setVoiceStatus('Screen sharing active.');

              // Add video track to all existing calls
              const videoTrack = voiceScreenStream.getVideoTracks()[0];
              if (videoTrack) {
                  voiceCalls.forEach((call, peerId) => {
                      try {
                          if (call.peerConnection) {
                              const senders = call.peerConnection.getSenders();
                              let videoSender = senders.find(s => 
                                  s.track && s.track.kind === 'video'
                              );
                              if (videoSender) {
                                  // Replace existing video track
                                  videoSender.replaceTrack(videoTrack).catch(err => {
                                      console.warn('Error replacing video track', peerId, err);
                                  });
                              } else {
                                  // Add new video track - create combined stream
                                  const combinedStream = new MediaStream();
                                  if (voiceLocalStream) {
                                      voiceLocalStream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
                                  }
                                  combinedStream.addTrack(videoTrack);
                                  // Add track to peer connection
                                  const sender = call.peerConnection.addTrack(videoTrack, combinedStream);
                                  // Trigger negotiation by creating new offer
                                  call.peerConnection.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
                                      .then(offer => {
                                          return call.peerConnection.setLocalDescription(offer);
                                      })
                                      .catch(err => {
                                          console.warn('Error creating offer for video', peerId, err);
                                      });
                              }
                          }
                      } catch (err) {
                          console.warn('Error adding screen to call', peerId, err);
                      }
                  });
              }

              // Handle screen share ending (user clicks stop in browser UI)
              voiceScreenStream.getVideoTracks()[0].addEventListener('ended', () => {
                  if (voiceScreenSharing) {
                      toggleScreenShare();
                  }
              });
          } catch (err) {
              console.warn('Screen share failed', err);
              if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                  showChatNotice('Screen sharing permission denied.', true);
                  setVoiceStatus('Screen share denied.', true);
              } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                  showChatNotice('No screen/window available to share.', true);
                  setVoiceStatus('No screen available.', true);
              } else {
                  showChatNotice('Screen sharing failed: ' + (err.message || 'Unknown error'), true);
                  setVoiceStatus('Screen share failed.', true);
              }
              voiceScreenSharing = false;
              voiceScreenStream = null;
          }
      }
  }
