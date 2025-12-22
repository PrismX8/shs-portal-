# Current Supabase Realtime Usage (With Cloudflare Enabled)

## Current Setup Status:
✅ **Cloudflare Discovery: ENABLED** (primary for notifications)
✅ **Supabase Presence: ENABLED** (for participant discovery)
✅ **Supabase Heartbeats: DISABLED** (saves ~300 messages/hour per user)
✅ **Supabase Join/Leave Notifications: DISABLED** (saves ~2 messages per event)

## What Uses Supabase NOW:

### 1. Presence Channel (`voice:global`)
**Purpose:** Track who's in voice chat for participant discovery

**Usage:**
- **Join:** ~3-5 presence messages per user
- **Leave:** ~2-3 presence messages per user
- **Sync events:** Fires when users join/leave (received by all subscribers)

**Per User Session:**
- Join: ~4 messages (average)
- Leave: ~3 messages (average)
- **Total per user: ~7 messages per session**

### 2. Broadcast Channel (`voice-activity:global`)
**Purpose:** "who" requests and "here" responses (participant discovery fallback)

**Usage:**
- "who" request: ~1 message (only when someone asks)
- "here" response: ~1 message per user in VC (only if they're joined)
- **Rarely used** - only when Cloudflare participant list fails

**Per User Session:**
- Typically: 0-2 messages (only if discovery issues occur)
- **Average: ~0.5 messages per session**

## Monthly Usage Calculation:

### Scenario 1: Light Usage
- 50 users/day
- 30 minutes average session
- 1 join/leave per user
- **Daily:** 50 users × 7.5 messages = **375 messages/day**
- **Monthly:** 375 × 30 = **~11,250 messages/month**
- ✅ **Well within Free tier (2M messages)**

### Scenario 2: Moderate Usage
- 100 users/day
- 1 hour average session
- 1 join/leave per user
- **Daily:** 100 users × 7.5 messages = **750 messages/day**
- **Monthly:** 750 × 30 = **~22,500 messages/month**
- ✅ **Well within Free tier (2M messages)**

### Scenario 3: Heavy Usage
- 200 users/day
- 2 hours average session
- 1 join/leave per user
- **Daily:** 200 users × 7.5 messages = **1,500 messages/day**
- **Monthly:** 1,500 × 30 = **~45,000 messages/month**
- ✅ **Well within Free tier (2M messages)**

### Scenario 4: Very Heavy Usage
- 500 users/day
- 3 hours average session
- 1 join/leave per user
- **Daily:** 500 users × 7.5 messages = **3,750 messages/day**
- **Monthly:** 3,750 × 30 = **~112,500 messages/month**
- ✅ **Still well within Free tier (2M messages)**

## What Was SAVED by Using Cloudflare:

### Before (Without Cloudflare):
- Heartbeats: 300 messages/hour per user = **7,200 messages/day per user**
- Join/leave notifications: 2 messages per event
- **Total for 10 users/hour: ~72,000 messages/day**

### After (With Cloudflare):
- Heartbeats: **0 messages** (disabled)
- Join/leave notifications: **0 messages** (Cloudflare handles)
- Only presence sync: **~75 messages/day for 10 users**
- **Savings: ~99.9% reduction!**

## Current Impact Summary:

**✅ VERY LOW IMPACT**
- **Estimated usage:** ~11K-45K messages/month (depending on traffic)
- **Free tier limit:** 2,000,000 messages/month
- **Usage percentage:** ~0.5% - 2.25% of free tier
- **Status:** Safe and well within limits

**Key Savings:**
- ❌ No heartbeats (saved ~300 messages/hour per user)
- ❌ No join/leave notifications (saved ~2 messages per event)
- ✅ Only presence sync (minimal, ~7 messages per user session)
- ✅ Only "who"/"here" fallback (rare, ~0.5 messages per session)

## Recommendations:

**Current setup is OPTIMAL:**
- ✅ Cloudflare handles notifications (saves ~99% of messages)
- ✅ Supabase only for presence sync (minimal usage)
- ✅ Heartbeats disabled (saves thousands of messages)
- ✅ Well within free tier limits

**You're using less than 3% of your free tier quota!**

