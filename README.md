# 📬 AliasMail Relay

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-Supported-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Node.js Version](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

**AliasMail Relay** is a self-hostable, zero-log privacy email relay and webhook dispatch gateway. It enables developers and self-hosters to receive real-time email webhooks from [AliasMail](https://aliasmail.space/) or Cloudflare Email Routing, verify HMAC-SHA256 signatures, and securely dispatch notifications to internal microservices, Discord, Slack, or local queues.

---

## ✨ Features

- 🔒 **HMAC-SHA256 Verification**: Cryptographically validates webhook signatures using constant-time comparisons to prevent timing and spoofing attacks.
- 🚀 **Multi-Target Dispatch**: Fan-out verified emails simultaneously to internal microservices, Discord channels, Slack, or webhooks.
- 🐳 **Docker & Docker Compose**: 1-command deployment with built-in health checks (`/healthz`).
- ⚡ **Cloudflare Workers Ready**: Deploy serverlessly to Cloudflare edge in seconds with zero infrastructure maintenance.
- 🛡️ **Zero-Log & Privacy-Preserving**: Dispatches payloads strictly in memory without persisting email bodies to disk.
- 📦 **Zero External Dependencies**: Core HTTP server uses native Node.js APIs (`node:crypto`, `node:http`).

---

## 🏗️ Architecture

```
                                      ┌─────────────────────────────────┐
                                      │  AliasMail / Cloudflare Router  │
                                      │       (aliasmail.space)         │
                                      └────────────────┬────────────────┘
                                                       │
                                          POST /webhook (HMAC-SHA256)
                                                       │
                                                       ▼
                                      ┌─────────────────────────────────┐
                                      │      AliasMail Relay Gateway    │
                                      │  - HMAC signature verification  │
                                      │  - Payload parsing & filtering  │
                                      └────┬───────────┬───────────┬────┘
                                           │           │           │
                     ┌─────────────────────┘           │           └─────────────────────┐
                     ▼                                 ▼                                 ▼
         ┌───────────────────────┐         ┌───────────────────────┐         ┌───────────────────────┐
         │ Internal Microservice │         │    Discord Channel    │         │     Slack Channel     │
         │   (Local dev / API)   │         │       (Webhook)       │         │       (Webhook)       │
         └───────────────────────┘         └───────────────────────┘         └───────────────────────┘
```

---

## 🚀 Quickstart

### 1. Docker Compose (Recommended)

Clone the repository and run via Docker Compose:

```bash
git clone https://github.com/anshu4sharma/aliasmail-relay.git
cd aliasmail-relay

# Copy environment template
cp .env.example .env

# Start container
docker compose up -d
```

Check the health status:
```bash
curl http://localhost:3000/healthz
```

---

### 2. Standalone Node.js

```bash
git clone https://github.com/anshu4sharma/aliasmail-relay.git
cd aliasmail-relay

npm install
npm run build
npm start
```

---

### 3. Serverless Deployment on Cloudflare Workers

Deploy the relay directly to the edge using Wrangler:

```bash
npx wrangler deploy
```

Set your HMAC secret via Cloudflare secrets:
```bash
npx wrangler secret put ALIASMAIL_WEBHOOK_SECRET
```

---

## ⚙️ Configuration

Configure the gateway using environment variables:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Local HTTP port for the server | `3000` |
| `ALIASMAIL_WEBHOOK_SECRET` | HMAC-SHA256 signing secret configured on AliasMail | *(Optional, recommended)* |
| `FORWARD_URLS` | Comma-separated list of downstream HTTP/S webhook URLs | `""` |
| `DISCORD_WEBHOOK_URL` | Discord incoming webhook URL for instant channel alerts | *(Optional)* |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook URL for notifications | *(Optional)* |

---

## 📨 Webhook Payload Schema

The gateway receives standard webhook JSON payloads:

```json
{
  "id": "evt_9f81bc20a",
  "alias": "newsletter.x9k2@aliasmail.space",
  "from": {
    "name": "Jane Doe",
    "email": "jane@example.com"
  },
  "to": [
    {
      "email": "newsletter.x9k2@aliasmail.space"
    }
  ],
  "subject": "Verification code: 849201",
  "text": "Your one-time passcode is 849201.",
  "html": "<p>Your one-time passcode is <strong>849201</strong>.</p>",
  "timestamp": "2026-10-26T22:30:00Z"
}
```

---

## 🔒 Verification Example in Other Languages

If you need to verify AliasMail HMAC-SHA256 signatures in your own applications:

### Python
```python
import hmac, hashlib

def verify_signature(raw_payload: bytes, signature_header: str, secret: str) -> bool:
    clean_sig = signature_header.replace("sha256=", "")
    expected = hmac.new(secret.encode(), raw_payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, clean_sig)
```

### Go
```go
package main

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "strings"
)

func VerifySignature(payload []byte, sigHeader, secret string) bool {
    cleanSig := strings.TrimPrefix(sigHeader, "sha256=")
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(payload)
    expected := hex.EncodeToString(mac.Sum(nil))
    return hmac.Equal([]byte(expected), []byte(cleanSig))
}
```

---

## 🤝 Contributing

Contributions, bug reports, and suggestions are welcome!
Please submit Pull Requests or file issues on [GitHub](https://github.com/anshu4sharma/aliasmail-relay).

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
Built for use with [AliasMail](https://aliasmail.space/).
