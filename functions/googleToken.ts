import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID"),
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET"),
      refresh_token: Deno.env.get("GOOGLE_REFRESH_TOKEN"),
      grant_type: 'refresh_token',
    });

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    const data = await res.json();

    if (!data.access_token) {
      return Response.json({ error: 'Falha ao obter token', details: data }, { status: 400 });
    }

    return Response.json({ access_token: data.access_token });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});