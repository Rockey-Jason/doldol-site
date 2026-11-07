# 돌이사이트 플랫폼 종합 점검 기록

- 점검일: 2026-11-08
- 대상 저장소: `Rockey-Jason/doldol-site`, `Rockey-Jason/doldol-site-admin`
- Supabase 프로젝트: `scttowfhygcpdirrekqm` (ACTIVE_HEALTHY, PostgreSQL 17)
- 범위: GitHub 저장소 트리와 주요 공통 모듈, 관리자 SPA, Supabase Advisors 및 읽기 전용 권한 메타데이터
- 주의: 브라우저 실사용 E2E, 전체 기능 회귀, 저사양 모바일/60분 메모리 테스트는 이번 점검에서 실행하지 않음.

## 1. 기존에 이미 존재하는 공통 기능

| 영역 | 현재 저장소에서 확인한 구현 | 남은 과제 |
|---|---|---|
| 통합 알림 | `js/dori-notification-center.js`가 사용자별 알림 조회·읽음 처리·새 알림 수를 제공하고 공통 테마에서 로드됨 | 서비스별 알림 이벤트가 누락 없이 생성되는지 전체 경로 검증 |
| 공통 화면 전환 | `js/doldol-theme.js`가 같은 출처 내부 링크의 전환 효과와 메인 사이트 이동 링크를 처리 | 모든 독립 앱에 공통 셸을 적용할 때 기능 충돌 확인 |
| 테마 | `css/doldol-theme.css` 중심의 남색 UI가 존재 | 각 앱의 고유 UI와 디자인 토큰을 단계적으로 통일 |
| 계정별 클라우드 저장 | `js/dori-cloud-sync.js` 및 `dori_cloud_storage` 테이블 존재 | 해당 스크립트가 메인 페이지 외의 모든 앱에서 로드되는 것은 확인되지 않음. Storage API를 가로채므로 무차별 전역 적용 금지 |
| 프로필/업적 | 메인 화면에 코인·EXP·칭호와 업적/설정 진입점 존재 | 각 앱의 실제 데이터와 표시값을 표본 대조하고 캐시 갱신 일관성 확인 |
| 관리자 SPA | 별도 관리자 저장소에 회원·신문·이슈·AI 학습·경제·랜덤박스·이벤트·통계·로그·보안 화면 존재 | 전체 플랫폼의 읽기 전용 상태 점검 및 운영 진단 화면 보강 |

## 2. 이번 변경 브랜치에 추가한 내용

### 메인 사이트 브랜치: `feat/dori-platform-hub`

- `js/dori-command-center.js`: 서비스 빠른 검색, 즐겨찾기, 최근 방문, Ctrl/Cmd+K 단축키.
- `css/dori-command-center.css`: 반응형 남색·골드 검색 패널, 접근성 포커스, 모션 감소 설정 대응.
- `js/doldol-theme.js`: 공통 셸에서 허브 스크립트와 스타일을 한 번만 로드하도록 연결.

검색 목록은 저장소에 실제 존재하는 페이지 경로를 사용한다. 이 기능은 서비스/페이지 바로가기 검색이며, 데이터베이스 안의 회원·거래·아이템 전체 텍스트 검색을 의미하지 않는다.

### 관리자 브랜치: `feat/platform-health-center`

- 관리자 사이드바에 `사이트 진단` 메뉴 추가.
- 읽기 전용 진단: 브라우저 온라인 상태, Supabase Auth 세션, 서버 관리자 인증, 관리자 전용 DB 조회 가능 여부, sessionStorage 동작.
- Supabase Security/Performance Advisors 및 주요 서비스 바로가기.
- 기존 회원·은행·증권 데이터 변경 RPC는 호출하지 않음.

## 3. Supabase 자동 진단 결과

2026-11-08 점검 당시 Advisor 결과:

