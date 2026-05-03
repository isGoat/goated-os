'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

type Tab = 'dashboard' | 'incoming' | 'stock' | 'sales' | 'receivables' | 'finance' | 'supplies' | 'buylab' | 'webhooks' | 'jarvis';
type Row = Record<string, any>;

const money = (v: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));
const norm = (v: any) => String(v || '').trim().toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);

const emptyIncoming = { product_type: 'tenis', name: '', brand: '', category: '', size: '', sku: '', colorway: '', condition: '', box_condition: '', model_fit: '', measurements: '', defects: '', origin: 'OLX', cost_paid: '', target_sale_price: '', payment_method: 'PIX', expected_arrival_date: '', invoice_due_date: '', notes: '' };
const emptySale = { stock_item_id: '', channel: 'Direta', gross_amount: '', shipping_amount: '0', customer_name: '', customer_phone: '', expected_receipt_date: '', payment_status: 'a_receber', droper_order_id: '', notes: '' };
const emptyAccount = { description: '', amount: '', payment_method: '', status: 'pendente', category: '', due_date: '', notes: '' };
const emptySupply = { name: '', supplier: '', lot_cost: '', purchased_quantity: '', current_quantity: '', minimum_quantity: '', decrease_per_sale: '1', kit_type: 'TODOS', notes: '' };
const emptyBuy = { product_type: 'tenis', product_name: '', brand: '', category: '', condition: '', current_price: '', projected_sale_price: '', estimated_fee: '', link: '', notes: '' };

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [incoming, setIncoming] = useState<Row[]>([]);
  const [stock, setStock] = useState<Row[]>([]);
  const [sales, setSales] = useState<Row[]>([]);
  const [receivables, setReceivables] = useState<Row[]>([]);
  const [accounts, setAccounts] = useState<Row[]>([]);
  const [supplies, setSupplies] = useState<Row[]>([]);
  const [buyLab, setBuyLab] = useState<Row[]>([]);
  const [webhooks, setWebhooks] = useState<Row[]>([]);
  const [incomingForm, setIncomingForm] = useState<any>(emptyIncoming);
  const [saleForm, setSaleForm] = useState<any>(emptySale);
  const [accountForm, setAccountForm] = useState<any>(emptyAccount);
  const [supplyForm, setSupplyForm] = useState<any>(emptySupply);
  const [buyForm, setBuyForm] = useState<any>(emptyBuy);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadAll();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) loadAll();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadAll() {
    setLoading(true); setToast('');
    const q = await Promise.all([
      supabase.from('incoming_stock').select('*').order('created_at', { ascending: false }),
      supabase.from('stock_items').select('*').order('created_at', { ascending: false }),
      supabase.from('sales').select('*').order('created_at', { ascending: false }),
      supabase.from('receivables').select('*').order('created_at', { ascending: false }),
      supabase.from('accounts_payable').select('*').order('created_at', { ascending: false }),
      supabase.from('supplies').select('*').order('created_at', { ascending: false }),
      supabase.from('buy_lab').select('*').order('created_at', { ascending: false }),
      supabase.from('webhook_events').select('*').order('created_at', { ascending: false }).limit(50)
    ]);
    const err = q.find((x) => x.error)?.error;
    if (err) { setToast(`Erro ao carregar banco: ${err.message}`); setLoading(false); return; }
    setIncoming(q[0].data || []); setStock(q[1].data || []); setSales(q[2].data || []); setReceivables(q[3].data || []); setAccounts(q[4].data || []); setSupplies(q[5].data || []); setBuyLab(q[6].data || []); setWebhooks(q[7].data || []);
    setLoading(false);
  }

  async function signUp() {
    if (!email || !password) return setToast('Informe e-mail e senha.');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return setToast(error.message);
    setToast('Usuário criado. Se o Supabase pedir confirmação, confirme no e-mail e depois clique em Entrar.');
  }

  async function signIn() {
    if (!email || !password) return setToast('Informe e-mail e senha.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setToast(error.message);
    setToast('Login realizado.');
    await loadAll();
  }

  async function signOut() { await supabase.auth.signOut(); setSession(null); }
  const setF = (setter: any, k: string, v: any) => setter((p: any) => ({ ...p, [k]: v }));

  async function createIncoming() {
    if (!incomingForm.name) return setToast('Informe o nome do item.');
    if (!incomingForm.cost_paid) return setToast('Informe o custo.');
    const payload = { ...incomingForm, cost_paid: Number(incomingForm.cost_paid || 0), target_sale_price: Number(incomingForm.target_sale_price || 0), expected_arrival_date: incomingForm.expected_arrival_date || null, invoice_due_date: incomingForm.invoice_due_date || null, created_by: session?.user?.id || null, status: 'em_transito' };
    const { error } = await supabase.from('incoming_stock').insert(payload);
    if (error) return setToast(error.message);
    setIncomingForm(emptyIncoming); setToast('Compra cadastrada em Estoque Chegando.'); await loadAll();
  }

  async function checkIn(item: Row) {
    const stockPayload = { incoming_stock_id: item.id, product_type: item.product_type, name: item.name, brand: item.brand, category: item.category, size: item.size, sku: item.sku, colorway: item.colorway, condition: item.condition, box_condition: item.box_condition, model_fit: item.model_fit, measurements: item.measurements, defects: item.defects, origin: item.origin, purchase_payment_method: item.payment_method, purchase_due_date: item.invoice_due_date, entry_date: today(), cost_base: Number(item.cost_paid || 0), total_cost: Number(item.cost_paid || 0), sale_price: Number(item.target_sale_price || 0), potential_profit: Number(item.target_sale_price || 0) - Number(item.cost_paid || 0), status: 'disponivel', health: 'novo', notes: item.notes, created_by: session?.user?.id || null };
    const { error } = await supabase.from('stock_items').insert(stockPayload);
    if (error) return setToast(error.message);
    await supabase.from('incoming_stock').update({ status: 'recebido' }).eq('id', item.id);
    setToast('Check-in feito. Item enviado ao estoque físico.'); await loadAll();
  }

  async function registerSale() {
    if (!saleForm.stock_item_id) return setToast('Selecione um item do estoque.');
    if (!saleForm.gross_amount) return setToast('Informe o valor da venda.');
    const item = stock.find((s) => s.id === saleForm.stock_item_id);
    if (!item) return setToast('Item não encontrado.');
    const gross = Number(saleForm.gross_amount || 0);
    const shipping = Number(saleForm.shipping_amount || 0);
    const channel = saleForm.channel || 'Direta';
    const fee = norm(channel).includes('droper') ? gross * 0.14 : 0;
    const net = gross - fee;
    const cost = Number(item.total_cost || item.cost_base || 0);
    const profit = net - cost;
    const { data, error } = await supabase.from('sales').insert({ stock_item_id: item.id, sale_date: today(), channel, gross_amount: gross, shipping_amount: shipping, marketplace_fee: fee, net_amount: net, cost_amount: cost, profit, payment_status: saleForm.payment_status, customer_name: saleForm.customer_name, customer_phone: saleForm.customer_phone, expected_receipt_date: saleForm.expected_receipt_date || null, droper_order_id: saleForm.droper_order_id, notes: saleForm.notes, created_by: session?.user?.id || null }).select().single();
    if (error) return setToast(error.message);
    await supabase.from('stock_items').update({ status: 'vendido', sale_channel: channel, sale_date: today(), closed_revenue: gross, marketplace_fee: fee, payment_status: saleForm.payment_status, customer_name: saleForm.customer_name, customer_phone: saleForm.customer_phone, expected_receipt_date: saleForm.expected_receipt_date || null, droper_order_id: saleForm.droper_order_id }).eq('id', item.id);
    if (saleForm.payment_status === 'a_receber') await supabase.from('receivables').insert({ sale_id: data.id, amount: net, due_date: saleForm.expected_receipt_date || null, status: 'a_receber', created_by: session?.user?.id || null });
    setSaleForm(emptySale); setToast(`Venda registrada. Lucro estimado: ${money(profit)}.`); await loadAll();
  }

  async function markReceivableReceived(r: Row) { await supabase.from('receivables').update({ status: 'recebido', received_date: today() }).eq('id', r.id); if (r.sale_id) await supabase.from('sales').update({ payment_status: 'recebido' }).eq('id', r.sale_id); setToast('Recebimento baixado.'); await loadAll(); }
  async function createAccount() { if (!accountForm.description || !accountForm.amount) return setToast('Informe descrição e valor.'); const { error } = await supabase.from('accounts_payable').insert({ ...accountForm, amount: Number(accountForm.amount || 0), due_date: accountForm.due_date || null, created_by: session?.user?.id || null }); if (error) return setToast(error.message); setAccountForm(emptyAccount); setToast('Conta cadastrada.'); await loadAll(); }
  async function markAccountPaid(a: Row) { await supabase.from('accounts_payable').update({ status: 'pago', paid_date: today() }).eq('id', a.id); setToast('Conta baixada como paga.'); await loadAll(); }
  async function createSupply() { if (!supplyForm.name) return setToast('Informe o nome do insumo.'); const qty = Number(supplyForm.current_quantity || supplyForm.purchased_quantity || 0); const { error } = await supabase.from('supplies').insert({ ...supplyForm, lot_cost: Number(supplyForm.lot_cost || 0), purchased_quantity: Number(supplyForm.purchased_quantity || qty), current_quantity: qty, minimum_quantity: Number(supplyForm.minimum_quantity || 0), decrease_per_sale: Number(supplyForm.decrease_per_sale || 1), created_by: session?.user?.id || null }); if (error) return setToast(error.message); setSupplyForm(emptySupply); setToast('Insumo cadastrado.'); await loadAll(); }
  async function createBuyLab() { if (!buyForm.product_name) return setToast('Informe o produto.'); const current = Number(buyForm.current_price || 0), sale = Number(buyForm.projected_sale_price || 0), fee = Number(buyForm.estimated_fee || 0), net = sale - fee, profit = net - current, roi = current ? (profit / current) * 100 : 0; const score = roi >= 50 ? 'Excelente' : roi >= 25 ? 'Boa' : roi >= 10 ? 'Atenção' : 'Fraca'; const { error } = await supabase.from('buy_lab').insert({ ...buyForm, current_price: current, projected_sale_price: sale, estimated_fee: fee, projected_net_revenue: net, projected_profit: profit, margin_percent: roi, roi_percent: roi, score, created_by: session?.user?.id || null }); if (error) return setToast(error.message); setBuyForm(emptyBuy); setToast('Análise BuyLab salva.'); await loadAll(); }
  async function buyLabToIncoming(b: Row) { await supabase.from('incoming_stock').insert({ product_type: b.product_type, name: b.product_name, brand: b.brand, category: b.category, condition: b.condition, origin: 'BuyLab', cost_paid: Number(b.current_price || 0), target_sale_price: Number(b.projected_sale_price || 0), payment_method: 'PIX', notes: `Criado a partir do BuyLab. Link: ${b.link || ''}`, status: 'em_transito', created_by: session?.user?.id || null }); await supabase.from('buy_lab').update({ status: 'comprado' }).eq('id', b.id); setToast('BuyLab transformado em compra.'); await loadAll(); }

  const metrics = useMemo(() => {
    const available = stock.filter((s) => norm(s.status) === 'disponivel');
    const physicalCapital = available.reduce((n, s) => n + Number(s.total_cost || s.cost_base || 0), 0);
    const transit = incoming.filter((i) => norm(i.status) === 'em_transito');
    const transitCapital = transit.reduce((n, i) => n + Number(i.cost_paid || 0), 0);
    const potentialRevenue = available.reduce((n, s) => n + Number(s.sale_price || 0), 0);
    const potentialProfit = available.reduce((n, s) => n + Number(s.potential_profit || 0), 0);
    const received = receivables.filter((r) => norm(r.status) === 'recebido').reduce((n, r) => n + Number(r.amount || 0), 0);
    const toReceive = receivables.filter((r) => norm(r.status) !== 'recebido').reduce((n, r) => n + Number(r.amount || 0), 0);
    const accountsPending = accounts.filter((a) => norm(a.status) !== 'pago').reduce((n, a) => n + Number(a.amount || 0), 0);
    const salesProfit = sales.reduce((n, s) => n + Number(s.profit || 0), 0);
    return { availableCount: available.length, transitCount: transit.length, physicalCapital, transitCapital, potentialRevenue, potentialProfit, received, toReceive, accountsPending, projectedCash: received + toReceive - accountsPending, salesProfit, prolabore: Math.max(0, salesProfit * 0.4) };
  }, [incoming, stock, sales, receivables, accounts]);

  if (!session) return <main className="auth-page"><section className="auth-card"><h1>GOATED.OS 6.1</h1><p>Entre ou crie seu primeiro usuário.</p><div className="row"><input className="field" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} /><input className="field" placeholder="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div><div className="row" style={{marginTop:12}}><button className="btn" onClick={signIn}>Entrar</button><button className="btn primary" onClick={signUp}>Criar usuário</button></div>{toast && <div className="toast">{toast}</div>}<p className="small" style={{marginTop:18}}>Se o Supabase pedir confirmação, confirme no e-mail antes de entrar.</p></section></main>;

  const availableStock = stock.filter((s) => norm(s.status) === 'disponivel');

  return <main className="shell"><aside className="sidebar"><div className="brand">GOATED.OS</div><div className="version">Versão 6.1 — Supabase + Vercel</div><nav className="nav">{[['dashboard','📊 Dashboard'],['incoming','➕ Nova compra'],['stock','📦 Estoque'],['sales','💰 Vendas'],['receivables','🧾 Recebimentos'],['finance','💳 Caixa & DRE'],['supplies','🧰 Insumos'],['buylab','🧪 BuyLab'],['webhooks','🔌 Webhooks'],['jarvis','🤖 Jarvis']].map(([k,l])=><button key={k} className={tab===k?'active':''} onClick={()=>setTab(k as Tab)}>{l}</button>)}</nav><div className="sidebar-footer"><button className="btn blue" onClick={loadAll}>{loading?'Atualizando...':'Atualizar dados'}</button><button className="btn danger" onClick={signOut}>Sair</button><span className="small">{session.user.email}</span></div></aside><section className="main"><header className="topbar"><div><h1>{titleForTab(tab)}</h1><p>Operação de tênis e roupas com item comercial único.</p></div><span className="badge green">Online</span></header>{toast && <div className="section"><b>Aviso:</b> {toast}</div>}

  {tab==='dashboard' && <><div className="cards"><Card label="Estoque físico" value={metrics.availableCount}/><Card label="Capital físico" value={money(metrics.physicalCapital)}/><Card label="Em trânsito" value={metrics.transitCount}/><Card label="Capital em trânsito" value={money(metrics.transitCapital)}/><Card label="Receita potencial" value={money(metrics.potentialRevenue)}/><Card label="Lucro potencial" value={money(metrics.potentialProfit)}/><Card label="A receber" value={money(metrics.toReceive)}/><Card label="Caixa projetado" value={money(metrics.projectedCash)}/></div><Section title="Resumo executivo"><p>Banco conectado. Cadastre uma compra, faça check-in, registre venda e baixe recebimentos.</p></Section></>}

  {tab==='incoming' && <><Section title="Cadastrar nova compra"><div className="form-grid"><Label title="Tipo"><select value={incomingForm.product_type} onChange={e=>setF(setIncomingForm,'product_type',e.target.value)}><option value="tenis">Tênis</option><option value="roupa">Roupa</option></select></Label><Label title="Nome/modelo"><input className="input" value={incomingForm.name} onChange={e=>setF(setIncomingForm,'name',e.target.value)}/></Label><Label title="Marca"><input className="input" value={incomingForm.brand} onChange={e=>setF(setIncomingForm,'brand',e.target.value)}/></Label><Label title="Categoria"><input className="input" value={incomingForm.category} onChange={e=>setF(setIncomingForm,'category',e.target.value)}/></Label><Label title="Tamanho"><input className="input" value={incomingForm.size} onChange={e=>setF(setIncomingForm,'size',e.target.value)}/></Label><Label title="Custo"><input className="input" type="number" value={incomingForm.cost_paid} onChange={e=>setF(setIncomingForm,'cost_paid',e.target.value)}/></Label><Label title="Preço alvo"><input className="input" type="number" value={incomingForm.target_sale_price} onChange={e=>setF(setIncomingForm,'target_sale_price',e.target.value)}/></Label><Label title="Previsão chegada"><input className="input" type="date" value={incomingForm.expected_arrival_date} onChange={e=>setF(setIncomingForm,'expected_arrival_date',e.target.value)}/></Label><Label title="Observações" className="full"><textarea value={incomingForm.notes} onChange={e=>setF(setIncomingForm,'notes',e.target.value)}/></Label><button className="btn primary" onClick={createIncoming}>Salvar compra</button></div></Section><Section title="Estoque chegando"><Table headers={['Item','Tipo','Marca','Tamanho','Custo','Alvo','Status','Ações']} rows={incoming.map(i=>[i.name,i.product_type,i.brand,i.size,money(i.cost_paid),money(i.target_sale_price),<Badge key="s" value={i.status}/>,norm(i.status)==='em_transito'?<button key="b" className="btn primary" onClick={()=>checkIn(i)}>Check-in</button>:'—'])}/></Section></>}

  {tab==='stock' && <Section title="Estoque físico"><Table headers={['Item','Tipo','Marca','Categoria','Tamanho','Custo','Venda alvo','Lucro pot.','Status']} rows={stock.map(s=>[s.name,s.product_type,s.brand,s.category,s.size,money(s.total_cost||s.cost_base),money(s.sale_price),money(s.potential_profit),<Badge key="s" value={s.status}/>])}/></Section>}

  {tab==='sales' && <><Section title="Registrar venda"><div className="form-grid"><Label title="Item"><select value={saleForm.stock_item_id} onChange={e=>setF(setSaleForm,'stock_item_id',e.target.value)}><option value="">Selecione</option>{availableStock.map(s=><option key={s.id} value={s.id}>{s.name} | {s.size} | {money(s.sale_price)}</option>)}</select></Label><Label title="Canal"><select value={saleForm.channel} onChange={e=>setF(setSaleForm,'channel',e.target.value)}><option>Direta</option><option>Droper</option><option>Instagram</option><option>WhatsApp</option></select></Label><Label title="Valor bruto"><input className="input" type="number" value={saleForm.gross_amount} onChange={e=>setF(setSaleForm,'gross_amount',e.target.value)}/></Label><Label title="Cliente"><input className="input" value={saleForm.customer_name} onChange={e=>setF(setSaleForm,'customer_name',e.target.value)}/></Label><Label title="Previsão recebimento"><input className="input" type="date" value={saleForm.expected_receipt_date} onChange={e=>setF(setSaleForm,'expected_receipt_date',e.target.value)}/></Label><button className="btn primary" onClick={registerSale}>Registrar venda</button></div><p className="small">Vendas Droper calculam automaticamente taxa de 14%.</p></Section><Section title="Vendas"><Table headers={['Data','Canal','Bruto','Taxa','Líquido','Custo','Lucro','Status']} rows={sales.map(s=>[s.sale_date,s.channel,money(s.gross_amount),money(s.marketplace_fee),money(s.net_amount),money(s.cost_amount),money(s.profit),<Badge key="s" value={s.payment_status}/>])}/></Section></>}

  {tab==='receivables' && <Section title="Recebimentos"><Table headers={['Valor','Vencimento','Recebido em','Status','Ações']} rows={receivables.map(r=>[money(r.amount),r.due_date||'—',r.received_date||'—',<Badge key="s" value={r.status}/>,norm(r.status)!=='recebido'?<button key="b" className="btn primary" onClick={()=>markReceivableReceived(r)}>Baixar</button>:'—'])}/></Section>}

  {tab==='finance' && <><div className="cards"><Card label="Recebido" value={money(metrics.received)}/><Card label="A receber" value={money(metrics.toReceive)}/><Card label="Contas pendentes" value={money(metrics.accountsPending)}/><Card label="Caixa projetado" value={money(metrics.projectedCash)}/><Card label="Lucro líquido" value={money(metrics.salesProfit)}/><Card label="Pró-labore seguro" value={money(metrics.prolabore)}/></div><Section title="Cadastrar conta a pagar"><div className="form-grid"><Label title="Descrição" className="wide"><input className="input" value={accountForm.description} onChange={e=>setF(setAccountForm,'description',e.target.value)}/></Label><Label title="Valor"><input className="input" type="number" value={accountForm.amount} onChange={e=>setF(setAccountForm,'amount',e.target.value)}/></Label><Label title="Vencimento"><input className="input" type="date" value={accountForm.due_date} onChange={e=>setF(setAccountForm,'due_date',e.target.value)}/></Label><button className="btn primary" onClick={createAccount}>Salvar conta</button></div></Section><Section title="Contas"><Table headers={['Descrição','Valor','Vencimento','Categoria','Status','Ações']} rows={accounts.map(a=>[a.description,money(a.amount),a.due_date||'—',a.category||'—',<Badge key="s" value={a.status}/>,norm(a.status)!=='pago'?<button key="b" className="btn primary" onClick={()=>markAccountPaid(a)}>Pagar</button>:'—'])}/></Section></>}

  {tab==='supplies' && <><Section title="Cadastrar insumo"><div className="form-grid"><Label title="Nome"><input className="input" value={supplyForm.name} onChange={e=>setF(setSupplyForm,'name',e.target.value)}/></Label><Label title="Fornecedor"><input className="input" value={supplyForm.supplier} onChange={e=>setF(setSupplyForm,'supplier',e.target.value)}/></Label><Label title="Custo lote"><input className="input" type="number" value={supplyForm.lot_cost} onChange={e=>setF(setSupplyForm,'lot_cost',e.target.value)}/></Label><Label title="Qtd atual"><input className="input" type="number" value={supplyForm.current_quantity} onChange={e=>setF(setSupplyForm,'current_quantity',e.target.value)}/></Label><button className="btn primary" onClick={createSupply}>Salvar insumo</button></div></Section><Section title="Insumos"><Table headers={['Nome','Fornecedor','Qtd atual','Mínimo','Custo lote','Status']} rows={supplies.map(s=>[s.name,s.supplier,s.current_quantity,s.minimum_quantity,money(s.lot_cost),Number(s.current_quantity||0)<=Number(s.minimum_quantity||0)?<span key="s" className="badge red">Repor</span>:<span key="s" className="badge green">OK</span>])}/></Section></>}

  {tab==='buylab' && <><Section title="BuyLab"><div className="form-grid"><Label title="Tipo"><select value={buyForm.product_type} onChange={e=>setF(setBuyForm,'product_type',e.target.value)}><option value="tenis">Tênis</option><option value="roupa">Roupa</option></select></Label><Label title="Produto"><input className="input" value={buyForm.product_name} onChange={e=>setF(setBuyForm,'product_name',e.target.value)}/></Label><Label title="Preço atual"><input className="input" type="number" value={buyForm.current_price} onChange={e=>setF(setBuyForm,'current_price',e.target.value)}/></Label><Label title="Venda projetada"><input className="input" type="number" value={buyForm.projected_sale_price} onChange={e=>setF(setBuyForm,'projected_sale_price',e.target.value)}/></Label><Label title="Taxa"><input className="input" type="number" value={buyForm.estimated_fee} onChange={e=>setF(setBuyForm,'estimated_fee',e.target.value)}/></Label><button className="btn primary" onClick={createBuyLab}>Salvar análise</button></div></Section><Section title="Oportunidades"><Table headers={['Produto','Tipo','Preço','Venda proj.','Lucro proj.','ROI','Score','Status','Ações']} rows={buyLab.map(b=>[b.product_name,b.product_type,money(b.current_price),money(b.projected_sale_price),money(b.projected_profit),`${Number(b.roi_percent||0).toFixed(1)}%`,b.score,<Badge key="s" value={b.status}/>,norm(b.status)!=='comprado'?<button key="b" className="btn primary" onClick={()=>buyLabToIncoming(b)}>Virar compra</button>:'—'])}/></Section></>}

  {tab==='webhooks' && <Section title="Webhooks Droper"><p className="small">URL: <code>{typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/droper?token=goated-droper-2026` : ''}</code></p><Table headers={['Data','Pedido','Produto','Tamanho','Valor','Status']} rows={webhooks.map(w=>[new Date(w.created_at).toLocaleString('pt-BR'),w.detected_order_id||'—',w.detected_product_name||'—',w.detected_size||'—',money(w.detected_amount),<Badge key="s" value={w.processing_status}/>])}/></Section>}

  {tab==='jarvis' && <Section title="Jarvis"><div className="jarvis-box"><h3>Diagnóstico GOATED</h3><p>Capital físico: <b>{money(metrics.physicalCapital)}</b></p><p>Capital em trânsito: <b>{money(metrics.transitCapital)}</b></p><p>Lucro líquido vendido: <b>{money(metrics.salesProfit)}</b></p><p>A receber: <b>{money(metrics.toReceive)}</b></p><p>Contas pendentes: <b>{money(metrics.accountsPending)}</b></p><p>Pró-labore seguro sugerido: <b>{money(metrics.prolabore)}</b></p><hr/><p>{metrics.accountsPending > metrics.received + metrics.toReceive ? '⚠️ Caixa projetado apertado. Priorize recebimentos antes de novas compras.' : metrics.availableCount === 0 ? '📦 Estoque físico vazio. Priorize check-in ou novas compras.' : '🟢 Operação saudável para seguir girando estoque.'}</p></div></Section>}

  </section></main>;
}

function titleForTab(tab: Tab) { return ({ dashboard:'Dashboard Operacional', incoming:'Nova Compra / Estoque Chegando', stock:'Estoque Físico', sales:'Vendas', receivables:'Recebimentos', finance:'Caixa & DRE', supplies:'Insumos', buylab:'BuyLab', webhooks:'Webhooks', jarvis:'Jarvis' } as Record<Tab,string>)[tab]; }
function Card({ label, value }: { label: string; value: any }) { return <div className="card"><span>{label}</span><strong>{value}</strong></div>; }
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="section"><h2>{title}</h2>{children}</section>; }
function Label({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) { return <label className={`label ${className}`}>{title}{children}</label>; }
function Badge({ value }: { value: string }) { const n = norm(value); const color = n.includes('dispon') || n.includes('receb') || n.includes('pago') || n.includes('ok') ? 'green' : n.includes('pend') || n.includes('transito') || n.includes('a_receber') || n.includes('analise') ? 'yellow' : n.includes('vend') || n.includes('erro') ? 'blue' : ''; return <span className={`badge ${color}`}>{value || '—'}</span>; }
function Table({ headers, rows }: { headers: string[]; rows: any[][] }) { if (!rows.length) return <p className="small">Sem dados ainda.</p>; return <div className="table-wrap"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>; }
