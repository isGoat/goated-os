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
    processing_note: token === expected ? 'Webhook recebido.' : 'Token inválido.',
    hash
  };

  const { error } = await supabase.from('webhook_events').upsert(event, { onConflict: 'hash' });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (token !== expected) return NextResponse.json({ ok: false, error: 'Token inválido' }, { status: 401 });
  return NextResponse.json({ ok: true, message: 'Webhook recebido com sucesso', detected });
}
