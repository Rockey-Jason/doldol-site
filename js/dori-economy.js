(() => {
'use strict';
const SUPABASE_URL = 'https://scttowfhygcpdirrekqm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_-ZvJjR5oRhWxGge0l-l86g_Nv0ttZLF';
const $ = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const asBig = value => { try { return BigInt(String(value ?? '0').replaceAll(',','')); } catch (_) { return 0n; } };
const fmt = value => asBig(value).toLocaleString('ko-KR');
const fmtCoin = value => fmt(value) + ' D';
const fmtShort = value => {
  const n = asBig(value);
  if (n >= 1000000000000n) return (Number(n / 100000000n) / 10000).toFixed(2) + 'T';
  if (n >= 1000000000n) return (Number(n / 1000000n) / 1000).toFixed(2) + 'B';
  if (n >= 1000000n) return (Number(n / 1000n) / 1000).toFixed(2) + 'M';
  return n.toLocaleString('ko-KR');
};
const fmtPercent = value => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
};
const number = value => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toLocaleString('ko-KR') : '—';
};
const requestId = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
const SECTOR_LABELS = {semiconductor:'반도체',doronium:'도로늄',logistics:'물류',retail:'유통',energy:'에너지',construction:'건설'};
const CATEGORY_LABELS = {raw:'원자재',component:'산업 부품',doronium:'도로늄',utility:'유틸리티'};
let sb;
let sessionUser = null;
let data = {profile:null,bank:null,catalog:[],inventory:[],companies:[],listings:[],myListings:[],stocks:[],holdings:[],ledger:[]};
let toastTimer = null;
let refreshQueued = false;

