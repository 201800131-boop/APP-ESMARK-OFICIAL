import { createClient } from 'jsr:@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS'
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || supabaseAnonKey;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const KV_TABLE = 'kv_store_09dfc183';
const SETTINGS_KEY = 'settings';
const TRELLO_PREFS_KEY = 'trello_preferences';

const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });

function sanitizeSettings(settings: Record<string, any> = {}) {
  const { trello_api_key, trello_token, ...safeSettings } = settings;
  return {
    ...safeSettings,
    has_trello_api_key: !!trello_api_key,
    has_trello_token: !!trello_token,
    trello_enabled: !!trello_api_key && !!trello_token && !!safeSettings.trello_board_id,
  };
}

async function kvGet<T = any>(key: string): Promise<T | null> {
  const { data, error } = await supabase
    .from(KV_TABLE)
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data?.value as T) ?? null;
}

async function kvSet(key: string, value: any): Promise<void> {
  const { error } = await supabase
    .from(KV_TABLE)
    .upsert({ key, value });

  if (error) {
    throw new Error(error.message);
  }
}

function getTrelloConfig(settings: any) {
  const apiKey = settings?.trello_api_key;
  const token = settings?.trello_token;
  const boardId = settings?.trello_board_id;

  if (!apiKey || !token) {
    throw new Error('Configuracion de Trello incompleta (api key/token)');
  }

  return { apiKey, token, boardId };
}

