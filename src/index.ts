import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { verifySignature } from './verify.js';
import { forwardWebhook } from './forwarder.js';
import type { IncomingEmailWebhook, RelayConfig } from './types.js';

const config: RelayConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  webhookSecret: process.env.ALIASMAIL_WEBHOOK_SECRET,
  forwardUrls: (process.env.FORWARD_URLS || '').split(',').map((u) => u.trim()).filter(Boolean),
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramChatId: process.env.TELEGRAM_CHAT_ID,
};

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: unknown) {
  const json = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json),
  });
  res.end(json);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  // Health check endpoint
  if (req.method === 'GET' && (url.pathname === '/healthz' || url.pathname === '/health')) {
    return sendJson(res, 200, {
      status: 'ok',
      service: 'aliasmail-relay',
      uptime: process.uptime(),
      forwardTargets: config.forwardUrls.length,
      secretConfigured: Boolean(config.webhookSecret),
    });
  }

  // Webhook receiver endpoint
  if (req.method === 'POST' && url.pathname === '/webhook') {
    try {
      const rawBody = await readBody(req);
      const signature =
        (req.headers['x-aliasmail-signature'] as string) ||
        (req.headers['x-signature-sha256'] as string);

      if (!verifySignature(rawBody, signature, config.webhookSecret)) {
        console.warn('[Relay] Rejected unauthorized webhook: invalid HMAC signature');
        return sendJson(res, 401, { error: 'Invalid HMAC signature' });
      }

      let payload: IncomingEmailWebhook;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        return sendJson(res, 400, { error: 'Malformed JSON payload' });
      }

      console.log(`[Relay] Inbound email event [${payload.id}] for alias ${payload.alias} from ${payload.from?.email}`);

      // Asynchronously dispatch to forward targets
      const result = await forwardWebhook(payload, config);

      return sendJson(res, 200, {
        status: 'received',
        eventId: payload.id,
        dispatched: result.dispatched,
      });
    } catch (err) {
      console.error('[Relay] Error processing webhook:', err);
      return sendJson(res, 500, { error: 'Internal relay error' });
    }
  }

  // Not found
  return sendJson(res, 404, { error: 'Endpoint not found' });
});

server.listen(config.port, () => {
  console.log(`🚀 AliasMail Relay listening on port ${config.port}`);
  console.log(`   Health Check: http://localhost:${config.port}/healthz`);
  console.log(`   Webhook URL:  http://localhost:${config.port}/webhook`);
  console.log(`   HMAC Secret:  ${config.webhookSecret ? 'Configured (Active)' : 'None (Bypassed)'}`);
  console.log(`   Forward Targets: ${config.forwardUrls.join(', ') || 'None'}`);
});
