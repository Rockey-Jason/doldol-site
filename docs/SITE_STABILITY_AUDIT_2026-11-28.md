# 돌이사이트 안정성 개선 및 운영 점검 기록 — 2026-11-28

## 범위

기존 기능과 사용자 데이터 계약을 유지하는 선에서 홈 화면의 전달 비용, 계정 동기화 안전성, 배포 전 검증, 운영 Supabase 권한을 점검했습니다. 이 변경은 별도 브랜치 `codex/site-stability-polish-20261128`에서 검토 중이며, main 배포 완료를 의미하지 않습니다.

## 저장소 변경

- `index.html`: 첫 번째 약 91KB 인라인 스타일 블록을 제거하고 `css/home.css?v=20261128-home-css-1`로 분리했습니다. HTML 원문은 약 220.9KB에서 약 130.1KB로 줄었습니다.
- 홈 화면 콘텐츠 이미지 7개에 `loading="lazy"`와 `decoding="async"`를 적용했습니다. 프로필 아바타는 첫 화면 표시를 위해 eager 로딩을 유지합니다.
- `sw.js`: 앱 셸 캐시를 v74로 갱신하고 새 홈 스타일시트를 캐시 목록에 포함했습니다.
- `js/dori-cloud-sync.js`: `localStorage.clear()`가 앱 데이터만 정리하도록 수정하고, 계정 전환 시 이전 계정의 미동기화 데이터 임시 보관·복원, 동기화 세대 검사를 추가했습니다.
- `scripts/dori-cloud-sync.test.mjs`: 앱 데이터 초기화 시 인증 메타데이터 보존, 계정 전환 중 오래된 응답 격리, 계정별 미동기화 데이터 복원을 확인하는 회귀 테스트를 추가했습니다.
- `scripts/site-quality-check.mjs`와 `scripts/validate-runtime-polish.mjs`: 클라우드 동기화 및 홈페이지 자산 전달 검사를 추가했습니다.
- `.github/workflows/deploy-rockey-pages.yml`: Pages 배포 전 런타임 회귀 검사와 SEO 검사도 실행하도록 보강했습니다.

## 운영 Supabase 확인

읽기 전용 스키마/권한 점검과 Advisor 결과를 확인했습니다.

- `dori_cloud_storage`는 RLS가 활성화되어 있으며, `auth.uid()`와 `user_id`를 비교하는 사용자별 SELECT / INSERT / UPDATE 정책이 있습니다.
- 관리자 관련 SECURITY DEFINER 함수들은 확인한 주요 함수에서 검증된 관리자 세션 검사(`admin_is_authorized()`)를 수행했습니다.
- 주식 즉시 체결 함수는 `auth.uid()`를 확인하고 사용자 자신의 잔액·보유량을 기준으로 처리하며, 구형 함수들은 이 검증된 실행 함수로 위임합니다.
- 공개 최근 체결 내역 함수는 종목별 공개 거래 데이터만 반환하고 결과 수를 1~100개로 제한합니다. 현재 저장소의 기존 주석은 공개 시장 통계용으로 의도한 함수라고 설명하므로 공개 읽기 권한을 유지했습니다.
- 구형 `purchase_rock_king_item(text,bigint,text,uuid)` RPC는 호출자가 가격을 전달하고 변경 가능한 Auth 사용자 메타데이터로 로그인 ID를 확인하는 구조였습니다. 저장소 내 호출처와 DB 함수 내부 호출처를 찾지 못해 현재 기능에서 사용하지 않는 레거시로 판단했고, 일반 API 역할(`anon`, `authenticated`, `PUBLIC`)의 EXECUTE를 회수했습니다. 서버 전용 `service_role` 권한은 유지했습니다.
- 위 권한 회수는 운영 Supabase에 적용했고, 사후 조회에서 `anon_execute=false`, `authenticated_execute=false`, `service_role_execute=true`를 확인했습니다. 마이그레이션은 `20261128010624_lock_legacy_rock_king_purchase_rpc.sql`로 저장소에 기록했습니다.

## 남은 운영 점검 및 주의사항

Supabase Advisor에서 다음 항목이 관찰됐습니다.

- Leaked Password Protection 비활성화 경고 1건: Auth 설정 화면에서 운영자가 확인해야 합니다.
- SECURITY DEFINER 관련 경고는 다수지만, 이 경고만으로 취약점을 단정할 수 없습니다. 함수 본문과 실제 역할 권한을 함께 확인해야 합니다. 이번 점검에서는 주요 관리자·거래 함수의 내부 검증을 확인했고, 미사용 레거시 구매 RPC만 차단했습니다.
- 외래 키 인덱스 누락 42건, RLS auth 함수 초기화 계획 29건, 미사용 인덱스 56건, 다중 permissive 정책 11건, 중복 인덱스 8건이 성능 Advisor에 표시됐습니다. 인덱스 추가·삭제나 정책 통합은 쿼리 패턴과 정책 의미를 확인하지 않고 일괄 실행하지 않았습니다.
- RLS가 켜져 있지만 정책이 없는 테이블 19건은 Advisor에서 INFO로 분류됐습니다. 정책이 없으면 기본적으로 접근이 거부되므로, 각 테이블이 실제로 클라이언트 접근을 요구하는지 확인한 후에만 정책을 추가해야 합니다.

## 검증 상태

- 코드 변경은 별도 브랜치에 저장했습니다.
- GitHub Actions의 PR 검사와 Pages 배포는 별도로 확인해야 합니다.
- 실계정으로 PC·모바일 브라우저에서 로그인/로그아웃, 두 계정 전환, 네트워크 오프라인 후 복구, 긴 화면과 모달을 직접 확인하는 테스트는 아직 수행하지 않았습니다.
- 계정 전환 시 임시 백업은 `sessionStorage` 기반이므로 현재 탭 세션 범위입니다. 브라우저 종료 후까지 보장되는 오프라인 데이터 큐는 아닙니다.
- 자동 검사 통과, Pages 배포 성공, Google 검색 색인 완료는 서로 다른 상태입니다.