async function trelloRequest(path: string, init: RequestInit = {}, apiKey?: string, token?: string) {
  if (!apiKey || !token) {
    throw new Error('Credenciales de Trello faltantes');
  }

  const hasQuery = path.includes('?');
  const separator = hasQuery ? '&' : '?';
  const url = `https://api.trello.com/1${path}${separator}key=${encodeURIComponent(apiKey)}&token=${encodeURIComponent(token)}`;

  const response = await fetch(url, init);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Trello API ${response.status}: ${text || response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await response.json();
  }

  return await response.text();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === 'GET' && path.endsWith('/health')) {
      return json(200, { ok: true, service: 'esmark-trello', timestamp: new Date().toISOString() });
    }

    if (req.method === 'PUT' && path.endsWith('/settings')) {
      const incoming = await req.json();
      const current = (await kvGet<Record<string, any>>(SETTINGS_KEY)) || {};
      const merged = { ...current, ...incoming, updated_at: new Date().toISOString() };
      await kvSet(SETTINGS_KEY, merged);
      return json(200, { success: true, settings: sanitizeSettings(merged) });
    }

    if (req.method === 'GET' && path.endsWith('/settings')) {
      const settings = (await kvGet<Record<string, any>>(SETTINGS_KEY)) || {};
      return json(200, { settings: sanitizeSettings(settings) });
    }

    if (req.method === 'POST' && path.endsWith('/trello/preferences')) {
      const preferences = await req.json();
      await kvSet(TRELLO_PREFS_KEY, preferences);
      return json(200, { success: true, preferences });
    }

    if (req.method === 'GET' && path.endsWith('/trello/preferences')) {
      const preferences = await kvGet(TRELLO_PREFS_KEY);
      return json(200, { preferences: preferences || null });
    }

    if (req.method === 'POST' && path.endsWith('/trello/webhook/ensure')) {
      return json(200, { success: true, created: false, message: 'Webhook ensure habilitado en backend principal' });
    }

    const settings = await kvGet<Record<string, any>>(SETTINGS_KEY);
    const { apiKey, token, boardId } = getTrelloConfig(settings || {});

    if (req.method === 'GET' && /\/trello\/lists\/[^/]+$/.test(path)) {
      const board = path.split('/').pop() || boardId;
      const lists = await trelloRequest(`/boards/${board}/lists`, { method: 'GET' }, apiKey, token);
      return json(200, { lists });
    }

    if (req.method === 'GET' && /\/trello\/labels\/[^/]+$/.test(path)) {
      const board = path.split('/').pop() || boardId;
      const labels = await trelloRequest(`/boards/${board}/labels`, { method: 'GET' }, apiKey, token);
      return json(200, { labels });
    }

    if (req.method === 'GET' && /\/trello\/members\/[^/]+$/.test(path)) {
      const board = path.split('/').pop() || boardId;
      const members = await trelloRequest(`/boards/${board}/members`, { method: 'GET' }, apiKey, token);
      return json(200, { members });
    }

    if (req.method === 'GET' && path.endsWith('/trello/cards')) {
      const listId = url.searchParams.get('listId');
      if (listId) {
        const cards = await trelloRequest(`/lists/${listId}/cards`, { method: 'GET' }, apiKey, token);
        return json(200, { cards });
      }

      if (!boardId) {
        return json(400, { error: 'trello_board_id no configurado' });
      }

      const cards = await trelloRequest(`/boards/${boardId}/cards`, { method: 'GET' }, apiKey, token);
      return json(200, { cards });
    }

    if (req.method === 'GET' && path.endsWith('/trello/board-cards')) {
      if (!boardId) {
        return json(400, { error: 'trello_board_id no configurado' });
      }
      const cards = await trelloRequest(`/boards/${boardId}/cards?attachments=true`, { method: 'GET' }, apiKey, token);
      return json(200, { success: true, cards });
    }

    if (req.method === 'POST' && path.endsWith('/trello/create-card')) {
      const body = await req.json();
      const cardPayload: Record<string, any> = {
        name: body?.name || 'Sin nombre',
        idList: body?.listId || settings?.trello_list_production || settings?.trello_list_pending
      };

      if (!cardPayload.idList) {
        return json(400, { error: 'No hay lista destino para crear la tarjeta' });
      }

      if (body?.desc) cardPayload.desc = body.desc;
      if (body?.due) cardPayload.due = body.due;
      if (Array.isArray(body?.labelIds) && body.labelIds.length > 0) cardPayload.idLabels = body.labelIds.join(',');
      if (Array.isArray(body?.memberIds) && body.memberIds.length > 0) cardPayload.idMembers = body.memberIds.join(',');

      const card = await trelloRequest('/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardPayload)
      }, apiKey, token);

      return json(200, { success: true, card });
    }

    if (req.method === 'GET' && /\/trello\/card\/[^/]+$/.test(path)) {
      const cardId = path.split('/').pop() || '';
      const card = await trelloRequest(`/cards/${cardId}?attachments=true`, { method: 'GET' }, apiKey, token);
      return json(200, { success: true, card });
    }

    if (req.method === 'PUT' && /\/trello\/card\/[^/]+$/.test(path)) {
      const cardId = path.split('/').pop() || '';
      const updates = await req.json();
      const card = await trelloRequest(`/cards/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      }, apiKey, token);
      return json(200, { success: true, card });
    }

    if (req.method === 'POST' && /\/trello\/card\/[^/]+\/attachment$/.test(path)) {
      const cardId = path.split('/')[path.split('/').length - 2] || '';
      const incoming = await req.formData();
      const file = incoming.get('file');

      if (!file) {
        return json(400, { error: 'Archivo requerido' });
      }

      const formData = new FormData();
      formData.append('file', file);

      const attachment = await trelloRequest(`/cards/${cardId}/attachments`, {
        method: 'POST',
        body: formData
      }, apiKey, token);

      return json(200, { success: true, attachment });
    }

    if (req.method === 'GET' && /\/trello\/card\/[^/]+\/checklists$/.test(path)) {
      const cardId = path.split('/')[path.split('/').length - 2] || '';
      const checklists = await trelloRequest(`/cards/${cardId}/checklists`, { method: 'GET' }, apiKey, token);
      return json(200, { success: true, checklists });
    }

    if (req.method === 'PUT' && /\/trello\/card\/[^/]+\/checkitem\/[^/]+$/.test(path)) {
      const chunks = path.split('/');
      const itemId = chunks[chunks.length - 1] || '';
      const cardId = chunks[chunks.length - 3] || '';
      const updates = await req.json();

      const item = await trelloRequest(`/cards/${cardId}/checkItem/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      }, apiKey, token);

      return json(200, { success: true, item });
    }

    if (req.method === 'POST' && path.endsWith('/trello/sync-orders')) {
      if (!boardId) {
        return json(400, { success: false, error: 'trello_board_id no configurado' });
      }

      const cards = await trelloRequest(`/boards/${boardId}/cards?attachments=true`, { method: 'GET' }, apiKey, token);
      const activeCards = Array.isArray(cards) ? cards.filter((card: any) => !card.closed) : [];

      return json(200, {
        success: true,
        imported: 0,
        skipped: 0,
        total: activeCards.length,
        message: `${activeCards.length} tarjetas activas encontradas en Trello`,
        cards: activeCards
      });
    }

    if (req.method === 'POST' && path.endsWith('/trello/update-order-from-card')) {
      const body = await req.json();
      const cardId = body?.cardId;
      if (!cardId) {
        return json(400, { success: false, error: 'cardId es requerido' });
      }

      const card = await trelloRequest(`/cards/${cardId}?attachments=true`, { method: 'GET' }, apiKey, token);
      return json(200, { success: true, card });
    }

    return json(404, { error: 'Ruta no encontrada' });
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : 'Error interno del servidor' });
  }
});
