# Supabase Realtime Usage Analysis for Voice Chat

## Current Setup (Cloudflare Enabled)

### What Uses Supabase:
1. **Presence Channel** (`voice:global`)
   - Tracks who's in voice chat
   - Sync events when users join/leave
   - **Cost**: ~2-5 messages per user join/leave event

2. **Broadcast Channel** (`voice-activity:global`)
   - "who" requests (asking who's in VC)
   - "here" responses (answering who requests)
   - **NOT used for**: Join/leave notifications (Cloudflare handles this)
   - **NOT used for**: Heartbeats (disabled when Cloudflare enabled)

### Usage Calculation:

**Per User Session:**
- Join: ~3-5 presence messages
- Leave: ~2-3 presence messages
- "who" request: ~1 message (only when needed)
- "here" response: ~1 message per request (only if you're in VC)

**Example Scenario:**
- 10 users in voice chat for 1 hour
- Each user joins/leaves once
- Total: ~50-80 messages for presence sync
- Plus occasional "who"/"here" messages: ~10-20 messages
- **Total per hour: ~60-100 messages**

**Monthly Estimate (if Cloudflare enabled):**
- 100 users/day, 1 hour average session
- ~6,000-10,000 messages/day
- ~180,000-300,000 messages/month
- **Well within Free tier (2M messages/month)**

## If Cloudflare Disabled (Worst Case):

**Per User in VC:**
- Heartbeats: Every 12 seconds = 5/minute = 300/hour
- 10 users for 1 hour = 3,000 heartbeat messages
- Plus presence sync: ~50-80 messages
- **Total: ~3,050-3,080 messages/hour**

**Monthly Estimate (worst case):**
- 100 users/day, 1 hour average
- ~305,000-308,000 messages/day
- ~9.15M-9.24M messages/month
- **EXCEEDS Free tier! Would cost ~$18-19/month**

## Recommendations:

### Option 1: Keep Current Setup (Recommended)
- ✅ Cloudflare handles notifications (saves ~90% of messages)
- ✅ Supabase only for presence sync (minimal usage)
- ✅ Estimated: ~200K-300K messages/month
- ✅ Well within Free tier

### Option 2: Disable Supabase Presence (Most Aggressive)
- Use only Cloudflare for everything
- Would need to modify participant discovery
- Estimated: 0 Supabase messages for voice chat
- ⚠️ May break participant list functionality

### Option 3: Hybrid with Longer Intervals
- Keep Supabase but increase heartbeat interval (if Cloudflare disabled)
- Use presence sync less frequently
- Estimated: ~500K-1M messages/month
- ✅ Still within Free tier

## Current Status:
✅ **You're using Cloudflare for notifications** - This saves ~90% of Supabase messages
✅ **Heartbeats are disabled when Cloudflare is enabled** - Saves ~3,000 messages/hour
✅ **Only presence sync uses Supabase** - Minimal usage

**Your current setup is optimized and should stay well within Free tier limits!**