| 진단 | 건수/수준 | 해석 |
|---|---:|---|
| RLS enabled, no policy | 15 / INFO | 정책이 없는 테이블. 표본 grant 조회에서 내부 테이블 다수는 postgres/service_role만 권한을 가짐. 이 경우 직접 API 접근을 막는 의도된 패턴일 수 있음 |
| Anonymous SECURITY DEFINER execute | 3 / WARN | 함수별 의도와 본문 검토 필요 |
| Authenticated SECURITY DEFINER execute | 88 / WARN | 관리자 RPC 중 일부는 `admin_is_authorized()` 서버 검사를 포함함. 경고 건수 전체를 취약점 수로 해석하면 안 됨 |
| Leaked password protection | 1 / WARN | Supabase Auth 설정에서 활성화 검토 |
| Unindexed foreign keys | 31 / INFO | 쿼리 패턴과 데이터 크기에 따라 인덱스 필요성 검토 |
| RLS init plan | 28 / WARN | 정책의 `auth.uid()`/JWT 함수 호출을 `(select auth.uid())` 형태로 최적화 검토 |
| Multiple permissive policies | 5 / WARN | 정책 중복과 OR 적용 범위 검토 |
| Duplicate indexes | 8 / WARN | 실제 쿼리 사용 확인 후 중복 제거 검토 |
| Unused indexes | 32 / INFO | 통계 기간 및 유지보수 비용 확인 후 정리 |

### 확인한 함수 본문 표본

- `admin_adjust_coins`, `admin_update_user`는 `admin_is_authorized()`를 호출해 검증된 관리자 세션을 검사함.
- `admin_is_authorized()`는 로그인 사용자, JWT session_id, 만료되지 않은 관리자 인증 세션, `is_admin=true`, 레벨 10 이상을 함께 확인함.
- `dori_notifications_mark_all_read()`는 `auth.uid()`가 없으면 거부하고 현재 사용자 행만 읽음 처리함.
- `submit_news_survey()`는 본문에서 `auth.uid()`를 필수로 검사하고 중복 제출을 막음. 함수 EXECUTE 권한은 authenticated로 한정하는 것이 더 명확함.
- `get_dori_stock_recent_executions()`는 최근 체결 공개 정보 반환용일 수 있으므로 공개 여부를 제품 요구와 대조한 뒤 결정해야 함.
- `audit_dori_stock_order_change()`는 주문 변경 감사용 trigger 함수로 확인됨. 직접 RPC 호출 권한은 제거할 수 있는지 트리거 실행 동작을 포함해 검증 필요.

**중요:** Advisor 경고만을 근거로 88개 함수를 일괄 REVOKE하거나 정책 없는 15개 테이블에 임의 RLS 정책을 만들지 않는다. 은행, 증권, 관리자 및 서비스 계정 기능이 중단될 수 있다.

## 4. 권한 메타데이터 표본 점검

- `admin_login_attempts`, `admin_verification_sessions`, `admin_verification_tokens`, `dori_bank_loans`, `dori_bank_push_subscriptions`, `dori_market_treasury`, `dori_stock_order_events` 등은 표본 grant에서 `postgres`와 `service_role`만 보유.
- `dori_cloud_storage`는 RLS 정책 3개와 authenticated의 SELECT/INSERT/UPDATE grant 확인.
- `dori_notifications`는 RLS 정책 2개 및 authenticated SELECT grant 확인.
- `setting`, `settings`는 RLS가 켜져 있지만 정책이 없고 anon/authenticated 테이블 grant가 존재함. 현재 정책은 행 접근을 차단하지만, 사용처와 grant를 명확히 정리할 필요가 있음.

## 5. 다음 작업과 완료 기준

1. 각 공개 SECURITY DEFINER 함수의 제품 의도, EXECUTE grant, 내부 사용자 검사 확인.
2. `setting` / `settings` 및 권한 없는 RLS 테이블의 실제 사용처와 소유권 정리.
3. Auth leaked password protection 설정 활성화.
4. 중복 정책/인덱스와 FK 인덱스를 실제 쿼리 계획 기준으로 개선.
5. 공통 계정/클라우드 동기화 계약을 정의하고, localStorage 전역 가로채기 대신 앱별 명시적 저장 API로 점진적 전환.
6. 돌이은행 이체 중복 방지, 돌돌증권 주문/체결, 게임 저장, 업적/보상 지급, 알림 생성까지 회귀 테스트.
7. PC·모바일 화면, 네트워크 단절/재연결, 60분 세션 테스트 수행.

## 6. 검증 상태

- 저장소 파일 변경은 별도 기능 브랜치에 작성.
- 운영 Supabase의 권한/데이터는 읽기 전용으로 점검했으며 이번 변경에서 DB 스키마나 거래 데이터를 수정하지 않음.
- 관리자 진단 페이지는 실행 시점에 브라우저에서 검사하도록 구현. 실제 배포 후 관리자 로그인으로 실행 검증이 필요함.
- PR 생성 및 CI 결과를 확인하기 전까지 운영 사이트에 배포 완료라고 간주하지 않음.
