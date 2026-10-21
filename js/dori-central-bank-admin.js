(() => {
  'use strict';
  const SUPABASE_URL = 'https://scttowfhygcpdirrekqm.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjdHRvd2ZoeWdjcGRpcnJla3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTg0MjYsImV4cCI6MjA5NTc3NDQyNn0.XwdQhJ4Ku_C61yXz0k65AztMF9Rfe7Qzn3Av7iWRBqY';
  const $ = id => document.getElementById(id);
  const fmt = v => {
    const raw = String(v ?? '0').trim();
    if (/^-?\d+$/.test(raw)) {
      try { return BigInt(raw).toLocaleString('ko-KR'); } catch (_) {}
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed.toLocaleString('ko-KR') : '—';
  };
  const date = v => { const d=new Date(v); return !v || Number.isNaN(d.getTime())?'—':d.toLocaleString('ko-KR',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}); };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cats = {policy:'통화 정책',economy:'경제 동향',market:'시장 안내',notice:'일반 공지'};
  let sb, toastTimer = null;
  try {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') throw new Error('Supabase 라이브러리를 불러오지 못했습니다.');
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch(e) { setGate('서비스 연결 오류',e.message); return; }
  function setGate(title,message){ $('gateTitle').textContent=title; $('gateMessage').textContent=message; }
  function toast(message, error) {
    const el=$('adminToast'); el.textContent=message; el.classList.toggle('error',!!error); el.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>el.classList.remove('show'),3500);
  }
  function setBusy(button,busy,readyText) {
    if (busy) { button.dataset.readyText=button.textContent; button.disabled=true; button.textContent='처리 중…'; }
    else { button.disabled=false; button.textContent=readyText || button.dataset.readyText || '저장'; }
  }
  async function isVerifiedAdmin() {
    const {data:sessionData,error:sessionError}=await sb.auth.getSession();
    if(sessionError || !sessionData || !sessionData.session) return false;
    const {data,error}=await sb.rpc('admin_is_authorized');
    if(error) console.warn('관리자 권한 확인 오류:',error);
    return !error && data===true;
  }
  async function init() {
    setGate('관리자 인증 확인 중','검증된 관리자 세션을 확인하고 있습니다.');
    try {
      if (!(await isVerifiedAdmin())) {
        setGate('중앙은행 관리자 인증이 필요합니다','돌이사이트에 로그인한 뒤 관리자 전용 인증을 완료한 계정만 정책을 변경하거나 공지를 게시할 수 있습니다. 페이지 주소만 아는 것으로는 권한이 부여되지 않습니다.');
        return;
      }
      $('adminGate').hidden=true;
      $('adminWorkspace').hidden=false;
      $('policyForm').addEventListener('submit',savePolicy);
      $('announcementForm').addEventListener('submit',saveAnnouncement);
      $('resetAnnouncement').addEventListener('click',resetAnnouncementForm);
      await reload();
    } catch(e) {
      setGate('관리자 정보를 확인할 수 없습니다','권한이 확인되지 않은 경우 변경 작업은 실행되지 않습니다. 잠시 후 다시 시도해 주세요.');
      console.error(e);
    }
  }
  async function reload() {
    const [policyRes,annRes,auditRes,summaryRes]=await Promise.all([
      sb.from('dori_central_bank_policy').select('id,base_rate_pct,inflation_target_pct,liquidity_stance,public_note,updated_at').eq('id',1).maybeSingle(),
      sb.from('dori_central_bank_announcements').select('id,title,content,category,is_published,created_at,updated_at,published_at').order('created_at',{ascending:false}).limit(100),
      sb.from('dori_central_bank_audit_logs').select('action,target_type,target_id,details,created_at').order('created_at',{ascending:false}).limit(30),
      sb.rpc('dori_central_bank_public_summary')
    ]);
    if(policyRes.error) throw policyRes.error;
    const p=policyRes.data;
    if(!p) throw new Error('중앙은행 정책 데이터가 없습니다.');
    $('baseRateInput').value=p.base_rate_pct;
    $('inflationTargetInput').value=p.inflation_target_pct;
    $('liquidityInput').value=p.liquidity_stance;
    $('publicNoteInput').value=p.public_note;
    if(!summaryRes.error) {
      const s=summaryRes.data||{};
      $('adminCoinSupply').textContent=fmt(s.user_held_doldolcoin)+' D';
      $('adminUsers').textContent=fmt(s.registered_users);
    }
    if(annRes.error) throw annRes.error;
    const rows=annRes.data||[];
    $('adminPublished').textContent=fmt(rows.filter(x=>x.is_published).length);
    $('adminDrafts').textContent=fmt(rows.filter(x=>!x.is_published).length);
    renderAnnouncements(rows);
    if(auditRes.error) {
      $('auditList').innerHTML='<div class="cb-empty">감사 기록을 읽을 수 없습니다.</div>';
      console.warn(auditRes.error);
    } else renderAudit(auditRes.data||[]);
  }
  async function savePolicy(event) {
    event.preventDefault();
    const button=$('savePolicyButton');
    setBusy(button,true);
    try {
      const args={
        p_base_rate_pct:Number($('baseRateInput').value),
        p_inflation_target_pct:Number($('inflationTargetInput').value),
        p_liquidity_stance:$('liquidityInput').value,
        p_public_note:$('publicNoteInput').value.trim(),
        p_reason:$('policyReasonInput').value.trim()
      };
      if(!args.p_reason || args.p_reason.length<3) throw new Error('정책 변경 사유를 3자 이상 입력해 주세요.');
      const {data,error}=await sb.rpc('dori_central_bank_update_policy',args);
      if(error) throw error;
      if(!data || data.ok!==true) throw new Error('정책 저장 결과를 확인할 수 없습니다.');
      $('policyReasonInput').value='';
      toast('정책이 저장되었고 변경 이력이 기록되었습니다.');
      await reload();
    } catch(e) { console.error(e); toast(e.message||'정책을 저장하지 못했습니다.',true); }
    finally { setBusy(button,false,'정책 저장 ↗'); }
  }
  async function saveAnnouncement(event) {
    event.preventDefault();
    const button=$('saveAnnouncementButton');
    setBusy(button,true);
    try {
      const rawId=$('announcementId').value;
      const args={p_id:rawId?Number(rawId):null,p_title:$('announcementTitle').value.trim(),p_content:$('announcementContent').value.trim(),p_category:$('announcementCategory').value,p_is_published:$('publishAnnouncement').checked};
      const {data,error}=await sb.rpc('dori_central_bank_save_announcement',args);
      if(error) throw error;
      if(!data || data.ok!==true) throw new Error('공지 저장 결과를 확인할 수 없습니다.');
      resetAnnouncementForm();
      toast(args.p_is_published?'공식 발표가 게시되었습니다.':'초안이 저장되었습니다.');
      await reload();
    } catch(e) { console.error(e); toast(e.message||'공지를 저장하지 못했습니다.',true); }
    finally { setBusy(button,false,'공지 저장 ↗'); }
  }
  function resetAnnouncementForm() {
    $('announcementForm').reset();
    $('announcementId').value='';
    $('saveAnnouncementButton').textContent='공지 저장 ↗';
  }
  function renderAnnouncements(rows) {
    const root=$('adminAnnouncementList');
    $('announcementCount').textContent=rows.length+'개';
    if(!rows.length){root.innerHTML='<div class="cb-empty">등록된 발표가 없습니다. 위에서 첫 공지를 작성해 주세요.</div>';return;}
    root.innerHTML=rows.map(row=>'<article class="cb-admin-announcement"><div class="cb-admin-announcement-copy"><strong>'+esc(row.title)+'</strong><small>'+esc(cats[row.category]||'일반 공지')+' · '+esc(date(row.updated_at||row.created_at))+'</small></div><span class="cb-status-chip '+(row.is_published?'':'draft')+'">'+(row.is_published?'공개':'초안')+'</span><button type="button" class="cb-small-button" data-edit-announcement="'+Number(row.id)+'">편집</button><button type="button" class="cb-small-button" data-toggle-announcement="'+Number(row.id)+'">'+(row.is_published?'내리기':'게시')+'</button></article>').join('');
    root.querySelectorAll('[data-edit-announcement]').forEach(button=>button.addEventListener('click',()=>{
      const row=rows.find(x=>Number(x.id)===Number(button.dataset.editAnnouncement));
      if(!row)return;
      $('announcementId').value=String(row.id);
      $('announcementTitle').value=row.title;
      $('announcementContent').value=row.content;
      $('announcementCategory').value=row.category;
      $('publishAnnouncement').checked=!!row.is_published;
      $('saveAnnouncementButton').textContent='변경 저장 ↗';
      $('announcementForm').scrollIntoView({behavior:'smooth',block:'center'});
    }));
    root.querySelectorAll('[data-toggle-announcement]').forEach(button=>button.addEventListener('click',async()=>{
      const row=rows.find(x=>Number(x.id)===Number(button.dataset.toggleAnnouncement));
      if(!row)return;
      button.disabled=true;
      try {
        const {error}=await sb.rpc('dori_central_bank_save_announcement',{p_id:Number(row.id),p_title:row.title,p_content:row.content,p_category:row.category,p_is_published:!row.is_published});
        if(error)throw error;
        toast(row.is_published?'발표가 공개 목록에서 내려갔습니다.':'발표가 게시되었습니다.');
        await reload();
      } catch(e) { console.error(e); toast(e.message||'공개 상태를 변경하지 못했습니다.',true); }
      finally { button.disabled=false; }
    }));
  }
  function renderAudit(rows) {
    const root=$('auditList');
    if(!rows.length){root.innerHTML='<div class="cb-empty">아직 기록된 관리자 작업이 없습니다.</div>';return;}
    root.innerHTML=rows.map(row=>{
      const details=row.details&&typeof row.details==='object'?JSON.stringify(row.details):String(row.details||'');
      return '<div class="cb-audit-row"><time>'+esc(date(row.created_at))+'</time><strong>'+esc(row.action)+' · '+esc(row.target_type||'')+'</strong><span>'+esc(details.slice(0,700))+'</span></div>';
    }).join('');
  }
  init();
})();