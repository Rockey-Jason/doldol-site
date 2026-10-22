(() => {
  'use strict';
  const SUPABASE_URL = 'https://scttowfhygcpdirrekqm.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjdHRvd2ZoeWdjcGRpcnJla3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTg0MjYsImV4cCI6MjA5NTc3NDQyNn0.XwdQhJ4Ku_C61yXz0k65AztMF9Rfe7Qzn3Av7iWRBqY';
  const $ = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const formatCoins = value => {
    const raw = String(value ?? '0').replaceAll(',', '').trim();
    if (!/^-?\d+$/.test(raw)) return '—';
    try { return BigInt(raw).toLocaleString('ko-KR'); } catch (_) { return '—'; }
  };
  const cleanInteger = value => String(value ?? '').replaceAll(',', '').replace(/\s/g,'');
  const validInteger = value => /^\d+$/.test(cleanInteger(value)) && BigInt(cleanInteger(value)) > 0n;
  const formatDate = value => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(d);
  };
  const formatShortDate = value => {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'short',day:'numeric'}).format(d);
  };
  const numberOrDash = value => {
    const n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString('ko-KR') : '—';
  };
  const transactionInfo = row => {
    const map = {
      transfer_in:{title:'받은 송금',icon:'↓',kind:'in',subtitle:'돌이 은행 계좌이체'},
      transfer_out:{title:'계좌이체',icon:'↗',kind:'out',subtitle:'돌이 은행 계좌이체'},
      deposit_open:{title:'정기예금 가입',icon:'◈',kind:'out',subtitle:'예금으로 자금 이동'},
      deposit_maturity:{title:'예금 만기 수령',icon:'✦',kind:'maturity',subtitle:'원금 및 약정 이자'}
    };
    return map[row.tx_type] || {title:'계좌 거래',icon:'·',kind:'',subtitle:'돌이 은행'};
  };
  let sb;
  let currentUser = null;
  let dashboard = null;
  let verifiedRecipient = null;
  let selectedProduct = null;
  let historyOffset = 0;
  let pendingTransferRequestId = null;
  let lastTransferRequestPayload = null;
  let transferRequestMayHaveBeenProcessed = false;
  const historyPageSize = 10;
  let historyTotal = 0;
  let toastTimer = null;
  try {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') throw new Error('Supabase 라이브러리를 불러오지 못했습니다.');
    sb = window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
  } catch (error) {
    $('loginGate').hidden = false;
    $('loginGate').querySelector('h2').textContent = '은행 서비스를 준비하지 못했습니다.';
    $('loginGate').querySelector('p').textContent = error.message || '필수 라이브러리를 확인해 주세요.';
    return;
  }
  function toast(message,isError=false) {
    const el=$('bankToast');
    el.textContent=message;
    el.classList.toggle('error',!!isError);
    el.classList.add('show');
    if(toastTimer) clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>el.classList.remove('show'),3800);
  }
  function setBusy(button,busy,readyText) {
    if(!button) return;
    if(busy) { button.dataset.readyText=button.textContent;button.disabled=true;button.textContent='처리 중…'; }
    else { button.disabled=false;button.textContent=readyText || button.dataset.readyText || '완료'; }
  }
  function showGate(title,message) {
    $('bankApp').hidden=true;
    $('loginGate').hidden=false;
    $('loginGate').querySelector('h2').textContent=title;
    $('loginGate').querySelector('p').textContent=message;
  }
  async function init() {
    try {
      const {data,error}=await sb.auth.getSession();
      if(error) throw error;
      currentUser=data?.session?.user || null;
      if(!currentUser) {
        showGate('로그인하고 내 계좌를 확인하세요.','돌이사이트에 로그인한 계정의 잔액과 거래 내역을 안전하게 조회할 수 있어요.');
        return;
      }
      $('loginGate').hidden=true;
      $('bankApp').hidden=false;
      wireEvents();
      await loadAll();
      const {data:adminAllowed,error:adminError}=await sb.rpc('admin_is_authorized');
      if(!adminError && adminAllowed===true) $('adminLink').hidden=false;
    } catch(error) {
      console.error('돌이 은행 초기화 오류:',error);
      showGate('계좌 정보를 불러오지 못했어요.',friendlyError(error));
    }
  }
  function wireEvents() {
    $('refreshButton').addEventListener('click',loadAll);
    $('refreshHistoryButton').addEventListener('click',()=>loadTransactionPage(historyOffset));
    $('recipientAccount').addEventListener('input',()=>{
      verifiedRecipient=null;
      $('recipientStatus').className='bank-recipient-status';
      $('recipientStatus').textContent='계좌번호를 입력한 뒤 받는 분을 확인해 주세요.';
      $('transferSubmit').disabled=true;
    });
    $('recipientAccount').addEventListener('blur',()=>{
      const input=$('recipientAccount');
      input.value=input.value.trim().toUpperCase();
    });
    $('lookupRecipientButton').addEventListener('click',lookupRecipient);
    $('transferForm').addEventListener('submit',submitTransfer);
    $('confirmTransferButton').addEventListener('click',performTransfer);
    $('cancelTransferConfirmButton').addEventListener('click',cancelTransferConfirmation);
    $('closeTransferConfirmDialog').addEventListener('click',cancelTransferConfirmation);
    $('transferConfirmDialog').addEventListener('click',event=>{if(event.target===$('transferConfirmDialog')&&!$('confirmTransferButton').disabled)cancelTransferConfirmation();});
    $('downloadStatementButton').addEventListener('click',downloadStatement);
    $('maxTransferButton').addEventListener('click',()=>{$('transferAmount').value=formatCoins(dashboard?.balance).replaceAll(',','');});
    $('copyAccountButton').addEventListener('click',copyAccount);
    $('copyAccountIcon').addEventListener('click',copyAccount);
    $('historyPrev').addEventListener('click',()=>loadTransactionPage(Math.max(0,historyOffset-historyPageSize)));
    $('historyNext').addEventListener('click',()=>loadTransactionPage(historyOffset+historyPageSize));
    $('depositForm').addEventListener('submit',submitDeposit);
    $('closeDepositDialog').addEventListener('click',closeDepositDialog);
    $('cancelDepositButton').addEventListener('click',closeDepositDialog);
    $('depositDialog').addEventListener('click',event=>{if(event.target===$('depositDialog')) closeDepositDialog();});
    $('depositAmount').addEventListener('input',updateDepositEstimate);
    $('maxDepositButton').addEventListener('click',()=>{$('depositAmount').value=String(dashboard?.balance ?? '0');updateDepositEstimate();});
  }
  function friendlyError(error) {
    const message=String(error?.message||error||'알 수 없는 오류가 발생했습니다.');
    if(/JWT|token|session|auth/i.test(message)) return '로그인 세션을 확인할 수 없습니다. 돌이사이트에서 다시 로그인한 뒤 이용해 주세요.';
    if(/fetch|network|Failed to fetch/i.test(message)) return '서버에 연결하지 못했습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.';
    return message.replace(/^Error:\s*/,'');
  }
  async function loadAll() {
    const refresh=$('refreshButton');
    refresh?.classList.add('is-loading');
    try {
      const {data,error}=await sb.rpc('dori_bank_dashboard');
      if(error) throw error;
      if(!data || !data.account) throw new Error('은행 계좌 정보를 받지 못했습니다.');
      dashboard=data;
      renderDashboard(data);
      await loadTransactionPage(0);
      $('footerUpdated').textContent='마지막 확인 ' + formatDate(new Date().toISOString());
    } catch(error) {
      console.error('돌이 은행 자료 조회 오류:',error);
      toast(friendlyError(error),true);
      if(!dashboard && /계정과 은행 계좌를 안전하게 연결|사용자 정보를 찾을 수 없습니다/.test(error.message||'')) {
        showGate('계좌 연결을 확인해 주세요.',friendlyError(error));
      }
    } finally {
      refresh?.classList.remove('is-loading');
    }
  }
  function renderDashboard(data) {
    const account=data.account;
    $('welcomeName').textContent=account.name || '반가워요';
    $('availableBalance').textContent=formatCoins(data.balance);
    $('transferBalance').textContent=formatCoins(data.balance)+' D';
    $('accountNumber').textContent=account.account_number || '—';
    $('accountName').textContent=account.account_name || '돌이 생활 입출금 계좌';
    $('accountOpened').textContent=formatShortDate(account.created_at);
    $('lockedBalance').textContent=formatCoins(data.deposit_principal_total)+' D';
    renderProducts(data.products || []);
    renderDeposits(data.deposits || []);
  }
  function interestEstimate(amountText,product) {
    const cleaned=cleanInteger(amountText);
    if(!product || !/^\d+$/.test(cleaned) || BigInt(cleaned)<=0n) return 0n;
    const rateBasisPoints=BigInt(Math.round(Number(product.annual_rate_pct)*100));
    return (BigInt(cleaned)*rateBasisPoints*BigInt(product.term_days))/(10000n*365n);
  }
  function renderProducts(products) {
    const root=$('productsGrid');
    if(!products.length) { root.innerHTML='<div class="bank-empty-state">현재 가입할 수 있는 예금 상품이 없습니다.</div>';return; }
    root.innerHTML=products.map((p,index)=>{
      const icon=index===0?'◌':index===1?'◈':'✦';
      const rate=Number(p.annual_rate_pct).toFixed(2);
      const tag=index===0?'FLEXIBLE TERM':index===1?'POPULAR':'PREMIUM';
      return '<article class="bank-product-card"><div class="bank-product-top"><span class="bank-product-icon">'+icon+'</span><span class="bank-product-tag">'+tag+'</span></div>'+
        '<h3>'+escapeHtml(p.name)+'</h3><p class="bank-product-desc">'+escapeHtml(p.description)+'</p>'+
        '<span class="bank-product-rate-label">약정 연 이율</span><div class="bank-product-rate"><strong>'+rate+'</strong><span>% / 연</span></div>'+
        '<div class="bank-product-meta"><span>예치 기간 <strong>'+numberOrDash(p.term_days)+'일</strong></span><span>최소 가입액 <strong>'+formatCoins(p.min_amount)+' D</strong></span></div>'+
        '<button type="button" class="bank-button bank-button-outline" data-deposit-product="'+escapeHtml(p.id)+'">이 상품으로 시작 <span aria-hidden="true">↗</span></button></article>';
    }).join('');
    root.querySelectorAll('[data-deposit-product]').forEach(button=>button.addEventListener('click',()=>{
      const product=products.find(p=>p.id===button.dataset.depositProduct);
      if(product) openDepositDialog(product);
    }));
  }
  function renderDeposits(deposits) {
    const root=$('depositsList');
    if(!deposits.length) { root.innerHTML='<div class="bank-empty-state">아직 가입한 예금이 없습니다. 위의 상품에서 첫 예금을 시작해 보세요.</div>';return; }
    root.innerHTML=deposits.map(d=>{
      const settled=d.status==='matured';
      const available=!!d.is_mature && !settled;
      const status=settled?'<span class="bank-status-chip">수령 완료</span>':available?'<span class="bank-status-chip mature">만기 도래</span>':'<span class="bank-status-chip">예치 중</span>';
      const action=available?'<button type="button" class="bank-button bank-button-gold" data-claim-deposit="'+escapeHtml(d.id)+'">원금 + '+formatCoins(d.interest_amount)+' D 수령</button>':
        settled?'<span class="bank-status-chip mature">정산 완료</span>':'<span class="bank-status-chip">만기 '+escapeHtml(formatShortDate(d.maturity_at))+'</span>';
      return '<article class="bank-deposit-row"><div class="bank-deposit-title"><span class="bank-product-icon">◈</span><div><strong>'+escapeHtml(d.product_name)+'</strong><small>'+escapeHtml(d.term_days)+'일 · 연 '+Number(d.annual_rate_pct).toFixed(2)+'%</small></div></div>'+
        '<div class="bank-deposit-stat"><span>예치 원금</span><strong>'+formatCoins(d.principal)+' D</strong></div>'+
        '<div class="bank-deposit-stat"><span>약정 예상 이자</span><strong class="gold">+'+formatCoins(d.interest_amount)+' D</strong></div>'+
        '<div class="bank-deposit-action">'+action+'</div></article>';
    }).join('');
    root.querySelectorAll('[data-claim-deposit]').forEach(button=>button.addEventListener('click',()=>claimDeposit(button.dataset.claimDeposit,button)));
  }
  async function lookupRecipient() {
    const input=$('recipientAccount');
    const accountNumber=input.value.trim().toUpperCase();
    const button=$('lookupRecipientButton');
    if(!/^DORI-[A-F0-9]{10}$/.test(accountNumber)) {
      setRecipientStatus('계좌번호를 DORI-XXXXXXXXXX 형식으로 입력해 주세요.',true);
      return;
    }
    setBusy(button,true,'계좌 확인');
    try {
      const {data,error}=await sb.rpc('dori_bank_lookup_recipient',{p_account_number:accountNumber});
      if(error) throw error;
      if(!data?.account_number || !data?.recipient_name) throw new Error('받는 계좌 정보를 확인하지 못했습니다.');
      verifiedRecipient={...data,checkedInput:accountNumber};
      setRecipientStatus('받는 분: '+data.recipient_name+' · '+data.account_number+' 계좌가 확인되었습니다.',false,true);
      $('transferSubmit').disabled=false;
    } catch(error) {
      verifiedRecipient=null;
      $('transferSubmit').disabled=true;
      setRecipientStatus(friendlyError(error),true);
    } finally { setBusy(button,false,'계좌 확인'); }
  }
  function setRecipientStatus(message,isError,isSuccess=false) {
    const el=$('recipientStatus');
    el.textContent=message;
    el.className='bank-recipient-status'+(isError?' error':isSuccess?' success':'');
  }
  async function submitTransfer(event) {
    event.preventDefault();
    const recipient=$('recipientAccount').value.trim().toUpperCase();
    const amount=cleanInteger($('transferAmount').value);
    const memo=$('transferMemo').value.trim();
    if(!verifiedRecipient || verifiedRecipient.checkedInput!==recipient) {
      setRecipientStatus('송금 전에 받는 계좌를 다시 확인해 주세요.',true);
      return;
    }
    if(!validInteger(amount)) {toast('송금 금액은 1 이상의 정수로 입력해 주세요.',true);return;}
    if(BigInt(amount)>BigInt(dashboard?.balance || '0')) {toast('사용 가능한 잔액이 부족합니다.',true);return;}
    const payload=JSON.stringify({recipient,amount,memo});
    if(transferRequestMayHaveBeenProcessed && lastTransferRequestPayload && payload!==lastTransferRequestPayload) {
      toast('이전 송금의 처리 결과를 확인해야 합니다. 같은 내용으로 다시 확인해 주세요.',true);
      return;
    }
    if(!pendingTransferRequestId) {
      pendingTransferRequestId=crypto.randomUUID();
      lastTransferRequestPayload=payload;
    }
    $('transferConfirmRecipient').textContent=verifiedRecipient.recipient_name;
    $('transferConfirmAccount').textContent=recipient;
    $('transferConfirmAmount').textContent=formatCoins(amount)+' D';
    $('transferConfirmMemo').textContent=memo||'메모 없음';
    $('transferConfirmDialog').showModal();
  }
  function cancelTransferConfirmation() {
    const dialog=$('transferConfirmDialog');
    if($('confirmTransferButton').disabled) return;
    if(dialog.open) dialog.close();
    // Keep the same id when a prior network attempt may have reached the server.
    if(!transferRequestMayHaveBeenProcessed) {
      pendingTransferRequestId=null;
      lastTransferRequestPayload=null;
    }
  }
  async function performTransfer() {
    const recipient=$('recipientAccount').value.trim().toUpperCase();
    const amount=cleanInteger($('transferAmount').value);
    const memo=$('transferMemo').value.trim();
    const payload=JSON.stringify({recipient,amount,memo});
    if(!verifiedRecipient || verifiedRecipient.checkedInput!==recipient) {
      toast('받는 계좌를 다시 확인해 주세요.',true);
      if($('transferConfirmDialog').open) $('transferConfirmDialog').close();
      return;
    }
    if(!pendingTransferRequestId || !validInteger(amount) || payload!==lastTransferRequestPayload) {
      toast('송금 정보가 변경되었습니다. 내용을 다시 확인해 주세요.',true);
      if($('transferConfirmDialog').open) $('transferConfirmDialog').close();
      pendingTransferRequestId=null;lastTransferRequestPayload=null;transferRequestMayHaveBeenProcessed=false;
      return;
    }
    if(BigInt(amount)>BigInt(dashboard?.balance||'0')) {
      toast('사용 가능한 잔액이 부족합니다.',true);
      return;
    }
    const button=$('confirmTransferButton');
    setBusy(button,true,'송금 처리 중…');
    $('cancelTransferConfirmButton').disabled=true;
    $('closeTransferConfirmDialog').disabled=true;
    try {
      const {data,error}=await sb.rpc('dori_bank_transfer',{
        p_account_number:recipient,p_amount:amount,p_memo:memo,p_request_id:pendingTransferRequestId
      });
      if(error) throw error;
      if(!data?.ok) throw new Error('송금 결과를 확인하지 못했습니다.');
      transferRequestMayHaveBeenProcessed=false;
      pendingTransferRequestId=null;lastTransferRequestPayload=null;
      if($('transferConfirmDialog').open) $('transferConfirmDialog').close();
      $('transferAmount').value='';
      $('transferMemo').value='';
      $('recipientAccount').value='';
      verifiedRecipient=null;
      $('transferSubmit').disabled=true;
      setRecipientStatus('계좌번호를 입력한 뒤 받는 분을 확인해 주세요.');
      toast(formatCoins(data.amount)+' D 송금이 완료되었습니다.');
      await loadAll();
      document.getElementById('transactions').scrollIntoView({behavior:'smooth',block:'start'});
    } catch(error) {
      console.error(error);
      const message=friendlyError(error);
      // Retry with the exact same request id after a transport failure: the server de-duplicates commits.
      transferRequestMayHaveBeenProcessed=/fetch|network|timeout|connection|failed to/i.test(String(error?.message||error));
      if(!transferRequestMayHaveBeenProcessed) {
        // The server returned a definitive failure, so a fresh id can safely retry the same form data.
        pendingTransferRequestId=crypto.randomUUID();
        lastTransferRequestPayload=payload;
      }
      toast(message,true);
    } finally {
      setBusy(button,false,'이 내용으로 송금 ↗');
      $('cancelTransferConfirmButton').disabled=false;
      $('closeTransferConfirmDialog').disabled=false;
    }
  }
  function openDepositDialog(product) {
    selectedProduct=product;
    $('depositDialogTitle').textContent=product.name+' 가입';
    $('depositDialogDescription').textContent=product.term_days+'일 동안 예치하고 만기에 원금과 이자를 받아요.';
    $('depositDialogProduct').innerHTML='<strong>'+escapeHtml(product.name)+' · 연 '+Number(product.annual_rate_pct).toFixed(2)+'%</strong><small>최소 '+formatCoins(product.min_amount)+' D · '+product.term_days+'일 예치 · '+escapeHtml(product.description)+'</small>';
    $('depositAvailableBalance').textContent=formatCoins(dashboard?.balance)+' D';
    $('depositAmount').value='';
    $('depositEstimate').textContent='— D';
    $('depositDialog').showModal();
    setTimeout(()=>$('depositAmount').focus(),80);
  }
  function closeDepositDialog() {
    const dialog=$('depositDialog');
    if(dialog.open) dialog.close();
    selectedProduct=null;
  }
  function updateDepositEstimate() {
    if(!selectedProduct) return;
    const amount=cleanInteger($('depositAmount').value);
    if(!/^\d+$/.test(amount) || BigInt(amount)<=0n) {$('depositEstimate').textContent='— D';return;}
    $('depositEstimate').textContent='+'+formatCoins(interestEstimate(amount,selectedProduct))+' D';
  }
  async function submitDeposit(event) {
    event.preventDefault();
    if(!selectedProduct) return;
    const amount=cleanInteger($('depositAmount').value);
    if(!validInteger(amount)) {toast('예치 금액은 1 이상의 정수로 입력해 주세요.',true);return;}
    const minimum=BigInt(selectedProduct.min_amount),maximum=BigInt(selectedProduct.max_amount);
    if(BigInt(amount)<minimum || BigInt(amount)>maximum) {toast('선택한 상품의 가입 한도를 확인해 주세요.',true);return;}
    if(BigInt(amount)>BigInt(dashboard?.balance||'0')) {toast('사용 가능한 잔액이 부족합니다.',true);return;}
    const button=$('depositSubmitButton');
    setBusy(button,true,'가입 처리 중…');
    try {
      const {data,error}=await sb.rpc('dori_bank_create_deposit',{p_product_id:selectedProduct.id,p_amount:amount});
      if(error) throw error;
      if(!data?.ok) throw new Error('예금 가입 결과를 확인하지 못했습니다.');
      closeDepositDialog();
      toast('정기예금 가입 완료 · 예상 이자 '+formatCoins(data.interest_amount)+' D');
      await loadAll();
      document.getElementById('myDeposits').scrollIntoView({behavior:'smooth',block:'start'});
    } catch(error) {console.error(error);toast(friendlyError(error),true);}
    finally {setBusy(button,false,'예금 가입 확정 ↗');}
  }
  async function claimDeposit(id,button) {
    if(!id) return;
    if(!window.confirm('만기 예금의 원금과 약정 이자를 입출금 잔액으로 받을까요?')) return;
    setBusy(button,true,'수령 처리 중…');
    try {
      const {data,error}=await sb.rpc('dori_bank_claim_deposit',{p_deposit_id:id});
      if(error) throw error;
      if(!data?.ok) throw new Error('예금 수령 결과를 확인하지 못했습니다.');
      toast('예금 만기 수령 완료 · '+formatCoins(data.payout)+' D가 입금되었습니다.');
      await loadAll();
    } catch(error) {console.error(error);toast(friendlyError(error),true);}
    finally {setBusy(button,false,'예금 수령');}
  }
  async function copyAccount() {
    const account=$('accountNumber').textContent.trim();
    if(!account || account==='—' || account==='불러오는 중…') {toast('계좌번호가 아직 준비되지 않았습니다.',true);return;}
    try {await navigator.clipboard.writeText(account);toast('계좌번호를 복사했습니다.');}
    catch(_) {toast('계좌번호: '+account);}
  }
  async function loadTransactionPage(offset) {
    if(!currentUser) return;
    historyOffset=Math.max(0,offset);
    const root=$('transactionsList');
    root.innerHTML='<div class="bank-empty-state"><span class="bank-spinner"></span> 거래 내역을 확인하고 있습니다.</div>';
    $('historyPrev').disabled=true;$('historyNext').disabled=true;
    try {
      const {data,error}=await sb.rpc('dori_bank_transactions_page',{p_limit:historyPageSize,p_offset:historyOffset});
      if(error) throw error;
      const rows=data?.transactions||[];
      historyTotal=Number(data?.total_count||0);
      $('historyTotal').textContent='총 '+numberOrDash(historyTotal)+'건';
      const currentPage=Math.floor(historyOffset/historyPageSize)+1;
      const pageCount=Math.max(1,Math.ceil(historyTotal/historyPageSize));
      $('historyPageLabel').textContent=currentPage+' / '+pageCount+' 페이지';
      $('historyPrev').disabled=historyOffset===0;
      $('historyNext').disabled=!data?.has_more;
      if(!rows.length) {root.innerHTML='<div class="bank-empty-state">아직 거래 내역이 없습니다. 첫 송금이나 예금 거래가 여기에 표시됩니다.</div>';return;}
      root.innerHTML=rows.map(renderTransaction).join('');
    } catch(error) {
      console.error('거래 내역 조회 오류:',error);
      root.innerHTML='<div class="bank-empty-state">거래 내역을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</div>';
      toast(friendlyError(error),true);
    }
  }
  async function downloadStatement() {
    const button=$('downloadStatementButton');
    setBusy(button,true,'내역 준비 중…');
    try {
      const {data:first,error:firstError}=await sb.rpc('dori_bank_transactions_page',{p_limit:50,p_offset:0});
      if(firstError) throw firstError;
      const total=Number(first?.total_count||0);
      if(!Number.isSafeInteger(total)||total<0||total>1000000) {
        throw new Error('내역이 너무 많아 한 번에 내려받을 수 없습니다. 페이지를 나누어 확인해 주세요.');
      }
      const rows=[...(first?.transactions||[])];
      for(let offset=50;offset<total;offset+=50) {
        const {data,error}=await sb.rpc('dori_bank_transactions_page',{p_limit:50,p_offset:offset});
        if(error) throw error;
        rows.push(...(data?.transactions||[]));
      }
      const csvCell=value=>'"'+String(value??'').replace(/[\r\n]+/g,' ').replace(/"/g,'""')+'"';
      const safeText=value=>{
        const s=String(value??'');
        return /^[\s]*[=+@-]/.test(s)?"'"+s:s;
      };
      const header=['거래 일시','거래 유형','입출금','금액(D)','거래 후 잔액(D)','상대방','상대 계좌','메모','거래 번호'];
      const lines=[header,...rows.map(row=>[
        row.created_at,
        transactionInfo(row).title,
        row.direction==='debit'?'출금':'입금',
        row.amount,
        row.balance_after,
        safeText(row.counterparty_name),
        safeText(row.counterparty_account),
        safeText(row.description),
        row.transaction_ref
      ])].map(line=>line.map(csvCell).join(','));
      const blob=new Blob(['\uFEFF'+lines.join('\r\n')],{type:'text/csv;charset=utf-8;'});
      const url=URL.createObjectURL(blob);
      const anchor=document.createElement('a');
      anchor.href=url;
      anchor.download='dori-bank-statement-'+new Date().toISOString().slice(0,10)+'.csv';
      document.body.appendChild(anchor);anchor.click();anchor.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1500);
      toast('거래 내역 '+rows.length.toLocaleString('ko-KR')+'건을 CSV로 내려받았습니다.');
    } catch(error) {
      console.error('거래 내역 다운로드 오류:',error);
      toast(friendlyError(error),true);
    } finally {setBusy(button,false,'CSV 다운로드 ↓');}
  }
  function renderTransaction(row) {
    const info=transactionInfo(row);
    const out=row.direction==='debit';
    const counterparty=row.counterparty_name || (row.tx_type==='deposit_open'||row.tx_type==='deposit_maturity'?'돌이 은행 예금':'돌이 은행');
    const amountPrefix=out?'−':'+';
    const accountHint=row.counterparty_account?row.counterparty_account:'내 예금';
    return '<article class="bank-transaction-row"><div class="bank-transaction-main"><span class="bank-tx-icon '+info.kind+'">'+info.icon+'</span><div><strong>'+info.title+'</strong><small>'+escapeHtml(info.subtitle)+'</small></div></div>'+
      '<div class="bank-tx-counterparty"><span>'+escapeHtml(counterparty)+'</span><small>'+escapeHtml(accountHint)+'</small></div>'+
      '<div class="bank-tx-time"><span>'+escapeHtml(formatDate(row.created_at))+'</span><small>거래 후 잔액 '+formatCoins(row.balance_after)+' D</small></div>'+
      '<div class="bank-tx-amount '+(out?'out':'in')+'">'+amountPrefix+formatCoins(row.amount)+' D<small>'+(out?'출금':'입금')+'</small></div></article>';
  }
  init();
})();