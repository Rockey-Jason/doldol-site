# Doldol Site — AI Context

이 문서는 새 AI 또는 새 개발 세션이 저장소를 처음 읽을 때 제품과 구현을 빠르게 이해하도록 작성한 기준 문서입니다. 설명은 저장소 구조를 기반으로 하며, 개별 기능의 현재 세부 동작은 반드시 실제 코드를 함께 확인해야 합니다.

## 1. 제품 정체성

- 표시 이름: **돌이사이트**
- 저장소: Rockey-Jason/doldol-site
- 공개 주소: https://rockey-jason.github.io/doldol-site/
- 기본 브랜치: main
- 게시 방식: GitHub Pages 정적 사이트
- 외부 데이터 계층: Supabase
- 기본 언어: 한국어(ko / ko-KR)

돌이사이트는 여러 기존 콘텐츠와 서비스 화면을 한 저장소에서 제공하는 개인 프로젝트 웹사이트입니다. 각각의 HTML 페이지가 독립적인 화면으로 작동하며 공통 CSS/JS, 계정 데이터, 사이트 자산을 재사용합니다.

## 2. 기능 영역 및 실제 진입 파일

| 영역 | 대표 경로 | 역할 |
|---|---|---|
| 홈 및 탐색 | index.html | 사이트 홈, 기존 페이지 진입, 계정 요약 |
| 계정 | login.html, signin.html, reset-password.html | 로그인·가입·비밀번호 재설정 |
| 개인 설정 | settings.html, fixingsettings.html | 개인 환경 및 세부 설정 |
| 은행 | dori-bank.html, dori-bank-admin.html | 돌이은행 사용자 화면과 관리자 화면 |
| 증권·코인 | doldolstock.html, doldolcoin.html, doldolcoinmart.html | 가상 주식시장, 코인 안내와 상점 |
| 신문 | rockeynews.html, readingrockeynews.html, send-news.js | 뉴스 목록·읽기·발행 자동화 |
| 생활 | dori-life.html, assets/dori-life/ | Dori Life 화면과 캐릭터 자산 |
| 패스·보상 | dori-pass.html, daily-missions.html, Randombox.html, js/achievements.js | 기존 패스·미션·보상·업적 흐름 |
| 세계 지도 | dori-world/index.html, dori-world/kingdom.html, dori-world/vip-lounge.html | 기존 세계 지도·왕국·라운지 화면 |
| 박물관 | doronium-museum.html | 도로늄 관련 콘텐츠 아카이브 |
| AI 화면 | dori-ai.html, dori-ai-lab.html | 사이트 내 AI 관련 화면 |
| 의견·문제 신고 | dori-feedback.html, dori-issues.html | 사용자 피드백 및 문제 관리 화면 |
| 공통 리소스 | css/, js/, assets/ | 페이지 간 공유 UI·상호작용·이미지 자산 |

게임이나 별도 대형 화면의 존재는 저장소 구조를 이해하기 위한 정보입니다. 사이트 전반 유지보수 요청에서 해당 화면의 게임 로직을 새로 만들거나 변경하라는 뜻은 아닙니다.

| 학습 도구 | rockey-study.html, rockey-study-formula.html | 12개 학년의 핵심 수학 공식 학습, 암기 퀘스트, 구구단 배틀, 보스 챌린지 |

## 3. 런타임과 코드 구성

### 정적 페이지

대부분의 서비스 화면은 HTML, CSS, JavaScript로 구성되어 GitHub Pages에서 직접 제공됩니다. 루트에 있는 package.json을 전체 사이트의 프런트엔드 빌드 설정으로 오해하지 마세요. 각 하위 프로젝트는 자체 package.json과 빌드 설정을 가질 수 있습니다.

### 공유 UI

- css/dori-foundation.css: 글꼴, 기본 색상 토큰, 접근성 포커스, 공통 모션, 반응형 기본 규칙
- css/doldol-theme.css: 사이트 공통 테마 및 공유 내비게이션 스타일
- js/doldol-theme.js: 공유 테마·전환 동작
- js/hancom-weight-normalizer.js: 한컴말랑말랑 글꼴이 적용된 요소의 굵기를 정규화
- js/dori-profile-frame.js, css/dori-profile-frame.css: 프로필 프레임의 공유 렌더링 계층
- js/dori-cloud-sync.js: 로그인 세션과 사용자 데이터의 클라우드 동기화
- js/dori-notification-center.js: 공통 알림 UI
- js/dori-sound.js: 기존 사이트 사운드 동작

