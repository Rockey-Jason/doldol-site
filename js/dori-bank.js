(() => {
  'use strict';
  const SUPABASE_URL = 'https://scttowfhygcpdirrekqm.supabase.co';
  const DORI_PUSH_PUBLIC_KEY = 'BPU3bUhYuN_Qih2Hd-8KRoi-aQV6Pjy1Y9-570zUS-5cbIG15jZbMPAgttpAnjqv-4Apa25j74axPTq9T--hIkc';
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
      deposit_maturity:{title:'예금 만기 수령',icon:'✦',kind:'maturity',subtitle:'원금 및 약정 이자'},
      loan_disbursement:{title:'대출금 입금',icon:'↓',kind:'in',subtitle:'돌이 은행 대출 지급'},
      loan_repayment:{title:'대출 상환',icon:'↗',kind:'out',subtitle:'돌이 은행 대출 상환'}
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
  let pushedTransactionRef = new URLSearchParams(window.location.search).get('transaction');
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
    if($('retryBankLoad')) $('retryBankLoad').hidden=!currentUser;
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
    $('pushNotificationsButton')?.addEventListener('click',toggleBankPushNotifications);
    void refreshPushButtonState();
    $('retryBankLoad')?.addEventListener('click',async()=>{
      const button=$('retryBankLoad');setBusy(button,true,'사용자 정보 다시 확인 중…');
      try {
        const {data,error}=await sb.auth.getSession();if(error)throw error;
        currentUser=data?.session?.user||null;
        if(!currentUser){showGate('로그인하고 내 계좌를 확인하세요.','돌이사이트에 로그인한 뒤 다시 시도해 주세요.');return;}
        $('loginGate').hidden=true;$('bankApp').hidden=false;
        dashboard=null;await loadAll();
        if(dashboard){$('loginGate').hidden=true;$('bankApp').hidden=false;if(typeof loadLoans==='function')await loadLoans();}
      } catch(error) { showGate('사용자 정보를 불러오지 못했어요.',friendlyError(error));$('retryBankLoad').hidden=false; }
      finally {setBusy(button,false,'사용자 정보 다시 불러오기 ↻');}
    });
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
  function setPushButtonState(label, enabled=false, disabled=false) {
    const button=$('pushNotificationsButton');
    if(!button) return;
    const labelNode=button.querySelector('.bank-push-label');
    if(labelNode) labelNode.textContent=label;
    button.title=label;
    button.setAttribute('aria-label',label);
    button.dataset.enabled=enabled?'true':'false';
    button.classList.toggle('is-active',!!enabled);
    button.disabled=!!disabled;
  }
  function pushBase64UrlToBytes(value) {
    const padded=String(value).replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-String(value).length%4)%4);
    const raw=atob(padded);
    return Uint8Array.from(raw,char=>char.charCodeAt(0));
  }
  async function refreshPushButtonState() {
    const button=$('pushNotificationsButton');
    if(!button) return;
    const supported='serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    if(!supported) {setPushButtonState('푸시 미지원',false,true);return;}
    try {
      const registration=await navigator.serviceWorker.getRegistration();
      const subscription=registration ? await registration.pushManager.getSubscription() : null;
      if(subscription) setPushButtonState('알림 끄기',true,false);
      else if(Notification.permission==='denied') setPushButtonState('알림 권한 확인',false,false);
      else setPushButtonState('알림 켜기',false,false);
    } catch(error) {
      console.warn('푸시 알림 상태 확인 실패:',error);
      setPushButtonState('알림 설정',false,false);
    }
  }
  async function toggleBankPushNotifications() {
    const button=$('pushNotificationsButton');
    if(!button) return;
    button.disabled=true;
    button.classList.add('is-loading');
    try {
      if(!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        toast('현재 브라우저는 푸시 알림을 지원하지 않습니다.',true);
        return;
      }

      // Ask permission directly from the click handler before awaiting registration APIs.
      if(Notification.permission!=='granted') {
        if(Notification.permission==='denied') {
          toast('브라우저 설정에서 돌이사이트의 알림 권한을 허용한 뒤 다시 시도해 주세요.',true);
          return;
        }
        const permission=await Notification.requestPermission();
        if(permission!=='granted') {
          toast('알림 권한이 허용되지 않았습니다. 브라우저 알림 설정을 확인해 주세요.',true);
          return;
        }
      }

      const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./'});
      await navigator.serviceWorker.ready;
      let subscription=await registration.pushManager.getSubscription();
      if(subscription) {
        const saved=subscription.toJSON();
        const keys=saved.keys||{};
        const {error:saveError}=await sb.rpc('dori_bank_save_push_subscription',{
          p_endpoint:saved.endpoint,p_p256dh:keys.p256dh,p_auth:keys.auth
        });
        if(saveError) throw saveError;
        const {error:deleteError}=await sb.rpc('dori_bank_delete_push_subscription',{p_endpoint:subscription.endpoint});
        if(deleteError) throw deleteError;
        const unsubscribed=await subscription.unsubscribe();
        if(!unsubscribed) throw new Error('브라우저에서 푸시 구독을 해제하지 못했습니다. 다시 시도해 주세요.');
        toast('돌이 은행 푸시 알림을 껐습니다.');
        return;
      }

      subscription=await registration.pushManager.subscribe({
        userVisibleOnly:true,
        applicationServerKey:pushBase64UrlToBytes(DORI_PUSH_PUBLIC_KEY)
      });
      const saved=subscription.toJSON();
      const keys=saved.keys||{};
      if(!saved.endpoint||!keys.p256dh||!keys.auth) {
        await subscription.unsubscribe();
        throw new Error('브라우저 푸시 구독 정보를 가져오지 못했습니다.');
      }
      const {data,error}=await sb.rpc('dori_bank_save_push_subscription',{
        p_endpoint:saved.endpoint,p_p256dh:keys.p256dh,p_auth:keys.auth
      });
      if(error||!data?.ok) {
        await subscription.unsubscribe();
        throw error||new Error('푸시 알림 설정을 저장하지 못했습니다.');
      }
      toast('푸시 알림이 켜졌어요. 이제 송금을 받으면 알림을 보내 드릴게요.');
    } catch(error) {
      console.error('돌이 은행 푸시 설정 오류:',error);
      toast(friendlyError(error),true);
    } finally {
      button.classList.remove('is-loading');
      await refreshPushButtonState();
    }
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
      if(!dashboard) {
        showGate('사용자 정보를 불러오지 못했어요.',friendlyError(error));
        if($('retryBankLoad')) $('retryBankLoad').hidden=false;
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
    if(pendingTransferRequestId && lastTransferRequestPayload && payload!==lastTransferRequestPayload) {
      if(transferRequestMayHaveBeenProcessed) {
        toast('이전 송금의 처리 결과를 확인해야 합니다. 같은 내용으로 다시 확인해 주세요.',true);
        return;
      }
      pendingTransferRequestId=null;
      lastTransferRequestPayload=null;
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
      highlightPushedTransaction();
    } catch(error) {
      console.error('거래 내역 조회 오류:',error);
      root.innerHTML='<div class="bank-empty-state">거래 내역을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</div>';
      toast(friendlyError(error),true);
    }
  }
  function highlightPushedTransaction() {
    if(!pushedTransactionRef) return;
    const root=$('transactionsList');
    if(!root) return;
    const target=Array.from(root.querySelectorAll('[data-transaction-ref]')).find(row=>row.dataset.transactionRef===pushedTransactionRef);
    if(!target) return;
    target.classList.add('bank-transaction-highlight');
    target.setAttribute('tabindex','-1');
    try {target.focus({preventScroll:true});} catch(_) {}
    const reduceMotion=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'center'});
    const url=new URL(window.location.href);
    url.searchParams.delete('transaction');
    window.history.replaceState({},'',url.pathname+url.search+url.hash);
    pushedTransactionRef=null;
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
    return '<article class="bank-transaction-row" data-transaction-ref="'+escapeHtml(row.transaction_ref||'')+'"><div class="bank-transaction-main"><span class="bank-tx-icon '+info.kind+'">'+info.icon+'</span><div><strong>'+info.title+'</strong><small>'+escapeHtml(info.subtitle)+'</small></div></div>'+
      '<div class="bank-tx-counterparty"><span>'+escapeHtml(counterparty)+'</span><small>'+escapeHtml(accountHint)+'</small></div>'+
      '<div class="bank-tx-time"><span>'+escapeHtml(formatDate(row.created_at))+'</span><small>거래 후 잔액 '+formatCoins(row.balance_after)+' D</small></div>'+
      '<div class="bank-tx-amount '+(out?'out':'in')+'">'+amountPrefix+formatCoins(row.amount)+' D<small>'+(out?'출금':'입금')+'</small></div></article>';
  }
  init();


  // Dori Bank loans: server-side underwriting with transparent, saved decisions.
  function initDoriLoans(){
    if(document.getElementById('loansSection')||!document.getElementById('transactions'))return;
    const s=document.createElement('section');s.className='bank-section';s.id='loansSection';
    s.innerHTML='<div class="bank-section-heading"><div><span class="bank-kicker">BORROW RESPONSIBLY</span><h2>돌이 은행 대출</h2><p>신청 즉시 심사봇이 사용자 정보와 상환 위험을 분석해 승인 또는 거절을 자동 판정합니다.</p></div><div class="bank-section-mark">04 <span>/ LOANS</span></div></div>'+
      '<div class="bank-loan-bot-banner"><span class="bank-bot-orb"><i></i><i></i><i></i></span><div class="bank-bot-copy"><strong>돌이 대출 심사봇 <em>ONLINE</em></strong><p>계정 상태 · 보유 코인 · 활동 등급 · 경험치 · 계정 이용 기간 · 상환 이력 · 대출 목적을 종합 분석합니다.</p><small>외부 유료 API 없이 서버 내부 규칙으로 자동 판정하며 점수와 판정 근거를 기록합니다.</small><div id="loanUserSummary" class="bank-loan-user-summary">사용자 정보를 안전하게 확인하고 있어요…</div></div><span class="bank-bot-status"><i></i> 자동 심사 활성</span></div>'+
      '<div id="loanProducts" class="bank-loan-grid"><div class="bank-loan-empty">대출 상품을 불러오는 중입니다.</div></div>'+
      '<div class="bank-loan-apply"><form id="loanForm" class="bank-panel bank-loan-form" novalidate><span class="bank-kicker">LOAN APPLICATION</span><h3>대출 신청</h3><div id="loanActionStatus" class="bank-loan-action-status" role="status" aria-live="polite">대출 상품과 신청 금액, 목적을 입력한 뒤 심사봇 신청을 눌러 주세요.</div><label class="bank-label" for="loanProduct">대출 상품</label><select id="loanProduct" required></select><label class="bank-label" for="loanAmount">신청 금액 (D)</label><input id="loanAmount" inputmode="numeric" maxlength="22" placeholder="예: 100000" required><label class="bank-label" for="loanPurpose">대출 목적</label><textarea id="loanPurpose" minlength="3" maxlength="160" placeholder="대출이 필요한 이유를 구체적으로 입력해 주세요." required></textarea><button class="bank-button bank-button-gold bank-button-full" id="loanSubmit" type="button"><span class="loan-submit-label">심사봇 자동 심사 신청 ↗</span></button><p class="bank-loan-disclaimer">승인되면 대출금이 즉시 입금됩니다. 거절된 신청은 지급되지 않으며, 사용자에게 점수와 판정 이유를 표시합니다.</p></form><aside class="bank-loan-summary"><span class="bank-kicker">REPAYMENT PREVIEW</span><h3>상환 예정액 미리 보기</h3><div class="bank-loan-summary-row"><span>예상 이자</span><strong id="loanInterest">— D</strong></div><div class="bank-loan-summary-row total"><span>총 상환 예정액</span><strong id="loanTotal">— D</strong></div><div class="bank-loan-summary-row"><span>상환 기간</span><strong id="loanTerm">—</strong></div><p class="bank-loan-disclaimer">단리 기준: 원금 × 연 이율 × 기간 ÷ 365. 이자는 정수 단위로 내림하며 별도 연체료는 없는 가상 경제 시스템입니다.</p></aside></div>'+
      '<div class="bank-section-heading" style="margin-top:34px"><div><span class="bank-kicker">YOUR LOAN PORTFOLIO</span><h2 style="font-size:23px">내 대출 현황</h2><p>봇의 결정, 판정 점수, 사유와 남은 상환액을 투명하게 확인하세요.</p></div><button id="refreshLoans" type="button" class="bank-button bank-button-outline bank-button-small">새로고침 ↻</button></div><div id="myLoans" class="bank-loan-list"><div class="bank-loan-empty">대출 정보를 불러오는 중입니다.</div></div>';
    document.getElementById('transactions').parentNode.insertBefore(s,document.getElementById('transactions'));
    document.getElementById('loanSubmit').addEventListener('click',()=>requestLoan({preventDefault(){}}));
    document.getElementById('loanProduct').addEventListener('change',loanPreview);
    document.getElementById('loanAmount').addEventListener('input',loanPreview);
    document.getElementById('refreshLoans').addEventListener('click',loadLoans);
    loadLoans();
  }
  let loanProducts=[];
  const loanFmt=v=>{try{return BigInt(String(v??'0')).toLocaleString('ko-KR')}catch(_){return '—'}};
  const loanEsc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function loanRate(a,p){return BigInt(a)*BigInt(Math.round(Number(p.annual_rate_pct)*100))*BigInt(p.term_days)/3650000n}
  function loanPreview(){
    const p=loanProducts.find(x=>x.id===document.getElementById('loanProduct')?.value),a=String(document.getElementById('loanAmount')?.value||'').replace(/[\s,]/g,'');
    if(!p||!/^[0-9]+$/.test(a)||BigInt(a)<=0n){document.getElementById('loanInterest').textContent='— D';document.getElementById('loanTotal').textContent='— D';document.getElementById('loanTerm').textContent=p?p.term_days+'일':'—';return}
    const i=loanRate(a,p);document.getElementById('loanInterest').textContent=loanFmt(i)+' D';document.getElementById('loanTotal').textContent=loanFmt(BigInt(a)+i)+' D';document.getElementById('loanTerm').textContent=p.term_days+'일 · 연 '+Number(p.annual_rate_pct).toFixed(2)+'%'
  }
  function setLoanActionStatus(message,isError=false,isBusy=false){const el=document.getElementById('loanActionStatus');if(el){el.textContent=message;el.classList.toggle('error',!!isError);el.classList.toggle('busy',!!isBusy);el.setAttribute('role',isError?'alert':'status')}}
  function loanDecisionMarkup(l){
    const score=Math.max(0,Math.min(100,Number(l.decision_score||0))),factors=Array.isArray(l.decision_details?.factors)?l.decision_details.factors:[];
    return '<div class="bank-loan-decision"><div class="bank-loan-decision-head"><span>심사봇 판정 점수</span><strong>'+score+'/100</strong></div><div class="bank-loan-score-track"><i style="width:'+score+'%"></i></div><p>'+loanEsc(l.decision_reason||'판정 사유를 확인할 수 없습니다.')+'</p><details><summary>자동 심사 근거 자세히 보기</summary><div class="bank-loan-factor-list">'+(factors.length?factors.map(f=>'<div><span>'+loanEsc(f.label)+'</span><strong>+'+Number(f.points||0)+'점</strong><small>'+loanEsc(f.note)+'</small></div>').join(''):'<small>저장된 근거가 없습니다.</small>')+'</div></details></div>'
  }
  async function loadLoans(){
    try{
      const {data,error}=await sb.rpc('dori_bank_loans_dashboard');if(error)throw error;
      if(!data?.user?.name)throw new Error('계정의 사용자 이름을 불러오지 못했습니다. 새로고침하거나 로그인 상태를 확인해 주세요.');
      loanProducts=data.products||[];
      const userSummary=document.getElementById('loanUserSummary');
      if(userSummary)userSummary.textContent=data.user.name+' · Lv.'+Number(data.user.user_level||1)+' · 경험치 '+loanFmt(data.user.exp||0)+' · 돌돌코인 '+loanFmt(data.balance)+' D';
      document.getElementById('loanProducts').innerHTML=loanProducts.map(p=>'<article class="bank-loan-product"><span class="bank-kicker">PERSONAL CREDIT</span><h3>'+loanEsc(p.name)+'</h3><div class="bank-loan-rate">'+Number(p.annual_rate_pct).toFixed(2)+'<small>% / 연</small></div><p>'+loanEsc(p.description)+'</p><div class="bank-loan-meta"><span>'+p.term_days+'일 만기</span><span>'+loanFmt(p.min_amount)+'–'+loanFmt(p.max_amount)+' D</span></div></article>').join('')||'<div class="bank-loan-empty">신청 가능한 대출 상품이 없습니다.</div>';
      document.getElementById('loanProduct').innerHTML=loanProducts.map(p=>'<option value="'+loanEsc(p.id)+'">'+loanEsc(p.name)+' · 연 '+Number(p.annual_rate_pct).toFixed(2)+'%</option>').join('');
      loanPreview();
      const labels={pending:'심사 대기',active:'상환 중',overdue:'기한 초과',paid:'상환 완료',rejected:'심사 거절'},rows=(data.loans||[]).filter(l=>l.status!=='paid');
      document.getElementById('myLoans').innerHTML=rows.length?rows.map(l=>{
        const ok=['active','paid','overdue'].includes(l.status);
        return '<article class="bank-loan-row" data-loan-card="'+loanEsc(l.id)+'"><div class="bank-loan-row-title"><strong>'+loanEsc(l.product_name)+'</strong><span class="bank-loan-status '+loanEsc(l.status)+'">'+(labels[l.status]||l.status)+'</span><small>'+l.term_days+'일 · 연 '+Number(l.annual_rate_pct).toFixed(2)+'% · '+(l.due_at?'만기 '+new Date(l.due_at).toLocaleDateString('ko-KR'):'자동 심사 완료')+'</small>'+loanDecisionMarkup(l)+'</div><div class="bank-loan-stat"><span>대출 원금</span><strong>'+loanFmt(l.principal)+' D</strong></div><div class="bank-loan-stat"><span>약정 이자</span><strong>'+loanFmt(l.interest_amount)+' D</strong></div><div class="bank-loan-stat"><span>남은 상환액</span><strong>'+loanFmt(l.remaining_due)+' D</strong></div><div class="bank-loan-actions">'+(ok&&['active','overdue'].includes(l.status)&&BigInt(l.remaining_due)>0n?'<input data-loan-repay-amount="'+loanEsc(l.id)+'" inputmode="numeric" placeholder="상환 금액"><button type="button" class="bank-button bank-button-gold bank-button-small" data-loan-repay="'+loanEsc(l.id)+'">상환하기</button>':'<span class="bank-loan-status '+(l.status==='rejected'?'rejected':'')+'">'+(l.status==='rejected'?'봇 거절 · 지급 없음':l.status==='paid'?'상환 완료':l.status==='pending'?'심사 대기':'상환 완료')+'</span>')+'</div></article>'
      }).join(''):'<div class="bank-loan-empty">신청하거나 이용 중인 대출이 없습니다.</div>';
      document.querySelectorAll('[data-loan-repay]').forEach(b=>b.addEventListener('click',()=>repayLoan(b.dataset.loanRepay,b)));
    }catch(e){console.error('Dori Bank loan dashboard failed:',e);setLoanActionStatus('대출 정보를 불러오지 못했습니다: '+(e.message||'알 수 없는 오류')+' · 페이지를 새로고침한 뒤 다시 시도해 주세요.',true);if(typeof toast==='function')toast(e.message||'대출 정보를 불러오지 못했습니다.',true)}
  }
  async function requestLoan(e){
    e.preventDefault();
    const p=loanProducts.find(x=>x.id===document.getElementById('loanProduct').value),a=String(document.getElementById('loanAmount').value||'').replace(/[\s,]/g,'');
    if(!p){setLoanActionStatus('대출 상품 정보를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.',true);toast('대출 상품 정보를 불러오지 못했습니다.',true);return}
    if(!/^[0-9]+$/.test(a)||BigInt(a)<BigInt(p.min_amount)||BigInt(a)>BigInt(p.max_amount)){setLoanActionStatus('신청 금액을 확인해 주세요. 선택한 상품의 한도는 '+loanFmt(p.min_amount)+'–'+loanFmt(p.max_amount)+' D입니다.',true);toast('신청 금액이 상품 한도를 벗어났습니다.',true);return}
    const purpose=document.getElementById('loanPurpose').value.trim();if(purpose.length<3){setLoanActionStatus('대출 목적을 3자 이상 입력해 주세요.',true);toast('대출 목적을 3자 이상 입력해 주세요.',true);return}
    const b=document.getElementById('loanSubmit'),label=b.querySelector('.loan-submit-label');b.disabled=true;b.classList.add('is-thinking');if(label)label.textContent='심사봇이 사용자 정보를 분석 중…';setLoanActionStatus('심사봇이 계정 상태, 상환 이력, 신청 목적을 분석하고 있습니다…',false,true);
    try{
      const {data,error}=await sb.rpc('dori_bank_request_loan',{p_product_id:p.id,p_amount:a,p_purpose:purpose});if(error)throw error;
      if(!data?.ok)throw new Error('자동 심사 결과를 확인하지 못했습니다.');
      document.getElementById('loanAmount').value='';document.getElementById('loanPurpose').value='';
      const approved=data.decision==='approved';
      const resultMessage=(approved?'심사봇 승인 · 대출금 지급 완료':'심사봇 거절 · 대출금은 지급되지 않았습니다')+' · '+(data.decision_score||0)+'점 / 100점 · '+data.decision_reason;setLoanActionStatus(resultMessage,!approved);toast(resultMessage,!approved);
      await loadAll();await loadLoans();
    }catch(e){console.error('Dori Bank loan request failed:',e);setLoanActionStatus('심사 요청에 실패했습니다: '+(e.message||'알 수 없는 오류')+' · 로그인 상태와 연결을 확인해 주세요.',true);toast(e.message||'대출 신청에 실패했습니다.',true)}
    finally{b.disabled=false;b.classList.remove('is-thinking');if(label)label.textContent='심사봇 자동 심사 신청 ↗';loanPreview()}
  }
  async function repayLoan(id,b){
    const a=String(document.querySelector('[data-loan-repay-amount="'+CSS.escape(id)+'"]')?.value||'').replace(/[\s,]/g,'');
    if(!/^[0-9]+$/.test(a)||BigInt(a)<=0n){toast('상환 금액을 확인해 주세요.',true);return}
    if(!confirm(loanFmt(a)+' D를 상환할까요? 이 거래는 되돌릴 수 없습니다.'))return;
    b.disabled=true;b.textContent='상환 처리 중…';
    try{const {data,error}=await sb.rpc('dori_bank_repay_loan',{p_loan_id:id,p_amount:a});if(error)throw error;if(!data?.ok)throw new Error('상환 결과를 확인하지 못했습니다.');const fullyPaid=BigInt(String(data.remaining_due??'0'))<=0n;toast(fullyPaid?'대출 상환이 완료되었습니다. 목록에서 정리하고 있어요.':'상환 완료 · 남은 금액 '+loanFmt(data.remaining_due)+' D');if(fullyPaid){const card=document.querySelector('[data-loan-card="'+CSS.escape(id)+'"]');if(card){card.classList.add('is-settling');card.setAttribute('aria-label','상환 완료된 대출을 목록에서 정리하는 중');await new Promise(resolve=>setTimeout(resolve,480));}}await loadAll();await loadLoans()}
    catch(e){toast(e.message||'상환에 실패했습니다.',true)}finally{b.disabled=false;b.textContent='상환하기'}
  }
  const loanApp=document.getElementById('bankApp');
  if(loanApp){const obs=new MutationObserver(()=>{if(!loanApp.hidden){initDoriLoans();obs.disconnect()}});if(!loanApp.hidden)initDoriLoans();else obs.observe(loanApp,{attributes:true,attributeFilter:['hidden']})}

})();
