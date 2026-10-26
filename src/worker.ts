/**
 * Cloudflare Worker template for AliasMail Relay
 * Deploy directly to Cloudflare Workers using Wrangler.
 */

export interface Env {
  ALIASMAIL_WEBHOOK_SECRET?: string;
  FORWARD_URLS?: string;
  DISCORD_WEBHOOK_URL?: string;
  SLACK_WEBHOOK_URL?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/healthz') {
      return new Response(JSON.stringify({ status: 'ok', runtime: 'cloudflare-worker' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (request.method === 'POST' && url.pathname === '/webhook') {
      const rawBody = await request.text();
      const signature =
        request.headers.get('x-aliasmail-signature') ||
        request.headers.get('x-signature-sha256');

      if (env.ALIASMAIL_WEBHOOK_SECRET && signature) {
        const cleanSig = signature.startsWith('sha256=') ? signature.slice(7) : signature;
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
          'raw',
          encoder.encode(env.ALIASMAIL_WEBHOOK_SECRET),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['verify']
        );

        const sigBytes = new Uint8Array(
          cleanSig.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
        );

        const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(rawBody));

        if (!isValid) {
          return new Response(JSON.stringify({ error: 'Invalid HMAC signature' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      // Process and forward
      const payload = JSON.parse(rawBody);
      const forwardUrls = (env.FORWARD_URLS || '').split(',').map((u) => u.trim()).filter(Boolean);

      for (const targetUrl of forwardUrls) {
        try {
          await fetch(targetUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'AliasMail-Relay-Worker/1.0',
            },
            body: JSON.stringify(payload),
          });
        } catch (e) {
          console.error(`Failed to forward to ${targetUrl}`, e);
        }
      }

      return new Response(JSON.stringify({ status: 'received', eventId: payload.id }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
