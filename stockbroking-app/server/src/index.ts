import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { z } from 'zod';
import { getDatabase } from './sqlite.js';

const app = express();
app.use(cors());
app.use(express.json());

// Initialize database
const db = getDatabase();

// Create tables if not exists
db.exec(`
CREATE TABLE IF NOT EXISTS stocks (
  symbol TEXT PRIMARY KEY,
  name TEXT,
  sector TEXT
);

CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT NOT NULL CHECK(scope IN ('daily','monthly')),
  text TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0
);
`);

// Health
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// Stocks CRUD
app.get('/api/stocks', (_req, res) => {
  const rows = db.prepare('SELECT symbol, name, sector FROM stocks ORDER BY symbol').all();
  res.json(rows);
});

const StockBody = z.object({ symbol: z.string().min(1), name: z.string().optional(), sector: z.string().optional() });
app.post('/api/stocks', (req, res) => {
  const parse = StockBody.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { symbol, name, sector } = parse.data;
  try {
    db.prepare('INSERT OR REPLACE INTO stocks(symbol, name, sector) VALUES(?, COALESCE(?, name), COALESCE(?, sector))').run(symbol.toUpperCase(), name ?? null, sector ?? null);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to insert stock', details: String(e) });
  }
});

app.delete('/api/stocks/:symbol', (req, res) => {
  const symbol = String(req.params.symbol).toUpperCase();
  db.prepare('DELETE FROM stocks WHERE symbol = ?').run(symbol);
  res.json({ ok: true });
});

// Historical price data via Stooq (free, no key). Symbols must include exchange suffix for US: .us
// We try the provided symbol first, then try with .us if not present.
app.get('/api/stocks/history', async (req, res) => {
  try {
    const symbolsParam = String(req.query.symbols || '').trim();
    if (!symbolsParam) return res.status(400).json({ error: 'symbols query required, comma-separated' });
    const symbols = symbolsParam.split(',').map(s => s.trim()).filter(Boolean);
    const period = String(req.query.period || '1y'); // 1d, 1mo, 1y
    // Stooq supports daily historical CSV: https://stooq.com/db/h/
    // We will fetch JSON lite endpoint per symbol for simplicity
    const results: Record<string, any> = {};
    for (const sym of symbols) {
      const candidates = sym.includes('.') ? [sym] : [sym, `${sym}.us`];
      let data: any | null = null;
      for (const candidate of candidates) {
        const url = `https://stooq.com/q/l/?s=${encodeURIComponent(candidate)}&f=sd2t2ohlcv&h&e=json`;
        const resp = await axios.get(url, { timeout: 10000 });
        if (resp.data && resp.data.symbols && resp.data.symbols.length > 0 && resp.data.symbols[0].close) {
          data = resp.data.symbols[0];
          break;
        }
      }
      results[sym.toUpperCase()] = data ?? { error: 'Not found' };
    }
    res.json({ period, results });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch history', details: String(e) });
  }
});

// Portfolio combined chart data (naive): fetch last price only as placeholder
app.get('/api/portfolio/summary', async (_req, res) => {
  try {
    const symbols: string[] = db.prepare('SELECT symbol FROM stocks').all().map((r: any) => r.symbol);
    if (symbols.length === 0) return res.json({ totalValue: 0, positions: [] });
    const pricesResp = await axios.get(`https://stooq.com/q/l/?s=${symbols.map(s => encodeURIComponent(s.includes('.') ? s : `${s}.us`)).join(',')}&f=sd2t2ohlcv&h&e=json`);
    const positions = (pricesResp.data.symbols || []).map((row: any) => ({ symbol: row.symbol?.replace('.US', '') ?? '', price: Number(row.close) || 0 }));
    const totalValue = positions.reduce((sum: number, p: any) => sum + p.price, 0);
    res.json({ totalValue, positions });
  } catch (e) {
    res.status(500).json({ error: 'Failed to summarize portfolio', details: String(e) });
  }
});

