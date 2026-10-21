(() => {
  'use strict';
  const SUPABASE_URL = 'https://scttowfhygcpdirrekqm.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhbGciOiJIUzI1NiIsInJlZiI6InNjdHRvd2ZoeWdjcGRpcnJla3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTg0MjYsImV4cCI6MjA5NTc3NDQyNn0.XwdQhJ4Ku_C61yXz0k65AztMF9Rfe7Qzn3Av7iWRBqY';
  const byId = id => document.getElementById(id);
  const number = value => {
    const raw = String(value ?? '0').trim();
    if (/^-?\\d+$/.test(raw)) {
      try { return BigInt(raw).toLocaleString('ko-KR'); } catch (_) {}
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed.toLocaleString('ko-KR') : '—';
  };
  const date = value => { if(!value) return '—'; const d=new Date(value); return Number.isNaN(d.getTime())?'—':d.toLocaleString('ko-KR',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}); };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stance = value => ({easing:'완화',neutral:'중립',tightening:'긴축'}[value] || '중립');
  const category = value => ({policy:'통화 정책',economy:'경제 동향',market:'시장 안내',notice:'일반 공지'}[value] || '일반 공지');
  let sb;
  try {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') throw new Error('Supabase 라이브러리를 불러오지 못했습니다.');
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    byId('dataStatus').textContent = '서비스 연결 오류';
    console.error(e);
    return;
  }
  function renderHistory(rows) {
    const root = byId('policyHistory');
    if (!rows || !rows.length) { root.innerHTML = '<div class="cb-empty">아직 공개된 정책 결정 이력이 없습니다.</div>'; return; }
    root.innerHTML = rows.map(row => {
      const oldP = row.previous_values || {}, next = row.new_values || {};
      const oldRate = Number(oldP.base_rate_pct), newRate = Number(next.base_rate_pct);
      let change = '최초 정책 기록';
      if (Number.isFinite(oldRate) && Number.isFinite(newRate)) {
        change = oldRate === newRate ? '기준금리 유지 · ' + newRate.toFixed(2) + '%' : '기준금리 ' + oldRate.toFixed(2) + '% → ' + newRate.toFixed(2) + '%';
      }
      if (oldP.liquidity_stance !== next.liquidity_stance && next.liquidity_stance) change += ' · 유동성 ' + stance(next.liquidity_stance);
      return '<article class="cb-history-item"><div class="cb-history-date">' + esc(date(row.created_at)) + '</div><div class="cb-history-change">' + esc(change) + '</div><div class="cb-history-reason">' + esc(row.reason || '정책 변경') + '</div></article>';
    }).join('');
  }
  function renderAnnouncements(rows) {
    const root = byId('announcementList');
    if (!rows || !rows.length) { root.innerHTML = '<div class="cb-empty cb-empty-large">아직 공개된 발표가 없습니다. 중앙은행의 첫 공식 발표를 기다려 주세요.</div>'; return; }
    root.innerHTML = rows.map(row => '<article class="cb-announcement"><div class="cb-announcement-top"><span class="cb-category">' + esc(category(row.category)) + '</span><time class="cb-announcement-date">' + esc(date(row.published_at || row.created_at)) + '</time></div><h3>' + esc(row.title) + '</h3><p>' + esc(row.content) + '</p><div class="cb-announcement-footer"><span>OFFICIAL RELEASE&nbsp; ↗</span></div></article>').join('');
  }
  async function loadAll() {
    byId('dataStatus').textContent = '최신 자료 확인 중';
    const results = await Promise.all([
      sb.rpc('dori_central_bank_public_summary'),
      sb.from('dori_central_bank_policy').select('base_rate_pct,inflation_target_pct,liquidity_stance,public_note,updated_at').eq('id', 1).maybeSingle(),
      sb.from('dori_central_bank_policy_history').select('previous_values,new_values,reason,created_at').order('created_at',{ascending:false}).limit(5),
      sb.from('dori_central_bank_announcements').select('id,title,content,category,published_at,created_at').eq('is_published',true).order('published_at',{ascending:false,nullsFirst:false}).limit(6)
    ]);
    const [summaryRes, policyRes, historyRes, announcementRes] = results;
    if (summaryRes.error) {
      byId('dataStatus').textContent = '통계 연결 실패';
      byId('coinSupply').textContent = '—'; byId('userCount').textContent = '—'; byId('stockCount').textContent = '—';
      console.error('중앙은행 공개 통계 오류:', summaryRes.error);
    } else {
      const data = summaryRes.data || {};
      byId('coinSupply').textContent = number(data.user_held_doldolcoin) + ' D';
      byId('userCount').textContent = number(data.registered_users);
      byId('stockCount').textContent = number(data.active_stocks);
      const when = date(data.as_of);
      byId('lastUpdated').textContent = when;
      byId('footerUpdated').textContent = when;
      byId('dataStatus').textContent = '자료 연결 완료';
    }
    if (policyRes.error) {
      byId('publicNote').textContent = '정책 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.';
      console.error('중앙은행 정책 조회 오류:', policyRes.error);
    } else if (policyRes.data) {
      const p = policyRes.data;
      const rate = Number(p.base_rate_pct || 0).toFixed(2);
      byId('policyRate').innerHTML = esc(rate) + '<span>%</span>';
      byId('heroPolicyRate').innerHTML = esc(rate) + '<small>%</small>';
      byId('inflationTarget').textContent = Number(p.inflation_target_pct || 0).toFixed(2) + '%';
      byId('liquidityStance').textContent = stance(p.liquidity_stance);
      byId('publicNote').textContent = p.public_note || '등록된 공개 설명이 없습니다.';
      byId('policyUpdated').textContent = date(p.updated_at);
    }
    if (historyRes.error) { byId('policyHistory').innerHTML='<div class="cb-empty">정책 이력을 불러오지 못했습니다.</div>'; console.error(historyRes.error); }
    else renderHistory(historyRes.data || []);
    if (announcementRes.error) { byId('announcementList').innerHTML='<div class="cb-empty cb-empty-large">공식 발표를 불러오지 못했습니다.</div>'; console.error(announcementRes.error); }
    else renderAnnouncements(announcementRes.data || []);
    try {
      const { data: authData } = await sb.auth.getSession();
      if (authData && authData.session) {
        const { data: authorized, error } = await sb.rpc('admin_is_authorized');
        if (!error && authorized === true) byId('adminLink').hidden = false;
      }
    } catch (e) { console.info('관리자 링크는 공개 화면에 표시하지 않습니다.'); }
  }
  loadAll();
})();
