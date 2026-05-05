import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function hashPayload(text: string) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function pick(payload: any, keys: string[]) {
  for (const key of keys) {
    if (payload && payload[key] !== undefined && payload[key] !== null && payload[key] !== '') return payload[key];
  }
  return '';
}

function norm(value: any) {
  return String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizedWords(value: any) {
  const stopWords = new Set(['tenis', 'produto', 'par', 'com', 'sem', 'para', 'masculino', 'feminino', 'original']);
  return norm(value)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 3 && !stopWords.has(word));
}

function nameIsStrongMatch(detectedName: string, stockName: string) {
  const words = normalizedWords(detectedName);
  if (!words.length) return false;
  const stock = norm(stockName);
  const hits = words.filter(word => stock.includes(word)).length;
  return hits >= Math.max(2, Math.ceil(words.length * 0.6));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET() {
  return NextResponse.json({ ok: true, system: 'GOATED.OS 6.3', endpoint: 'Droper webhook' });
}

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || '';
  const expected = process.env.DROPER_WEBHOOK_TOKEN || 'goated-droper-2026';
  const raw = await req.text();
  const hash = hashPayload(raw || req.nextUrl.searchParams.toString());
  let payload: any = {};
  try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = { raw_text: raw }; }

  const detected = {
    event_type: String(pick(payload, ['event', 'evento', 'type', 'status']) || 'venda_finalizada'),
    order_id: String(pick(payload, ['idVenda', 'id_venda', 'order_id', 'pedido_id', 'id']) || ''),
    sku: String(pick(payload, ['sku', 'product_sku', 'codigo']) || ''),
    product_name: String(pick(payload, ['nomeProduto', 'nome_produto', 'product_name', 'produto', 'name']) || ''),
    size: String(pick(payload, ['tamanho', 'size', 'numero']) || ''),
    amount: Number(pick(payload, ['precoProduto', 'preco_produto', 'product_price', 'total', 'amount', 'price']) || 0),
    shipping: Number(pick(payload, ['precoFrete', 'preco_frete', 'shipping', 'frete']) || 0)
  };

  const supabase = getSupabaseAdmin();
  const event = {
    source: 'droper',
    event_type: detected.event_type,
    token_received: token,
    query: Object.fromEntries(req.nextUrl.searchParams.entries()),
    payload_raw: raw,
    payload,
    detected_order_id: detected.order_id,
    detected_sku: detected.sku,
    detected_product_name: detected.product_name,
    detected_size: detected.size,
    detected_amount: detected.amount,
    detected_shipping: detected.shipping,
    processing_status: token === expected ? 'recebido' : 'token_invalido',
    processing_note: token === expected ? 'Webhook recebido.' : 'Token inv\u00e1lido.',
    hash
  };

  const { data: webhookEvent, error } = await supabase.from('webhook_events').upsert(event, { onConflict: 'hash' }).select().single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (token !== expected) return NextResponse.json({ ok: false, error: 'Token inv\u00e1lido' }, { status: 401 });

  if (detected.order_id) {
    const { data: existingSale, error: duplicateError } = await supabase.from('sales').select('id').eq('droper_order_id', detected.order_id).limit(1);
    if (duplicateError) return NextResponse.json({ ok: false, error: duplicateError.message }, { status: 500 });
    if (existingSale && existingSale.length) {
      await supabase.from('webhook_events').update({ processing_status: 'duplicado', processing_note: 'Venda Droper duplicada. Nenhuma nova venda foi criada.' }).eq('id', webhookEvent.id);
      return NextResponse.json({ ok: true, message: 'Webhook duplicado. Venda j\u00e1 existia.', detected, processing_status: 'duplicado' });
    }
  }

  const { data: availableStock, error: stockError } = await supabase.from('stock_items').select('*').eq('status', 'disponivel');
  if (stockError) return NextResponse.json({ ok: false, error: stockError.message }, { status: 500 });

  const sizeFiltered = (availableStock || []).filter((item: any) => !detected.size || norm(item.size) === norm(detected.size));
  let matches: any[] = [];

  if (detected.sku) {
    matches = sizeFiltered.filter((item: any) => item.sku && norm(item.sku) === norm(detected.sku));
  }

  if (!matches.length && detected.product_name) {
    matches = sizeFiltered.filter((item: any) => nameIsStrongMatch(detected.product_name, item.name));
  }

  if (!matches.length) {
    await supabase.from('webhook_events').update({ processing_status: 'recebido', processing_note: 'Webhook recebido. Nenhum item dispon\u00edvel compat\u00edvel encontrado.' }).eq('id', webhookEvent.id);
    return NextResponse.json({ ok: true, message: 'Webhook recebido sem match autom\u00e1tico', detected, processing_status: 'recebido' });
  }

  if (matches.length > 1) {
    await supabase.from('webhook_events').update({ processing_status: 'precisa_revisao', processing_note: 'Mais de um item compatível encontrado.' }).eq('id', webhookEvent.id);
    return NextResponse.json({ ok: true, message: 'Webhook recebido com múltiplos matches', detected, processing_status: 'precisa_revisao' });
  }

  const item = matches[0];
  const candidateNote = `Possível item encontrado. Confirme manualmente para transformar em venda. Item: ${item.name || 'sem nome'} ${item.size || ''} | ID: ${item.id}.`;
  await supabase.from('webhook_events').update({ processing_status: 'match_encontrado', processing_note: candidateNote }).eq('id', webhookEvent.id);

  return NextResponse.json({ ok: true, message: 'Match encontrado. Confirme manualmente para criar a venda.', detected, processing_status: 'match_encontrado', candidate_stock_item_id: item.id });
}