// News aggregation via Yahoo Finance RSS per symbol
app.get('/api/news', async (req, res) => {
  const symbolsParam = String(req.query.symbols || '').trim();
  if (!symbolsParam) return res.status(400).json({ error: 'symbols query required' });
  const symbols = symbolsParam.split(',').map(s => s.trim()).filter(Boolean);
  const parser = new XMLParser({ ignoreAttributes: false });
  const items: any[] = [];
  try {
    await Promise.all(symbols.map(async (sym) => {
      const urlCandidates = [
        `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(sym)}&region=US&lang=en-US`,
        `https://finance.yahoo.com/rss/headline?s=${encodeURIComponent(sym)}`
      ];
      for (const url of urlCandidates) {
        try {
          const r = await axios.get(url, { timeout: 10000 });
          const data = parser.parse(r.data);
          const channelItems = data?.rss?.channel?.item || [];
          for (const it of channelItems) {
            items.push({
              symbol: sym.toUpperCase(),
              title: it.title,
              link: it.link,
              pubDate: it.pubDate,
              description: it.description
            });
          }
          break;
        } catch {
          // try next url
        }
      }
    }));
    // Sort by pubDate desc if available
    items.sort((a, b) => (new Date(b.pubDate).getTime() || 0) - (new Date(a.pubDate).getTime() || 0));
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch news', details: String(e) });
  }
});

// Penny stocks (naive): use predefined universe and filter price < 5 USD, high volume, top daily % change
const DEFAULT_PENNY_UNIVERSE = ['AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMD', 'F', 'GE', 'BAC', 'PFE', 'NOK', 'SIRI', 'NIO', 'SOFI', 'PLTR', 'RIVN', 'DNA', 'T', 'INTC', 'AMZN', 'GOOGL'];
app.get('/api/penny-stocks', async (_req, res) => {
  try {
    const symbols = DEFAULT_PENNY_UNIVERSE;
    const url = `https://stooq.com/q/l/?s=${symbols.map(s => encodeURIComponent(`${s}.us`)).join(',')}&f=sd2t2ohlcv&h&e=json`;
    const r = await axios.get(url, { timeout: 15000 });
    const rows: any[] = r.data?.symbols || [];
    const enriched = rows.map((row: any) => {
      const price = Number(row.close) || 0;
      const open = Number(row.open) || 0;
      const changePct = open ? ((price - open) / open) * 100 : 0;
      const volume = Number(row.volume) || 0;
      return { symbol: row.symbol?.replace('.US', ''), price, changePct, volume };
    }).filter(r => r.price > 0 && r.price <= 5);
    enriched.sort((a, b) => b.changePct - a.changePct);
    res.json({ items: enriched.slice(0, 10) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to compute penny stocks', details: String(e) });
  }
});

// Weather forecast (Open-Meteo 7 day)
app.get('/api/weather', async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return res.status(400).json({ error: 'lat and lon required' });
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=7&timezone=auto`;
    const r = await axios.get(url, { timeout: 10000 });
    res.json(r.data);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch forecast', details: String(e) });
  }
});

// Weather alerts (US only via weather.gov). If outside US, returns empty list gracefully.
app.get('/api/alerts', async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return res.status(400).json({ error: 'lat and lon required' });
  try {
    const url = `https://api.weather.gov/alerts/active?point=${lat},${lon}`;
    const r = await axios.get(url, { timeout: 10000, headers: { 'User-Agent': 'stockbroking-app/1.0 (opensource)' } });
    const features = r.data?.features || [];
    const alerts = features.map((f: any) => ({
      id: f.id,
      headline: f.properties?.headline,
      severity: f.properties?.severity,
      event: f.properties?.event,
      effective: f.properties?.effective,
      expires: f.properties?.expires,
      description: f.properties?.description,
      instruction: f.properties?.instruction
    }));
    res.json({ alerts });
  } catch (_e) {
    res.json({ alerts: [] });
  }
});

// To-dos CRUD
app.get('/api/todos', (req, res) => {
  const scope = String(req.query.scope || 'daily');
  const rows = db.prepare('SELECT id, scope, text, done FROM todos WHERE scope = ? ORDER BY id DESC').all(scope);
  res.json(rows);
});

const TodoBody = z.object({ scope: z.enum(['daily','monthly']), text: z.string().min(1) });
app.post('/api/todos', (req, res) => {
  const parse = TodoBody.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { scope, text } = parse.data;
  const info = db.prepare('INSERT INTO todos(scope, text, done) VALUES(?, ?, 0)').run(scope, text);
  res.json({ id: info.lastInsertRowid });
});

app.patch('/api/todos/:id', (req, res) => {
  const id = Number(req.params.id);
  const done = Boolean(req.body?.done);
  db.prepare('UPDATE todos SET done = ? WHERE id = ?').run(done ? 1 : 0, id);
  res.json({ ok: true });
});

app.delete('/api/todos/:id', (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM todos WHERE id = ?').run(id);
  res.json({ ok: true });
});

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API server listening on http://localhost:${PORT}`);
});

