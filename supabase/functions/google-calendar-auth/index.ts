// Deploy as google-calendar-auth. Disable the gateway's Verify JWT setting:
// the OAuth return has no JWT; every app action below validates its user itself.
const APP = 'https://ratioactivity.github.io/BubbleTasks/';
const ORIGIN = new URL(APP).origin;
const SCOPE = 'https://www.googleapis.com/auth/calendar.events.readonly';
const headers = {
  'Access-Control-Allow-Origin': ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Vary': 'Origin',
};
const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status, headers: {...headers, 'Content-Type': 'application/json'},
});
const bytes = (length) => crypto.getRandomValues(new Uint8Array(length));
const base64url = (value) => btoa(String.fromCharCode(...value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const hash = async (value) => base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))));
const redirect = (result) => {
  const url = new URL(APP); url.searchParams.set('google_calendar', result);
  return new Response(null, {status: 303, headers: {Location: url.href, 'Cache-Control': 'no-store'}});
};

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (origin && origin !== ORIGIN) return json({error: 'Origin not allowed.'}, 403);
  if (req.method === 'OPTIONS') return new Response(null, {status: 204, headers});
  const url = new URL(req.url);
  const callback = req.method === 'GET' && (url.searchParams.has('code') || url.searchParams.has('error'));
  try {
    const supabase = Deno.env.get('SUPABASE_URL');
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    if (!supabase || !service || !clientId || !clientSecret) return json({error: 'Google connection secrets are not configured.'}, 503);
    const callbackURL = supabase.replace(/\/$/, '') + '/functions/v1/google-calendar-auth';
    const db = async (table, query, method = 'GET', body, prefer = 'return=representation') => {
      const response = await fetch(supabase + '/rest/v1/' + table + query, {
        method, signal: AbortSignal.timeout(15000),
        headers: {apikey: service, Authorization: 'Bearer ' + service, 'Content-Type': 'application/json', Prefer: prefer},
        ...(body === undefined ? {} : {body: JSON.stringify(body)}),
      });
      if (!response.ok) throw new Error('Database setup needs attention. Check the Google Calendar tables.');
      return response.status === 204 ? [] : await response.json();
    };
    const googleToken = async (parameters) => {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', signal: AbortSignal.timeout(15000),
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: new URLSearchParams({...parameters, client_id: clientId, client_secret: clientSecret}),
      });
      const data = await response.json();
      if (!response.ok || !data.access_token) return null;
      return data;
    };
    if (callback) {
      const state = url.searchParams.get('state');
      if (!state || state.length > 200) return redirect('invalid_state');
      const rows = await db('google_calendar_oauth_states', '?state_hash=eq.' + encodeURIComponent(await hash(state))
        + '&expires_at=gt.' + encodeURIComponent(new Date().toISOString()) + '&select=user_id,code_verifier', 'DELETE');
      if (!Array.isArray(rows) || rows.length !== 1) return redirect('expired_connection');
      if (url.searchParams.has('error')) return redirect('cancelled');
      const token = await googleToken({grant_type: 'authorization_code', code: url.searchParams.get('code'),
        code_verifier: rows[0].code_verifier, redirect_uri: callbackURL});
      if (!token?.refresh_token || !String(token.scope || '').split(' ').some(scope => [SCOPE,
        'https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar'].includes(scope))) {
        return redirect('permission_required');
      }
      await db('google_calendar_connections', '?on_conflict=user_id', 'POST', {
        user_id: rows[0].user_id, refresh_token: token.refresh_token, scope: token.scope,
        connected_at: new Date().toISOString(),
      }, 'resolution=merge-duplicates,return=representation');
      return redirect('connected');
    }
    if (req.method !== 'POST') return json({error: 'Use POST for app actions.'}, 405);
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return json({error: 'Sign in to BubbleTasks first.'}, 401);
    const identity = await fetch(supabase + '/auth/v1/user', {
      headers: {apikey: service, Authorization: authorization}, signal: AbortSignal.timeout(15000),
    });
    if (!identity.ok) return json({error: 'Your BubbleTasks session expired. Sign in again.'}, 401);
    const user = await identity.json();
    if (!user.id) return json({error: 'Sign in to BubbleTasks first.'}, 401);
    let body;
    try { body = await req.json(); } catch { return json({error: 'Invalid request.'}, 400); }
    const userQuery = '?user_id=eq.' + encodeURIComponent(user.id);
    if (body.action === 'connect') {
      await db('google_calendar_oauth_states', '?expires_at=lt.' + encodeURIComponent(new Date().toISOString()), 'DELETE');
      const state = base64url(bytes(32)), verifier = base64url(bytes(48));
      await db('google_calendar_oauth_states', '', 'POST', {state_hash: await hash(state), user_id: user.id,
        code_verifier: verifier, expires_at: new Date(Date.now() + 10 * 60000).toISOString()});
      const authorize = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authorize.search = new URLSearchParams({client_id: clientId, redirect_uri: callbackURL, response_type: 'code',
        scope: SCOPE, access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state,
        code_challenge: await hash(verifier), code_challenge_method: 'S256'}).toString();
      return json({url: authorize.href});
    }
    if (body.action === 'disconnect') {
      await db('google_calendar_connections', userQuery, 'DELETE');
      await db('google_calendar_oauth_states', userQuery, 'DELETE');
      return json({connected: false});
    }
    if (!['status', 'events'].includes(body.action)) return json({error: 'Unknown action.'}, 400);
    const connections = await db('google_calendar_connections', userQuery + '&select=refresh_token,connected_at');
    const connection = connections?.[0];
    if (body.action === 'status') return json({connected: !!connection, connectedAt: connection?.connected_at || null});
    if (!connection) return json({error: 'Connect Google Calendar first.', code: 'connect_required'}, 409);
    const start = new Date(body.start), end = new Date(body.end);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || end - start > 93 * 86400000) {
      return json({error: 'Choose a calendar range of at most 93 days.'}, 400);
    }
    const token = await googleToken({grant_type: 'refresh_token', refresh_token: connection.refresh_token});
    if (!token) return json({error: 'Reconnect Google Calendar to renew access.', code: 'reconnect_required'}, 409);
    const items = []; let pageToken = '';
    for (let page = 0; page < 5; page++) {
      const query = new URLSearchParams({timeMin: start.toISOString(), timeMax: end.toISOString(), singleEvents: 'true',
        orderBy: 'startTime', maxResults: '1000', fields: 'items(id,summary,start,end,htmlLink,status),nextPageToken',
        ...(pageToken ? {pageToken} : {})});
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?' + query, {
        headers: {Authorization: 'Bearer ' + token.access_token}, signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) return json({error: 'Google could not load events. Check Calendar access or try reconnecting.'}, 502);
      const data = await response.json();
      for (const event of data.items || []) {
        if (event.status === 'cancelled') continue;
        items.push({id: event.id, title: event.summary || 'Untitled event', start: event.start, end: event.end, htmlLink: event.htmlLink});
      }
      pageToken = data.nextPageToken || '';
      if (!pageToken) break;
    }
    return json({events: items, partial: !!pageToken, fetchedAt: new Date().toISOString()});
  } catch {
    return callback ? redirect('connection_failed') : json({error: 'Google Calendar connection failed. Check the function secrets and database setup, then try again.'}, 502);
  }
});
