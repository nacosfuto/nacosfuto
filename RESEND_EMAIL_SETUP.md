# NACOS FUTO - Resend Email Integration Guide

This guide details the integration of **Resend** as the authoritative production email delivery service for NACOS FUTO. It covers domain verification, required DNS records, environment configuration, serverless routing, local testing, and production deployment on Vercel.

---

## 1. Overview & Architecture

Resend powers all transactional email communication for the NACOS FUTO platform, including:
- **Student Account Verification**: 6-digit OTP delivery for student registration.
- **Password Reset**: Secure single-use verification codes.
- **Payment Confirmations**: Authoritative receipts for Bachs-processed departmental dues and services.
- **Administrative Alerts**: Account recovery notifications.

### Security Architecture

```
Frontend (Portal / Website / Admin)
       │
       ▼ (HTTP POST /api/email/send)
Vercel Serverless Function (api/index.js)
       │
       ├─► Server-Side Rate Limiter (Abuse prevention & cooldown)
       │
       ├─► Supabase (Record OTP hashes & verification sessions)
       │
       ▼ (Official Resend SDK via RESEND_API_KEY)
Resend API (https://api.resend.com)
       │
       ▼ (DKIM / SPF / DMARC signed)
Student / User Inbox
```

> [!IMPORTANT]
> **Strict Secrecy Guarantee**: `RESEND_API_KEY` is exclusively read by the serverless backend (`api/index.js` and `packages/supabase/src/server/emailDispatcher.js`). It is **never** prefixed with `VITE_` and is never bundled into client-side browser code.

---

## 2. Resend Account & API Key Setup

