import { neon } from '@neondatabase/serverless';
import { getUserId } from './_lib/auth.js';

// Payload guards: a chart state is a few KB of JSON and a thumbnail is a
// ~10KB JPEG data URL. Anything wildly larger is a bug or abuse.
const MAX_STATE_BYTES = 1_000_000;
const MAX_THUMB_BYTES = 300_000;
const MAX_NAME_LEN = 200;
// Chart ids are app-generated ("wf_<timestamp>"); constrain the shape so a
// crafted id can never carry markup into the client that renders it.
const CHART_ID_RE = /^[A-Za-z0-9_-]{1,100}$/;
// Thumbnails are rendered as image sources — only base64 image data URLs.
const THUMB_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
// Ceiling on stored charts per account: well above real use, low enough that
// a scripted account cannot fill the database.
const MAX_CHARTS_PER_USER = 300;

export default async function handler(req, res) {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'DATABASE_URL env var is not configured' });
  }
  const sql = neon(process.env.DATABASE_URL);

  let userId;
  try {
    userId = await getUserId(req);
  } catch (e) {
    console.error('auth configuration error:', e.message);
    return res.status(500).json({ error: 'Auth is not configured on the server' });
  }
  if (!userId) return res.status(401).json({ error: 'Not signed in' });

  const id = typeof req.query.id === 'string' ? req.query.id : null;

  try {
    if (req.method === 'GET' && !id) {
      const rows = await sql`
        select id, name, thumbnail, updated_at
        from charts where user_id = ${userId}
        order by updated_at desc`;
      return res.status(200).json(rows.map(r => ({
        id: r.id, name: r.name, thumbnail: r.thumbnail, updatedAt: r.updated_at,
      })));
    }

    if (req.method === 'GET') {
      if (!CHART_ID_RE.test(id)) return res.status(400).json({ error: 'Invalid chart id' });
      const rows = await sql`
        select id, name, state, updated_at
        from charts where user_id = ${userId} and id = ${id}`;
      if (!rows.length) return res.status(404).json({ error: 'Chart not found' });
      const r = rows[0];
      return res.status(200).json({ id: r.id, name: r.name, state: r.state, updatedAt: r.updated_at });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const chartId = typeof body.id === 'string' ? body.id.trim() : '';
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const state = body.state;
      const thumbnail = typeof body.thumbnail === 'string' ? body.thumbnail : null;

      if (!CHART_ID_RE.test(chartId)) return res.status(400).json({ error: 'Invalid chart id' });
      if (!name || name.length > MAX_NAME_LEN) return res.status(400).json({ error: 'Invalid chart name' });
      if (!state || typeof state !== 'object' || Array.isArray(state)) return res.status(400).json({ error: 'Invalid chart state' });
      if (JSON.stringify(state).length > MAX_STATE_BYTES) return res.status(400).json({ error: 'Chart state too large' });
      if (thumbnail && thumbnail.length > MAX_THUMB_BYTES) return res.status(400).json({ error: 'Thumbnail too large' });
      if (thumbnail && !THUMB_RE.test(thumbnail)) return res.status(400).json({ error: 'Invalid thumbnail format' });

      // Cap stored charts per account. Updates to an existing chart are
      // always allowed; only brand-new charts can hit the ceiling.
      const [{ count }] = await sql`
        select count(*)::int as count from charts
        where user_id = ${userId} and id <> ${chartId}`;
      if (count >= MAX_CHARTS_PER_USER) {
        return res.status(409).json({ error: `Chart limit reached (${MAX_CHARTS_PER_USER}). Delete a saved chart to make room.` });
      }

      await sql`
        insert into charts (user_id, id, name, state, thumbnail, updated_at)
        values (${userId}, ${chartId}, ${name}, ${JSON.stringify(state)}::jsonb, ${thumbnail}, now())
        on conflict (user_id, id) do update
          set name = excluded.name,
              state = excluded.state,
              thumbnail = excluded.thumbnail,
              updated_at = now()`;
      return res.status(200).json({ ok: true, id: chartId });
    }

    if (req.method === 'DELETE') {
      if (!id || !CHART_ID_RE.test(id)) return res.status(400).json({ error: 'Missing or invalid chart id' });
      await sql`delete from charts where user_id = ${userId} and id = ${id}`;
      return res.status(204).end();
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('charts api error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
}