페이지에 공유 리소스를 추가하기 전에 그 페이지가 이미 로드하는지와 sw.js의 보정 로직을 확인합니다.

### 데이터와 권한

- Supabase 관련 구현은 supabase/ 및 js/dori-cloud-sync.js에서 시작해 실제 호출 경로를 추적합니다.
- DB 컬럼, 테이블, RPC, Edge Function, RLS 정책은 최신 마이그레이션과 배포된 구현을 기준으로 확인합니다.
- 클라이언트에서 버튼을 숨기는 것만으로 관리자 기능이나 경제 동작이 보호되었다고 판단하지 않습니다.
- 보상 지급, 계정 권한, 잔액 변경은 현재 서버 검증과 정책을 확인한 뒤 수정해야 합니다.
- API 키, 서비스 역할 키, OAuth 토큰, 사용자별 데이터는 문서나 클라이언트 코드에 기록하지 않습니다.

## 4. 서비스 워커와 캐시

sw.js는 앱 셸 캐시와 활성화 시 이전 캐시 정리를 관리합니다. 페이지 이동 요청에서는 HTML을 확인해 공유 CSS 또는 클라우드 동기화 스크립트가 빠진 경우 보완하는 로직도 포함합니다.

리소스를 추가·삭제·이름 변경할 때는 다음을 확인합니다.

1. HTML과 서비스 워커의 리소스 경로가 일치하는가?
2. 이미 HTML에서 불러오는 리소스를 다시 주입하지 않는가?
3. 새 리소스의 URL이 실제로 존재하는가?
4. 캐시 이름을 갱신해야 하는가?
5. 구버전 캐시를 정리해도 저장 데이터에 영향이 없는가?

브라우저 캐시 이름 변경은 서비스 워커 캐시만을 대상으로 해야 합니다. 계정 데이터, 로컬 저장 데이터 또는 Supabase 데이터를 임의로 삭제해서는 안 됩니다.

## 5. 디자인 기준

- 기본 배경 계열은 딥 네이비이며 은행처럼 별도 브랜드 화면은 해당 화면의 기존 네이비·골드 콘셉트를 유지합니다.
- 전역 글꼴은 HancomMalrangmalrang의 Regular(400)를 기준으로 합니다.
- 컴포넌트의 굵기만으로 계층을 표현하지 말고 크기·간격·색상·배치·레이블을 함께 활용합니다.
- PC와 모바일에서 동일한 정보 구조와 읽기 순서를 유지합니다.
- 카드, 모달, 테이블, 긴 문구, 스크롤 영역은 화면 밖으로 잘리지 않도록 검증합니다.
- 애니메이션은 자연스럽고 목적이 있어야 하며 prefers-reduced-motion 설정을 존중합니다.

## 6. 검사와 배포

주요 자동 검사:

- scripts/site-quality-check.mjs: HTML 내 인라인 JS 문법, 로컬 자산 경로, 정적 파일, JSON 및 일부 구조적 불변 조건
- scripts/validate-dori-life.mjs: Dori Life 동작·애니메이션 관련 검증
- scripts/validate-runtime-polish.mjs: 공통 프레임, 숨김 탭 애니메이션 수명주기 등 회귀 검증
- scripts/site-seo-build.mjs: 사이트맵에 등록된 공개 페이지의 SEO 메타데이터와 비공개 화면의 noindex 규칙 검증·게시용 정규화

주요 workflow:

- .github/workflows/site-quality.yml: push / pull request / 수동 실행 품질 검사
- .github/workflows/deploy-rockey-pages.yml: 메인 브랜치 push / 수동 실행 후 ROCKEY 클라이언트 빌드, 사이트 검사, GitHub Pages 조립 및 배포

검사 성공, Pages 배포 성공, Google 색인 완료는 서로 다른 상태입니다. GitHub Actions가 성공해도 Google 검색 결과 노출을 보장하지 않습니다.

## 7. 안전한 수정 순서

1. 관련 HTML에서 진입점과 로딩 순서를 확인합니다.
2. 호출하는 JS 모듈, 공유 CSS, Supabase 호출, 서비스 워커를 추적합니다.
3. 기존 데이터 계약과 권한 검증을 보존합니다.
4. 가능하면 공유 구현을 수정하고 중복 구현을 늘리지 않습니다.
5. 정적 검사와 기능별 회귀 검사를 실행합니다.
6. GitHub Actions의 실제 빌드·배포 결론을 확인합니다.
7. 확인하지 못한 모바일·실계정·실기기 동작은 검증 완료라고 쓰지 않습니다.
