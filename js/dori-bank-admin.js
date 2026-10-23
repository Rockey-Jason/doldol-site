(() => {
  'use strict';
  const SUPABASE_URL='https://scttowfhygcpdirrekqm.supabase.co';
  const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjdHRvd2ZoeWdjcGRpcnJla3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTg0MjYsImV4cCI6MjA5NTc3NDQyNn0.XwdQhJ4Ku_C61yXz0k65AztMF9Rfe7Qzn3Av7iWRBqY';
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtCoins=value=>{const raw=String(value??'0').replaceAll(',','').trim();if(!/^-?\d+$/.test(raw))return '—';try{return BigInt(raw).toLocaleString('ko-KR');}catch(_){return '—';}};
  const numericText=value=>String(value??'').replaceAll(',','').replace(/\s/g,'');
  const fmtDate=value=>{if(!value)return '—';const date=new Date(value);return Number.isNaN(date.getTime())?'—':new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(date);};
  const typeLabel=row=>({transfer_in:'받은 송금',transfer_out:'계좌이체',deposit_open:'정기예금 가입',deposit_maturity:'예금 만기 수령'}[row.tx_type]||row.tx_type||'거래');
  let sb,toastTimer=null,products=[];
  try{
    if(!window.supabase||typeof window.supabase.createClient!=='function')throw new Error('Supabase 라이브러리를 불러오지 못했습니다.');
    sb=window.doriSupabase||window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
    if(!window.doriSupabase)window.doriSupabase=sb;
  }catch(error){setGate('서비스 연결 오류',error.message);return;}
  function setGate(title,message){$('gateTitle').textContent=title;$('gateMessage').textContent=message;}
  function toast(message,error=false){
    const el=$('adminToast');el.textContent=message;el.classList.toggle('error',!!error);el.classList.add('show');
    if(toastTimer)clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3800);
  }
  function setBusy(button,busy,readyText){
    if(!button)return;
    if(busy){button.dataset.readyText=button.textContent;button.disabled=true;button.textContent='처리 중…';}
    else{button.disabled=false;button.textContent=readyText||button.dataset.readyText||'저장';}
  }
  function friendly(error){const m=String(error?.message||error||'오류가 발생했습니다.');if(/JWT|token|session|auth/i.test(m))return '관리자 인증 세션을 확인할 수 없습니다. 다시 로그인해 주세요.';return m;}
  async function init(){
    try{
      const {data,error}=await sb.auth.getSession();
      if(error)throw error;
      if(!data?.session){setGate('로그인 후 관리자 인증이 필요합니다','돌이사이트에 로그인한 뒤 관리자 전용 인증을 완료한 계정만 이 화면을 이용할 수 있습니다.');return;}
      const {data:allowed,error:authError}=await sb.rpc('admin_is_authorized');
      if(authError||allowed!==true){setGate('은행 운영 권한이 없습니다','검증된 관리자 권한이 확인되지 않았습니다. 계좌의 잔액이나 거래 내역은 여기서 임의로 변경할 수 없습니다.');return;}
      $('adminGate').hidden=true;$('adminWorkspace').hidden=false;
      $('productForm').addEventListener('submit',saveProduct);
      $('resetProductButton').addEventListener('click',resetForm);
      $('reloadAdminButton').addEventListener('click',reload);
      resetForm();
      await reload();
    }catch(error){console.error(error);setGate('은행 운영 정보를 확인할 수 없습니다',friendly(error));}
  }
  async function reload(){
    const button=$('reloadAdminButton');
    if(button)setBusy(button,true,'새로고침 ↻');
    try{
      const {data,error}=await sb.rpc('dori_bank_admin_dashboard');
      if(error)throw error;
      if(!data)throw new Error('은행 운영 자료가 비어 있습니다.');
      $('adminAccounts').textContent=fmtCoins(data.active_accounts);
      $('adminTodayTransactions').textContent=fmtCoins(data.today_transactions);
      $('adminActiveDeposits').textContent=fmtCoins(data.active_deposits);
      products=data.products||[];
      renderProducts();
      renderTransactions(data.transactions||[]);
    }catch(error){console.error(error);toast(friendly(error),true);}
    finally{if(button)setBusy(button,false,'새로고침 ↻');}
  }
  function renderProducts(){
    const root=$('adminProducts');
    if(!products.length){root.innerHTML='<div class="bank-empty-state">등록된 예금 상품이 없습니다.</div>';return;}
    root.innerHTML=products.map(p=>'<article class="bank-admin-product"><div><strong>'+esc(p.name)+' · 연 '+Number(p.annual_rate_pct).toFixed(2)+'%</strong><small>'+esc(p.id)+'<br>'+esc(p.term_days)+'일 · 최소 '+fmtCoins(p.min_amount)+' D · 최대 '+fmtCoins(p.max_amount)+' D<br>'+esc(p.description)+'<br>상태: '+(p.is_active?'신규 가입 허용':'신규 가입 중지')+'</small></div><div class="bank-admin-product-actions"><button type="button" data-edit-product="'+esc(p.id)+'">편집</button><button type="button" data-toggle-product="'+esc(p.id)+'">'+(p.is_active?'가입 중지':'가입 허용')+'</button></div></article>').join('');
    root.querySelectorAll('[data-edit-product]').forEach(button=>button.addEventListener('click',()=>editProduct(button.dataset.editProduct)));
    root.querySelectorAll('[data-toggle-product]').forEach(button=>button.addEventListener('click',()=>toggleProduct(button.dataset.toggleProduct,button)));
  }
  function editProduct(id){
    const p=products.find(item=>item.id===id);if(!p)return;
    $('productId').value=p.id;$('productId').disabled=true;
    $('productName').value=p.name;$('productTerm').value=p.term_days;$('productRate').value=Number(p.annual_rate_pct).toFixed(2);
    $('productMin').value=p.min_amount;$('productMax').value=p.max_amount;$('productDescription').value=p.description;$('productActive').checked=!!p.is_active;
    $('productFormHeading').textContent='예금 상품 수정';$('saveProductButton').textContent='변경 사항 저장 ↗';
    $('productForm').scrollIntoView({behavior:'smooth',block:'center'});
  }
  function resetForm(){
    $('productForm').reset();$('productId').disabled=false;$('productActive').checked=true;
    $('productId').value='';$('productName').value='';$('productTerm').value='30';$('productRate').value='3.50';
    $('productMin').value='10000';$('productMax').value='9223372036854775807';$('productDescription').value='';
    $('productFormHeading').textContent='새 예금 상품 등록';$('saveProductButton').textContent='상품 저장 ↗';
  }
  async function saveProduct(event){
    event.preventDefault();
    const id=$('productId').value.trim();
    const name=$('productName').value.trim();
    const termDays=Number($('productTerm').value);
    const annualRate=Number($('productRate').value);
    const minAmount=numericText($('productMin').value);
    const maxAmount=numericText($('productMax').value);
    if(!/^[a-z0-9_]{3,40}$/.test(id)){toast('상품 식별자는 영문 소문자·숫자·밑줄 3~40자로 입력해 주세요.',true);return;}
    if(!/^\d+$/.test(minAmount)||!/^\d+$/.test(maxAmount)||BigInt(minAmount)<1n||BigInt(maxAmount)<BigInt(minAmount)){toast('가입 한도 금액을 확인해 주세요.',true);return;}
    const button=$('saveProductButton');setBusy(button,true);
    try{
      const {data,error}=await sb.rpc('dori_bank_admin_save_product',{
        p_id:id,p_name:name,p_term_days:termDays,p_annual_rate_pct:annualRate,
        p_min_amount:minAmount,p_max_amount:maxAmount,p_description:$('productDescription').value.trim(),
        p_is_active:$('productActive').checked
      });
      if(error)throw error;if(!data?.ok)throw new Error('상품 저장 결과를 확인하지 못했습니다.');
      toast('예금 상품이 저장되었습니다. 기존 예금 계약의 약정 조건은 변경되지 않습니다.');
      resetForm();await reload();
    }catch(error){console.error(error);toast(friendly(error),true);}
    finally{setBusy(button,false,$('productId').disabled?'변경 사항 저장 ↗':'상품 저장 ↗');}
  }
  async function toggleProduct(id,button){
    const p=products.find(item=>item.id===id);if(!p)return;
    setBusy(button,true);
    try{
      const {data,error}=await sb.rpc('dori_bank_admin_save_product',{
        p_id:p.id,p_name:p.name,p_term_days:p.term_days,p_annual_rate_pct:Number(p.annual_rate_pct),
        p_min_amount:p.min_amount,p_max_amount:p.max_amount,p_description:p.description,p_is_active:!p.is_active
      });
      if(error)throw error;if(!data?.ok)throw new Error('상품 상태 변경 결과를 확인하지 못했습니다.');
      toast(p.is_active?'상품 신규 가입을 중지했습니다.':'상품 신규 가입을 다시 허용했습니다.');
      await reload();
    }catch(error){console.error(error);toast(friendly(error),true);}
    finally{setBusy(button,false,p.is_active?'가입 중지':'가입 허용');}
  }
  function renderTransactions(rows){
    const root=$('adminTransactions');
    if(!rows.length){root.innerHTML='<div class="bank-empty-state">아직 처리된 은행 거래가 없습니다.</div>';return;}
    root.innerHTML=rows.map(row=>{
      const isCredit=row.direction==='credit';
      return '<article class="bank-admin-transaction"><strong>'+esc(typeLabel(row))+'</strong><span>'+esc(row.account_number)+'</span><span>'+esc(row.counterparty_name||row.counterparty_account||'—')+'</span><strong class="'+(isCredit?'credit':'debit')+'">'+(isCredit?'+':'−')+fmtCoins(row.amount)+' D</strong><span>'+esc(fmtDate(row.created_at))+'</span></article>';
    }).join('');
  }


  // Read-only operations panel for automatic decisions produced inside Supabase.
  let botLoanRows=[],botLoanFilter='all';
  function initBankLoanAdmin(){
    if(document.getElementById('adminLoansSection')||!document.getElementById('adminWorkspace'))return;
    const s=document.createElement('section');s.id='adminLoansSection';s.className='bank-admin-section';
    s.innerHTML='<div class="bank-admin-section-heading"><div><span class="bank-kicker">AUTOMATED CREDIT INTELLIGENCE</span><h2>대출 심사봇 운영 센터</h2><p>모든 신청은 서버에서 자동 분석됩니다. 이 화면은 판정 점수와 근거를 모니터링하며, 수동 승인 버튼은 사용하지 않습니다.</p></div><button id="reloadAdminLoans" class="bank-button bank-button-outline bank-button-small" type="button">분석 기록 새로고침 ↻</button></div><div class="bank-loan-bot-banner"><span class="bank-bot-orb"><i></i><i></i><i></i></span><div class="bank-bot-copy"><strong>돌이 대출 심사봇 <em>ONLINE</em></strong><p>실제 잔액·등급·경험치·계정 이용 기간·상환 이력·신청 목적을 읽고 승인/거절을 자동 결정합니다.</p><small>모든 판정은 설명 가능한 규칙 기반 점수이며, 결정·지급 이력은 서버 감사 로그에 저장됩니다.</small></div><span class="bank-bot-status"><i></i> 자동 판정 활성</span></div><div class="bank-loan-admin-stats" id="adminLoanStats"></div><div class="bank-loan-admin-filters" role="group" aria-label="심사 결과 필터"><button type="button" data-loan-filter="all" class="active">전체 기록</button><button type="button" data-loan-filter="approved">승인</button><button type="button" data-loan-filter="rejected">거절</button></div><div id="adminLoanRows" class="bank-loan-list"><div class="bank-loan-empty">심사 기록을 확인하는 중입니다…</div></div>';
    document.getElementById('adminWorkspace').appendChild(s);
    $('reloadAdminLoans').addEventListener('click',loadBankLoanRequests);
    s.querySelectorAll('[data-loan-filter]').forEach(b=>b.addEventListener('click',()=>{botLoanFilter=b.dataset.loanFilter;s.querySelectorAll('[data-loan-filter]').forEach(x=>x.classList.toggle('active',x===b));renderBankLoanRows()}));
    loadBankLoanRequests();
  }
  async function loadBankLoanRequests(){
    const b=$('reloadAdminLoans');if(b){b.disabled=true;b.textContent='분석 기록 동기화 중…';}
    try{const {data,error}=await sb.rpc('dori_bank_admin_loan_applications');if(error)throw error;botLoanRows=Array.isArray(data)?data:[];renderBankLoanRows()}
    catch(e){console.error(e);if(typeof toast==='function')toast(e.message||'대출 분석 기록을 불러오지 못했습니다.',true)}
    finally{if(b){b.disabled=false;b.textContent='분석 기록 새로고침 ↻';}}
  }
  function renderBankLoanRows(){
    const rows=botLoanRows.filter(l=>botLoanFilter==='all'||(botLoanFilter==='approved'?['active','paid','overdue'].includes(l.status):l.status==='rejected'));
    const approved=botLoanRows.filter(l=>['active','paid','overdue'].includes(l.status)).length,rejected=botLoanRows.filter(l=>l.status==='rejected').length;
    const stats=$('adminLoanStats');if(stats)stats.innerHTML='<article><small>분석한 신청</small><strong>'+botLoanRows.length.toLocaleString('ko-KR')+'</strong><span>전체 이력</span></article><article class="approved"><small>자동 승인</small><strong>'+approved.toLocaleString('ko-KR')+'</strong><span>지급·상환 상태 포함</span></article><article class="rejected"><small>자동 거절</small><strong>'+rejected.toLocaleString('ko-KR')+'</strong><span>지급 없음</span></article>';
    const root=$('adminLoanRows');if(!root)return;if(!rows.length){root.innerHTML='<div class="bank-loan-empty">선택한 필터에 해당하는 심사 기록이 없습니다.</div>';return}
    root.innerHTML=rows.map(l=>{const ok=['active','paid','overdue'].includes(l.status),score=Math.max(0,Math.min(100,Number(l.decision_score||0))),factors=Array.isArray(l.decision_details?.factors)?l.decision_details.factors:[];
      return '<article class="bank-admin-loan bank-admin-loan-animated"><div class="bank-admin-loan-main"><div class="bank-admin-loan-title-row"><strong>'+String(l.account_owner||'사용자').replace(/[&<>"]/g,'')+' · '+String(l.product_name||'대출 상품').replace(/[&<>"]/g,'')+'</strong><span class="bank-loan-status '+(ok?'active':'rejected')+'">'+(ok?'봇 승인':'봇 거절')+'</span></div><div class="bank-admin-loan-meta">계좌 '+String(l.account_number||'—').replace(/[&<>"]/g,'')+' · 신청 '+new Date(l.created_at).toLocaleString('ko-KR')+(l.due_at?' · 만기 '+new Date(l.due_at).toLocaleDateString('ko-KR'):'')+'</div><div class="bank-admin-loan-metrics"><div><small>신청 원금</small><strong>'+Number(l.principal||0).toLocaleString('ko-KR')+' D</strong></div><div><small>연 이율 / 기간</small><strong>'+Number(l.annual_rate_pct||0).toFixed(2)+'% · '+l.term_days+'일</strong></div><div><small>약정 이자</small><strong>'+Number(l.interest_amount||0).toLocaleString('ko-KR')+' D</strong></div><div><small>총 상환 예정액</small><strong>'+Number(l.total_due||0).toLocaleString('ko-KR')+' D</strong></div></div><p class="bank-admin-loan-purpose">신청 목적: '+String(l.purpose||'—').replace(/[&<>"]/g,'')+'</p><div class="bank-loan-decision"><div class="bank-loan-decision-head"><span>심사봇 점수 · 판정 이유</span><strong>'+score+'/100</strong></div><div class="bank-loan-score-track"><i style="width:'+score+'%"></i></div><p>'+String(l.decision_reason||'저장된 판정 사유 없음').replace(/[&<>"]/g,'')+'</p><details><summary>판정 근거 및 점수 항목 ('+factors.length+')</summary><div class="bank-loan-factor-list">'+factors.map(f=>'<div><span>'+String(f.label||'항목').replace(/[&<>"]/g,'')+'</span><strong>+'+Number(f.points||0)+'점</strong><small>'+String(f.note||'').replace(/[&<>"]/g,'')+'</small></div>').join('')+'</div></details></div></div><div class="bank-admin-loan-side"><strong class="'+(ok?'good':'bad')+'">'+(ok?'승인 및 지급 처리':'자동 거절 · 지급 없음')+'</strong><small>봇 판정: '+(l.bot_reviewed_at?new Date(l.bot_reviewed_at).toLocaleString('ko-KR'):'기록 시간 없음')+'</small><small>처리 상태: '+String(l.status||'—')+'</small><small>판정 엔진: '+String(l.decision_source||'bot')+'</small></div></article>'
    }).join('');
  }

  init();
  const loanAdminRoot=document.getElementById('adminWorkspace'); if(loanAdminRoot){const loanAdminObserver=new MutationObserver(()=>{if(!loanAdminRoot.hidden){initBankLoanAdmin();loanAdminObserver.disconnect()}});loanAdminObserver.observe(loanAdminRoot,{attributes:true,attributeFilter:['hidden']});if(!loanAdminRoot.hidden)initBankLoanAdmin();}
})();