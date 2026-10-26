import type { IncomingEmailWebhook, RelayConfig } from './types.js';

export async function forwardWebhook(
  payload: IncomingEmailWebhook,
  config: RelayConfig
): Promise<{ dispatched: number; failed: number }> {
  let dispatched = 0;
  let failed = 0;

  // 1. Forward to HTTP/S webhook destinations
  for (const url of config.forwardUrls) {
    if (!url.trim()) continue;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AliasMail-Relay/1.0',
          'X-AliasMail-Event': 'email.received',
          'X-AliasMail-Alias': payload.alias,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        dispatched++;
      } else {
        console.warn(`[Relay] Forwarding to ${url} failed with status: ${response.status}`);
        failed++;
      }
    } catch (err) {
      console.error(`[Relay] Connection error forwarding to ${url}:`, err);
      failed++;
    }
  }

  // 2. Optional: Forward alert to Discord Webhook
  if (config.discordWebhookUrl) {
    try {
      await fetch(config.discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [
            {
              title: `📧 New Email via ${payload.alias}`,
              color: 0x4f46e5,
              fields: [
                { name: 'From', value: `${payload.from.name || ''} <${payload.from.email}>`, inline: true },
                { name: 'Subject', value: payload.subject || '(No subject)', inline: true },
                { name: 'Preview', value: (payload.text || '').slice(0, 500) || '(No preview)', inline: false },
              ],
              footer: { text: 'AliasMail Relay Gateway' },
              timestamp: payload.timestamp || new Date().toISOString(),
            },
          ],
        }),
      });
      dispatched++;
    } catch (err) {
      console.error('[Relay] Failed to forward to Discord:', err);
    }
  }

  // 3. Optional: Forward alert to Slack Webhook
  if (config.slackWebhookUrl) {
    try {
      await fetch(config.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `*New Email Received* via \`${payload.alias}\`\n*From:* ${payload.from.email}\n*Subject:* ${payload.subject}\n>${(payload.text || '').slice(0, 300)}`,
        }),
      });
      dispatched++;
    } catch (err) {
      console.error('[Relay] Failed to forward to Slack:', err);
    }
  }

  return { dispatched, failed };
}