function toast(message, isError) {
  const node = $('economyToast');
  node.textContent = message;
  node.classList.toggle('error', !!isError);
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 3400);
}
function showGate(show) {
  $('authGate').hidden = !show;
  $('economyApp').hidden = show;
}
function setView(view) {
  document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  document.querySelectorAll('.view-panel').forEach(panel => {
    const active = panel.id === 'view-' + view;
    panel.hidden = !active;
    panel.classList.toggle('active', active);
  });
  window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
}
function bindNavigation() {
  $('economyNav').addEventListener('click', event => {
    const button = event.target.closest('[data-view]');
    if (button) setView(button.dataset.view);
  });
  document.querySelectorAll('[data-open-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.openView)));
  $('refreshButton').addEventListener('click', () => loadAll(true));
  $('createCompanyButton').addEventListener('click', openCompanyDialog);
  $('economyApp').addEventListener('click', handleActionClick);
}
function changeRefreshStatus() {
  $('lastUpdated').textContent = '마지막 동기화 ' + new Intl.DateTimeFormat('ko-KR',{hour:'2-digit',minute:'2-digit'}).format(new Date());
}
async function init() {
  try {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') throw new Error('Supabase 라이브러리를 불러오지 못했습니다.');
    sb = window.doriSupabase || window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    if (!window.doriSupabase) window.doriSupabase = sb;
    const {data:authData,error} = await sb.auth.getSession();
    if (error) throw error;
    sessionUser = authData?.session?.user || null;
    if (!sessionUser) { showGate(true); return; }
    bindNavigation();
    showGate(false);
    await loadAll();
    sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        sessionUser = null;
        showGate(true);
      } else if (event === 'SIGNED_IN' && session.user.id !== sessionUser?.id) {
        sessionUser = session.user;
        loadAll();
      }
    });
    try {
      sb.channel('dori-economy-live')
        .on('postgres_changes',{event:'*',schema:'public',table:'dori_economy_listings'}, queueRefresh)
        .on('postgres_changes',{event:'*',schema:'public',table:'dori_stocks'}, queueRefresh)
        .subscribe();
    } catch (error) { console.info('실시간 구독을 사용할 수 없어 수동 새로고침을 유지합니다.', error); }
  } catch (error) {
    console.error('DORI ECONOMY initialization failed', error);
    showGate(true);
    toast(error.message || '경제 본부를 초기화하지 못했습니다.', true);
  }
}
function queueRefresh() {
  if (refreshQueued) return;
  refreshQueued = true;
  setTimeout(() => { refreshQueued = false; loadAll(); }, 650);
}
async function loadAll(showMessage) {
  if (!sessionUser) return;
  if (showMessage) $('refreshButton').classList.add('is-loading');
  try {
    const uid = sessionUser.id;
    const results = await Promise.all([
      sb.from('users').select('user_id,name,doldolcoin,exp_level,equipped_title').eq('user_id', uid).maybeSingle(),
      sb.from('dori_economy_catalog').select('asset_id,name,category,unit,base_price,description,sort_order').eq('enabled',true).order('sort_order'),
      sb.from('dori_economy_inventory').select('asset_id,quantity,updated_at').eq('auth_user_id',uid).order('updated_at',{ascending:false}),
      sb.from('dori_economy_companies').select('id,name,ticker,sector,description,paid_in_capital,cash_balance,total_revenue,operating_cost,status,created_at').eq('owner_user_id',uid).order('created_at',{ascending:false}),
      sb.from('dori_economy_listings').select('id,seller_user_id,seller_name,asset_id,quantity,remaining_quantity,unit_price,status,created_at').eq('status','active').order('created_at',{ascending:false}).limit(60),
      sb.from('dori_economy_listings').select('id,seller_user_id,seller_name,asset_id,quantity,remaining_quantity,unit_price,status,created_at').eq('seller_user_id',uid).order('created_at',{ascending:false}).limit(40),
      sb.from('dori_stocks').select('id,ticker,name,description,current_price,previous_price,change_percent,total_shares,volume_24h,turnover_24h,is_active').eq('is_active',true).order('volume_24h',{ascending:false}).limit(30),
      sb.from('dori_stock_holdings').select('stock_id,quantity,average_price').eq('user_id',uid),
      sb.from('dori_economy_ledger').select('id,entry_type,direction,amount,balance_after,asset_id,quantity,reference_id,description,created_at').eq('auth_user_id',uid).order('created_at',{ascending:false}).limit(12)
    ]);
    const labels = ['회원 정보','공급 품목','내 자원 창고','내 기업','마켓 상품','내 판매 등록','상장 종목','주식 보유 현황','경제 거래 기록'];
    const failed = results.findIndex(result => result.error);
    if (failed >= 0) throw new Error(labels[failed] + ' 조회 실패: ' + results[failed].error.message);
    data.profile = results[0].data;
    if (!data.bank) {
      const {data:bankData,error:bankError}=await sb.rpc('dori_bank_dashboard');
      if (bankError) throw new Error('돌이은행 자산 조회 실패: ' + bankError.message);
      data.bank=bankData;
    }
    data.catalog = results[1].data || [];
    data.inventory = results[2].data || [];
    data.companies = results[3].data || [];
    data.listings = (results[4].data || []).filter(row => row.seller_user_id !== uid);
    data.myListings = results[5].data || [];
    data.stocks = results[6].data || [];
    data.holdings = results[7].data || [];
    data.ledger = results[8].data || [];
    if (!data.profile) throw new Error('돌이사이트 회원 정보를 찾을 수 없습니다.');
    renderAll();
    changeRefreshStatus();
    if (showMessage) toast('경제 데이터가 최신 상태로 갱신되었습니다.');
  } catch (error) {
    console.error('DORI ECONOMY data load failed', error);
    toast(error.message || '경제 데이터를 불러오지 못했습니다.', true);
  } finally {
    $('refreshButton').classList.remove('is-loading');
  }
}
function maps() {
  return {
    catalog: new Map(data.catalog.map(row => [row.asset_id,row])),
    stocks: new Map(data.stocks.map(row => [String(row.id),row])),
    holdings: new Map(data.holdings.map(row => [String(row.stock_id),row]))
  };
}
function calculateTotals() {
  const wallet = asBig(data.profile?.doldolcoin);
  const stockMap = maps().stocks;
  let stockValue = 0n;
  let stockCost = 0n;
  let shareCount = 0n;
  data.holdings.forEach(row => {
    const stock = stockMap.get(String(row.stock_id));
    const qty = asBig(row.quantity);
    if (stock) stockValue += asBig(stock.current_price) * qty;
    stockCost += asBig(row.average_price) * qty;
    shareCount += qty;
  });
  const catalog = maps().catalog;
  let inventoryValue = 0n;
  let inventoryQty = 0n;
  data.inventory.forEach(row => {
    const item = catalog.get(row.asset_id);
    const qty = asBig(row.quantity);
    if (item) inventoryValue += asBig(item.base_price) * qty;
    inventoryQty += qty;
  });
  const companyValue = data.companies.reduce((sum,row) => sum + asBig(row.cash_balance),0n);
  const deposits = asBig(data.bank?.deposit_principal_total);
  const assets = wallet + deposits + stockValue + inventoryValue + companyValue;
  const marketCap = data.stocks.reduce((sum,row) => sum + (asBig(row.current_price) * asBig(row.total_shares)),0n);
  const turnover = data.stocks.reduce((sum,row) => sum + asBig(row.turnover_24h),0n);
  const changes = data.stocks.map(row => Number(row.change_percent)).filter(Number.isFinite);
  const indexChange = changes.length ? changes.reduce((a,b)=>a+b,0)/changes.length : null;
  return {wallet,deposits,stockValue,stockCost,shareCount,inventoryValue,inventoryQty,companyValue,assets,marketCap,turnover,indexChange};
}
function renderAll() {
  const t = calculateTotals();
  const name = data.profile.name || sessionUser.email?.split('@')[0] || '돌이 월드 회원';
  $('memberName').textContent = name;
  $('profileInitial').textContent = Array.from(name)[0] || 'D';
  $('memberTier').textContent = data.profile.equipped_title || ('LEVEL ' + (data.profile.exp_level || 1) + ' · PERSONAL ECONOMY ACCOUNT');
  $('walletBalance').textContent = fmt(t.wallet);
  $('bankViewBalance').textContent = fmtCoin(t.wallet);
  $('bankViewDeposits').textContent = fmtCoin(t.deposits);
  $('totalAssets').textContent = fmtShort(t.assets) + ' D';
  $('stockValue').textContent = fmtShort(t.stockValue) + ' D';
  $('stockCount').textContent = '보유 주식 ' + data.holdings.length.toLocaleString('ko-KR') + '종 · ' + fmt(t.shareCount) + '주';
  $('inventoryValue').textContent = fmtShort(t.inventoryValue) + ' D';
  $('inventoryCount').textContent = '보유 자원 ' + data.inventory.filter(x=>asBig(x.quantity)>0n).length + '종 · ' + fmt(t.inventoryQty) + '개';
  $('companyValue').textContent = fmtShort(t.companyValue) + ' D';
  $('companyCount').textContent = '운영 기업 ' + data.companies.length + '개';
  $('listedCount').textContent = number(data.stocks.length);
  $('myStockCount').textContent = number(data.holdings.filter(x=>asBig(x.quantity)>0n).length);
  $('exchangeMarketCap').textContent = fmtShort(t.marketCap) + ' D';
  $('exchangeTurnover').textContent = fmtShort(t.turnover) + ' D';
  $('treasuryMarketCap').textContent = fmtShort(t.marketCap) + ' D';
  $('treasuryTurnover').textContent = fmtShort(t.turnover) + ' D';
  $('treasuryListedCount').textContent = number(data.stocks.length);
  $('treasuryAssetCount').textContent = number(data.catalog.length);
  const indexNode = $('worldIndexChange');
  indexNode.textContent = t.indexChange === null ? '—' : fmtPercent(t.indexChange);
  indexNode.style.color = t.indexChange > 0 ? '#8bd6b1' : t.indexChange < 0 ? '#e4a2a2' : '#e7d5a4';
  $('worldIndexLabel').textContent = '활성 상장 종목 ' + data.stocks.length + '개 기준 단순 평균';
  $('overviewIndices').innerHTML = [
    indexBox('DORI MARKET INDEX',t.indexChange===null?'—':fmtPercent(t.indexChange),'상장 종목 평균 등락률'),
    indexBox('LISTED MARKET CAP',fmtShort(t.marketCap)+' D','현재가 × 총 발행 주식'),
    indexBox('24H TURNOVER',fmtShort(t.turnover)+' D','거래소 집계 거래대금'),
    indexBox('ACTIVE COMPANIES',number(data.stocks.length)+' 종목','상장 활성 종목')
  ].join('');
  renderCompactHoldings();
  renderCompactInventory();
  renderActivity();
  renderStocks(t);
  renderHoldingsTable();
  renderSupply();
  renderInventory();
  renderListings();
  renderMyListings();
  renderCompanies(t);
  renderLeaderboard();
}
function indexBox(title,value,sub) {
  return '<div class="index-box"><small>'+escapeHtml(title)+'</small><strong>'+escapeHtml(value)+'</strong><span>'+escapeHtml(sub)+'</span></div>';
}
function renderCompactHoldings() {
  const list = data.holdings.filter(row=>asBig(row.quantity)>0n).slice(0,4);
  $('overviewHoldings').innerHTML = list.length ? list.map(row=>{
    const stock = maps().stocks.get(String(row.stock_id));
    return '<div class="compact-row"><div><strong>'+escapeHtml(stock?.name || ('종목 #'+row.stock_id))+'</strong><small>'+escapeHtml(stock?.ticker || 'DORI STOCK')+' · '+fmt(row.quantity)+'주</small></div><div class="compact-value">'+fmtCoin(asBig(row.quantity)*asBig(stock?.current_price))+'</div></div>';
  }).join('') : '<div class="empty-state">아직 보유한 주식이 없습니다. 돌돌증권에서 첫 투자를 시작해 보세요.</div>';
}
function renderCompactInventory() {
  const list = data.inventory.filter(row=>asBig(row.quantity)>0n).slice(0,4);
  $('overviewInventory').innerHTML = list.length ? list.map(row=>{
    const item=maps().catalog.get(row.asset_id);
    return '<div class="compact-row"><div><strong>'+escapeHtml(item?.name || row.asset_id)+'</strong><small>'+escapeHtml(CATEGORY_LABELS[item?.category] || '산업 자원')+'</small></div><div class="compact-value">'+fmt(row.quantity)+(item?.unit || '개')+'</div></div>';
  }).join('') : '<div class="empty-state">창고가 비어 있어요. 시장에서 첫 산업 자원을 구매해 보세요.</div>';
}
function renderActivity() {
  const list = data.ledger;
  $('activityList').innerHTML = list.length ? list.map(row=>{
    const isCredit=row.direction==='credit';
    const date=new Date(row.created_at);
    const dateText=Number.isNaN(date.getTime())?'기록 시각 미상':new Intl.DateTimeFormat('ko-KR',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(date);
    return '<div class="activity-row"><span class="activity-icon">'+(isCredit?'↙':'↗')+'</span><div><strong>'+escapeHtml(row.description || row.entry_type)+'</strong><small>'+escapeHtml(dateText)+'</small></div><span class="activity-amount '+(isCredit?'credit':'debit')+'">'+(row.direction==='memo'?'수수료 ':isCredit?'+':'−')+fmtCoin(row.amount)+'</span></div>';
  }).join('') : '<div class="empty-state">아직 기록된 경제 활동이 없습니다. 공급처 구매나 기업 설립부터 시작해 보세요.</div>';
}
function renderStocks(t) {
  $('stockGrid').innerHTML = data.stocks.length ? data.stocks.map(stock=>{
    const change=Number(stock.change_percent);
    const cls=change>0?'up':change<0?'down':'flat';
    return '<article class="stock-item"><div class="stock-item-top"><div><strong>'+escapeHtml(stock.name)+'</strong><small>'+escapeHtml(stock.ticker)+'</small></div><span class="stock-change '+cls+'">'+escapeHtml(fmtPercent(change))+'</span></div><div class="stock-price">'+fmtCoin(stock.current_price)+'</div><div class="stock-item-foot"><span>시가총액 '+escapeHtml(fmtShort(asBig(stock.current_price)*asBig(stock.total_shares)))+' D</span><span>24H '+escapeHtml(fmtShort(stock.turnover_24h))+' D</span></div></article>';
  }).join('') : '<div class="empty-state">현재 활성화된 상장 종목이 없습니다.</div>';
  $('leaderboard').innerHTML = data.stocks.length ? data.stocks.slice().sort((a,b)=>Number(b.change_percent)-Number(a.change_percent)).slice(0,8).map((stock,index)=>{
    const change=Number(stock.change_percent),cls=change>0?'up':change<0?'down':'flat';
    return '<div class="leader-row"><span class="leader-rank">'+String(index+1).padStart(2,'0')+'</span><div><strong>'+escapeHtml(stock.name)+'</strong><small>'+escapeHtml(stock.ticker)+'</small></div><span class="leader-price">'+fmtCoin(stock.current_price)+'</span><span class="leader-change '+cls+'">'+escapeHtml(fmtPercent(change))+'</span></div>';
  }).join('') : '<div class="empty-state">시장 지표를 계산할 상장 종목이 없습니다.</div>';
}
function renderHoldingsTable() {
  const rows=data.holdings.filter(row=>asBig(row.quantity)>0n);
  $('holdingsTable').innerHTML = rows.length ? '<table class="holdings-table"><thead><tr><th>종목</th><th>보유 수량</th><th>평균 매입가</th><th>현재가</th><th>평가액</th></tr></thead><tbody>'+rows.map(row=>{
    const stock=maps().stocks.get(String(row.stock_id));
    const value=asBig(row.quantity)*asBig(stock?.current_price);
    return '<tr><td>'+escapeHtml(stock?.name || ('종목 #'+row.stock_id))+' <small>'+escapeHtml(stock?.ticker || '')+'</small></td><td>'+fmt(row.quantity)+'주</td><td>'+escapeHtml(number(Number(row.average_price)))+' D'+'</td><td>'+fmtCoin(stock?.current_price)+'</td><td>'+fmtCoin(value)+'</td></tr>';
  }).join('')+'</tbody></table>' : '<div class="empty-state">보유한 주식이 없습니다. 돌돌증권에서 투자 종목을 선택해 보세요.</div>';
}
function renderSupply() {
  $('supplyGrid').innerHTML=data.catalog.length?data.catalog.map(item=>{
    return '<article class="supply-item"><div class="supply-item-top"><strong>'+escapeHtml(item.name)+'</strong><small>'+escapeHtml(CATEGORY_LABELS[item.category] || item.category)+'</small></div><small>'+escapeHtml(item.description)+'</small><div class="supply-price">'+fmtCoin(item.base_price)+' <span style="font:400 9px HancomMalrangmalrang">/ '+escapeHtml(item.unit)+'</span></div><button class="small-action" type="button" data-action="buy-supply" data-asset="'+escapeHtml(item.asset_id)+'">수량 구매</button></article>';
  }).join(''):'<div class="empty-state">구매 가능한 공급 품목이 없습니다.</div>';
}
function renderInventory() {
  const entries=data.inventory.filter(row=>asBig(row.quantity)>0n);
  $('marketInventory').innerHTML=entries.length?entries.map(row=>{
    const item=maps().catalog.get(row.asset_id);
    return '<div class="inventory-row"><span class="asset-symbol">⬡</span><div class="inventory-copy"><strong>'+escapeHtml(item?.name || row.asset_id)+'</strong><small>보유 '+fmt(row.quantity)+(item?.unit || '개')+' · 기준가 '+fmtCoin(item?.base_price)+'</small></div><button class="small-action" type="button" data-action="list-asset" data-asset="'+escapeHtml(row.asset_id)+'">판매 등록</button></div>';
  }).join(''):'<div class="empty-state">창고에 등록된 자원이 없습니다. 월드 공급처에서 구매할 수 있어요.</div>';
}
function renderListings() {
  $('marketListings').innerHTML=data.listings.length?data.listings.map(row=>{
    const item=maps().catalog.get(row.asset_id);
    return '<div class="listing-row"><span class="asset-symbol">◇</span><div class="listing-copy"><strong>'+escapeHtml(item?.name || row.asset_id)+'</strong><small>'+escapeHtml(row.seller_name)+' · '+fmt(row.remaining_quantity)+'개 남음</small></div><div class="listing-price">'+fmtCoin(row.unit_price)+'<small>개당 가격</small></div><button class="small-action" type="button" data-action="buy-listing" data-id="'+row.id+'" data-max="'+row.remaining_quantity+'" data-name="'+escapeHtml(item?.name || row.asset_id)+'">구매</button></div>';
  }).join(''):'<div class="empty-state">현재 판매 중인 사용자 상품이 없습니다. 첫 번째 판매 상품을 등록해 보세요.</div>';
}
function renderMyListings() {
  $('myListings').innerHTML=data.myListings.length?data.myListings.map(row=>{
    const item=maps().catalog.get(row.asset_id);
    return '<div class="listing-row"><span class="asset-symbol">◇</span><div class="listing-copy"><strong>'+escapeHtml(item?.name || row.asset_id)+'</strong><small>'+escapeHtml(row.status==='active'?'판매 중':row.status==='filled'?'판매 완료':'취소됨')+' · 남은 '+fmt(row.remaining_quantity)+'개</small></div><div class="listing-price">'+fmtCoin(row.unit_price)+'<small>개당 가격</small></div>'+(row.status==='active'?'<button class="small-action" type="button" data-action="cancel-listing" data-id="'+row.id+'">취소</button>':'')+'</div>';
  }).join(''):'<div class="empty-state">아직 등록한 판매 상품이 없습니다.</div>';
}
function renderCompanies(t) {
  $('companyTotal').textContent=number(data.companies.length);
  $('companyCapitalTotal').textContent=fmtCoin(data.companies.reduce((sum,row)=>sum+asBig(row.paid_in_capital),0n));
  $('companySectorTotal').textContent=number(new Set(data.companies.map(row=>row.sector)).size);
  $('companyGrid').innerHTML=data.companies.length?data.companies.map(row=>{
    return '<article class="company-card"><div class="company-card-top"><div><div class="company-ticker">'+escapeHtml(row.ticker)+'</div><div class="company-name">'+escapeHtml(row.name)+'</div></div><span class="company-sector">'+escapeHtml(SECTOR_LABELS[row.sector] || row.sector)+'</span></div><div class="company-card-stats"><div><small>납입 자본금</small><strong>'+fmtCoin(row.paid_in_capital)+'</strong></div><div><small>기업 현금</small><strong>'+fmtCoin(row.cash_balance)+'</strong></div><div><small>누적 매출</small><strong>'+fmtCoin(row.total_revenue)+'</strong></div><div><small>기업 상태</small><strong>'+(row.status==='active'?'운영 중':'휴면')+'</strong></div></div><p class="company-description">'+escapeHtml(row.description || '기업 소개가 등록되지 않았습니다.')+'</p></article>';
  }).join(''):'<div class="empty-state">아직 설립한 기업이 없습니다. 첫 번째 기업을 만들어 보세요.</div>';
}
async function handleActionClick(event) {
  const button=event.target.closest('[data-action]');
  if (!button) return;
  const action=button.dataset.action;
  if (action==='buy-supply') {
    const asset=maps().catalog.get(button.dataset.asset);
    if (asset) openQuantityDialog('buy-supply',asset.asset_id,asset.name,'월드 공급처 기준가 '+fmtCoin(asset.base_price),1,1,1000000);
  } else if (action==='list-asset') {
    const asset=maps().catalog.get(button.dataset.asset);
    const inv=data.inventory.find(row=>row.asset_id===button.dataset.asset);
    if (asset && inv) openListingDialog(asset,inv);
  } else if (action==='buy-listing') {
    openQuantityDialog('buy-listing',button.dataset.id,button.dataset.name,'판매 가능 수량 '+fmt(button.dataset.max)+'개',1,1,Number(button.dataset.max));
  } else if (action==='cancel-listing') {
    if (window.confirm('이 판매 등록을 취소하고 남은 재고를 창고로 반환할까요?')) await performAction('cancel-listing',{listing_id:button.dataset.id});
  }
}
function openDialog(markup) {
  $('dialogContent').innerHTML=markup;
  const dialog=$('actionDialog');
  if (!dialog.open) dialog.showModal();
  const close=dialog.querySelector('[data-dialog-close]');
  close?.addEventListener('click',()=>dialog.close());
}
function dialogShell(kicker,title,description,fields,action,submitLabel) {
  return '<form class="dialog-shell" id="economyActionForm" data-action="'+action+'"><div class="dialog-top"><div><small>'+escapeHtml(kicker)+'</small><h3>'+escapeHtml(title)+'</h3></div><button type="button" class="dialog-close" data-dialog-close aria-label="닫기">×</button></div><p class="dialog-sub">'+escapeHtml(description)+'</p>'+fields+'<div class="dialog-actions"><button type="button" class="dialog-secondary" data-dialog-close>취소</button><button type="submit" class="dialog-submit">'+escapeHtml(submitLabel)+'</button></div></form>';
}
function field(label,name,value,type,min,max,step) {
  return '<label class="dialog-field"><span>'+escapeHtml(label)+'</span><input name="'+name+'" type="'+(type||'text')+'" value="'+escapeHtml(value??'')+'" '+(min!==undefined?'min="'+min+'"':'')+' '+(max!==undefined?'max="'+max+'"':'')+' '+(step?'step="'+step+'"':'')+' required></label>';
}
function openQuantityDialog(action,id,title,description,value,min,max) {
  const form=dialogShell('MARKET TRANSACTION',title,description,field('구매 수량','quantity',value,'number',min,max,1),action,'거래 요청');
  openDialog(form);
  attachSubmit(async formNode=>{
    const quantity=Number(formNode.elements.quantity.value);
    if (!Number.isSafeInteger(quantity)||quantity<min||quantity>max) throw new Error('허용된 수량을 입력해 주세요.');
    await performAction(action,action==='buy-supply'?{asset_id:id,quantity}:{listing_id:id,quantity});
  });
}
function openListingDialog(asset,inventory) {
  const max=Number(asBig(inventory.quantity)>1000000000n?1000000000n:asBig(inventory.quantity));
  const defaultPrice=Math.max(1,Math.round(Number(asset.base_price)*1.1));
  const fields=field('판매 수량','quantity',1,'number',1,max,1)+field('개당 판매 가격 (D)','unit_price',defaultPrice,'number',1,1000000000000,1);
  openDialog(dialogShell('USER MARKETPLACE','판매 상품 등록',asset.name+' · 보유 재고에서 수량만큼 안전하게 분리해 판매 등록합니다.',fields,'create-listing','판매 등록'));
  attachSubmit(async formNode=>{
    const quantity=Number(formNode.elements.quantity.value), price=Number(formNode.elements.unit_price.value);
    if (!Number.isSafeInteger(quantity)||quantity<1||quantity>max||!Number.isSafeInteger(price)||price<1) throw new Error('수량과 가격을 확인해 주세요.');
    await performAction('create-listing',{asset_id:asset.asset_id,quantity,unit_price:price});
  });
}
function openCompanyDialog() {
  const fields=field('기업명','name','','text')+field('종목 코드 (영문/숫자 2~6자)','ticker','','text')+
    '<label class="dialog-field"><span>산업 분야</span><select name="sector" required><option value="semiconductor">반도체</option><option value="doronium">도로늄</option><option value="logistics">물류</option><option value="retail">유통</option><option value="energy">에너지</option><option value="construction">건설</option></select></label>'+
    field('설립 자본금 (최소 10,000 D)','capital',10000,'number',10000,1000000000000,1)+
    '<label class="dialog-field"><span>기업 소개 (최대 280자)</span><textarea name="description" maxlength="280" placeholder="기업의 사업과 목표를 소개해 주세요."></textarea></label>';
  openDialog(dialogShell('DORI INDUSTRIES','새 기업 설립','설립 자본금은 개인 지갑에서 기업 현금 자산으로 이동합니다. 기업은 계정당 최대 5개까지 설립할 수 있습니다.',fields,'create-company','기업 설립 확정'));
  attachSubmit(async formNode=>{
    const name=formNode.elements.name.value.trim();
    const ticker=formNode.elements.ticker.value.trim().toUpperCase();
    const capital=Number(formNode.elements.capital.value);
    const description=formNode.elements.description.value.trim();
    if(name.length<2||name.length>40) throw new Error('기업명은 2~40자로 입력해 주세요.');
    if(!/^[A-Z0-9]{2,6}$/.test(ticker)) throw new Error('종목 코드는 영문 대문자와 숫자 2~6자여야 합니다.');
    if(!Number.isSafeInteger(capital)||capital<10000) throw new Error('설립 자본금은 10,000 D 이상이어야 합니다.');
    await performAction('create-company',{name,ticker,sector:formNode.elements.sector.value,description,capital});
  });
}
function attachSubmit(handler) {
  const form=$('economyActionForm');
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const button=form.querySelector('.dialog-submit');
    button.disabled=true;button.textContent='서버 검증 중…';
    try { await handler(form); }
    catch(error) { console.error('Economy action failed',error);toast(error.message || '거래를 완료하지 못했습니다.',true);button.disabled=false;button.textContent='다시 시도'; }
  });
}
async function performAction(action,payload) {
  const id=requestId();
  let rpcName,params;
  if(action==='buy-supply'){rpcName='dori_economy_buy_supply';params={p_asset_id:payload.asset_id,p_quantity:payload.quantity,p_request_id:id};}
  else if(action==='create-listing'){rpcName='dori_economy_create_listing';params={p_asset_id:payload.asset_id,p_quantity:payload.quantity,p_unit_price:payload.unit_price,p_request_id:id};}
  else if(action==='buy-listing'){rpcName='dori_economy_buy_listing';params={p_listing_id:payload.listing_id,p_quantity:payload.quantity,p_request_id:id};}
  else if(action==='cancel-listing'){rpcName='dori_economy_cancel_listing';params={p_listing_id:payload.listing_id,p_request_id:id};}
  else if(action==='create-company'){rpcName='dori_economy_create_company';params={p_name:payload.name,p_ticker:payload.ticker,p_sector:payload.sector,p_description:payload.description,p_capital:payload.capital,p_request_id:id};}
  else throw new Error('지원하지 않는 경제 명령입니다.');
  const {data:result,error}=await sb.rpc(rpcName,params);
  if(error) throw error;
  if(!result?.ok) throw new Error(result?.message || '서버가 거래를 승인하지 않았습니다.');
  $('actionDialog').close();
  const messages={
    'buy-supply':'공급처 구매가 완료되었습니다.',
    'create-listing':'판매 상품이 등록되었습니다. 재고는 에스크로로 보관됩니다.',
    'buy-listing':'상품 구매 및 잔액 정산이 완료되었습니다.',
    'cancel-listing':'판매 등록이 취소되고 남은 재고가 반환되었습니다.',
    'create-company':'새 기업이 설립되었습니다.'
  };
  toast(messages[action] || '경제 거래가 완료되었습니다.');
  await loadAll();
}
init();
})();