1. **Sign Up**: Create an account on [Resend](https://resend.com).
2. **Generate API Key**:
   - Navigate to [Resend Dashboard → API Keys](https://resend.com/api-keys).
   - Click **Create API Key**.
   - Set the name (e.g., `nacosfuto-production`).
   - Set permission to **Full access** (or **Sending access**).
   - Copy the API key (format: `re_xxxxxxxxxxxxxxxxxxxxxxxx`).
   - **Never commit this key to version control.**

---

## 3. Domain Verification & DNS Records

To send emails from your official domain (e.g., `noreply@nacosfuto.org.ng`), the domain must be verified in Resend.

1. Navigate to [Resend Dashboard → Domains](https://resend.com/domains).
2. Click **Add Domain** and enter your domain: `nacosfuto.org.ng`.
3. Choose your sending region (default: `us-east-1` or `eu-west-1`).
4. Resend will provide 3 DNS records to configure at your domain registrar/DNS provider (e.g., Cloudflare, Namecheap, cPanel):

### Required DNS Records

| Record Type | Host / Name | Value / Target | Priority | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **TXT** (DKIM) | `resend._domainkey` | `k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA...` *(provided by Resend)* | — | Cryptographic sender signing |
| **TXT** (SPF) | `bounces` | `v=spf1 include:amazonses.com ~all` | — | Sender Policy Framework |
| **MX** | `bounces` | `feedback-smtp.us-east-1.amazonses.com` | `10` | Bounce handling |

### Recommended DMARC Record

If not already present on your root domain, add a DMARC policy record:

| Record Type | Host / Name | Value | Purpose |
| :--- | :--- | :--- | :--- |
| **TXT** | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc-reports@nacosfuto.org.ng` | Email deliverability & protection |

Once added, click **Verify Domain** in Resend. DNS propagation usually takes between 2 to 30 minutes.

---

## 4. Required Environment Variables

Configure these variables in your root `.env` (local) and in the Vercel Project Settings (production):

| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `EMAIL_PROVIDER` | Active email provider | `resend` |
| `RESEND_API_KEY` | Server-only Resend API key | `re_1234567890abcdef` |
| `RESEND_FROM_EMAIL` | Verified sender address (Source of Truth) | `noreply@nacosfuto.org.ng` |
| `RESEND_FROM_NAME` | Display name in recipient inboxes | `NACOS FUTO` |
| `RESEND_REPLY_TO` | Separate address where student replies are directed | `support@nacosfuto.org.ng` |

### Sender (`RESEND_FROM_EMAIL`) vs. Reply-To (`RESEND_REPLY_TO`)
- **`RESEND_FROM_EMAIL` (The Sender)**:
  - This is the address shown in the "From" field (e.g., `NACOS FUTO <noreply@nacosfuto.org.ng>`).
  - **Does not need to be an active, functioning mailbox** for Resend to send from it, as long as the parent domain has verified DNS records (DKIM/SPF) in Resend.
- **`RESEND_REPLY_TO` (The Reply Destination)**:
  - This is where an email client will automatically address any responses when a recipient clicks **"Reply"**.
  - **Must be a real, monitored email mailbox** (e.g., `support@nacosfuto.org.ng` or Google Workspace / shared team inbox) that the NACOS secretariat and executive committee can actively read and respond to.
  - The Reply-To address is never displayed as the primary sender in email clients, preserving the professional `noreply@...` transactional branding.

> [!NOTE]
> During initial testing before custom domain DNS verification completes, you can test with Resend's sandbox sender:
> `RESEND_FROM_EMAIL=onboarding@resend.dev`
> Note that in sandbox mode, Resend permits sending exclusively to the email address registered on your Resend account.

---

## 5. Local Development & Testing

In local development, the Vite development server proxies requests to `/api/email/send`.

### Testing Local Sending:
```bash
# 1. Ensure .env contains RESEND_API_KEY and RESEND_REPLY_TO
# 2. Run the integration test suite
node --env-file=.env scratch/test-resend-integration.js

# 3. Run the OTP verification flow test
node --env-file=.env scratch/test-otp-flow.js

# 4. Run the serverless router test
node --env-file=.env scratch/test-serverless-email-handler.js
```

### Development Simulation:
If `RESEND_API_KEY` is omitted in development mode (`NODE_ENV !== 'production'`), the system automatically runs in **simulated mode**:
- Emails and OTP codes are logged cleanly to the developer console.
- The application will **not** crash or fail to register accounts.
- Once credentials are provided, it immediately switches to live delivery without code changes.

---

## 6. Vercel Production Deployment

The platform is deployed on Vercel with a single unified Serverless Function (`api/index.js`).

1. Open your project on the [Vercel Dashboard](https://vercel.com).
2. Go to **Settings** → **Environment Variables**.
3. Add the following environment variables for **Production** and **Preview** environments:
   - `EMAIL_PROVIDER` = `resend`
   - `RESEND_API_KEY` = `<your-production-resend-api-key>`
   - `RESEND_FROM_EMAIL` = `noreply@nacosfuto.org.ng`
   - `RESEND_FROM_NAME` = `NACOS FUTO`
   - `RESEND_REPLY_TO` = `support@nacosfuto.org.ng`
4. Redeploy the project:
   - Trigger a new deployment via git push or click **Redeploy** on the latest build.

### Production Health Check
After deployment, verify that the email endpoint is operational:
```bash
curl https://your-deployment-url.vercel.app/api/email/health
```
Expected response:
```json
{
  "status": "healthy",
  "provider": "resend",
  "resendConfigured": true,
  "senderEmail": "noreply@nacosfuto.org.ng",
  "senderName": "NACOS FUTO",
  "replyTo": "support@nacosfuto.org.ng",
  "replyToConfigured": true
}
```

---

## 7. Rate Limiting & Abuse Prevention

To protect student inboxes and prevent spam:
- **Server Cooldown**: Consecutive sends to the same recipient require a minimum 30-second interval.
- **Sliding Window**: Maximum 5 emails per recipient within a 15-minute window.
- **HTTP 429**: Rate-limited requests return status `429 Too Many Requests` with a `retryAfterSeconds` payload that the frontend UI automatically displays in its countdown timer.
- **Single-Use OTPs**: OTPs are invalidated immediately after successful verification or when max attempts (5) are reached.
