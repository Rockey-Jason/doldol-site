# 돌이사이트 (Doldol Site)

돌이사이트는 돌이 세계의 생활 콘텐츠, 금융·산업 화면, 게임, 학습 도구, 뉴스와 커뮤니티를 하나의 웹 공간으로 연결하는 한국어 중심 플랫폼입니다.

- **운영 주소:** https://rockey-jason.github.io/doldol-site/
- **GitHub 저장소:** https://github.com/Rockey-Jason/doldol-site
- **기본 브랜치:** `main`
- **호스팅:** GitHub Pages
- **주요 데이터 계층:** Supabase
- **기본 언어:** 한국어 (`ko-KR`)

## 서비스 영역

| 영역 | 대표 화면 | 목적 |
|---|---|---|
| 돌이 세계와 생활 | Dori Life, 돌이 월드, 도로늄 박물관 | 돌이 세계관과 생활형 콘텐츠 탐색 |
| 금융과 경제 | 돌이은행, 돌돌증권, 돌돌코인 | 계정 기반 가상 경제 콘텐츠 |
| 게임과 산업 | 돌이게임, ROCKEY, 도로늄 공장 | 기존 게임과 산업 시뮬레이션 |
| 학습과 일정 | 로키 스터디, 로키 공유 캘린더 | 학습 도구와 일정 관리 |
| 뉴스와 소통 | 돌이신문, 사용자 의견함 | 소식 확인과 개선 의견 전달 |
| AI와 연구 | 돌이 AI, DORI AI 연구소 | 사이트 내 AI 관련 화면 |

## 프로젝트 구조

| 경로 | 책임 |
|---|---|
| `index.html` | 홈페이지와 주요 서비스 탐색 |
| `*.html`, `dori-world/`, `doronium-factory/` | 기존 서비스 화면 |
| `css/dori-foundation.css` | 공통 글꼴, 색상 토큰, 포커스, 모션, 반응형 기반 |
| `css/doldol-theme.css`, `js/doldol-theme.js` | 사이트 공통 테마와 페이지 전환 |
| `css/home.css` | 홈페이지 전용 레이아웃과 카드 스타일 |
| `js/dori-cloud-sync.js` | Supabase 계정 데이터와 브라우저 캐시 동기화 |
| `js/dori-notification-center.js` | 공유 알림 UI |
| `assets/` | 이미지와 서비스 자산 |
| `supabase/migrations/` | 데이터베이스 변경 이력 |
| `supabase/functions/` | 서버 측 Edge Functions |
| `scripts/` | 정적 품질 검사와 기능 회귀 검사 |
| `.github/workflows/` | CI, 빌드, GitHub Pages 배포 |

## 개발 원칙

- 기본값은 새로운 서비스를 더하는 것보다 **기존 기능의 안정성·접근성·일관성·성능 개선**입니다.
- 운영 URL, 사용자 식별자, 재화 잔액, 보상, 업적, 권한과 DB 계약은 현재 구현을 확인하지 않고 변경하지 않습니다.
- 계정 권한과 경제 관련 변경은 브라우저 UI만으로 보호하지 않습니다. 서버 검증과 RLS 정책을 함께 확인합니다.
- 서비스 워커 캐시 대상 리소스의 URL을 바꾸면 `sw.js`의 캐시 키도 함께 갱신합니다.
- 모든 화면은 PC·모바일, 키보드 포커스, 긴 문구, 로딩·오류·빈 상태를 고려합니다.
- 모션은 `prefers-reduced-motion` 설정을 존중합니다.
- 비밀 키와 사용자 개인정보를 공개 저장소, 브라우저 코드, 테스트 출력에 넣지 않습니다.

## 품질 검사

Node.js 22 환경에서 저장소 루트에서 실행합니다.

~~~bash
node scripts/site-quality-check.mjs
node scripts/validate-home-experience.mjs
node scripts/validate-dori-life.mjs
node scripts/validate-runtime-polish.mjs
node scripts/site-seo-build.mjs --check
~~~

ROCKEY 클라이언트와 서버에는 각각 별도 빌드·테스트가 있습니다. 정확한 명령은 `rockey-client/package.json` 및 `rockey-server/package.json`을 기준으로 합니다.

## 배포 흐름

1. 변경 사항은 별도 브랜치에서 작업합니다.
2. Pull Request에서 품질 검사를 확인합니다.
3. 승인·병합된 `main` 변경은 `.github/workflows/deploy-rockey-pages.yml`의 빌드와 SEO 검사를 거쳐 GitHub Pages에 배포됩니다.
4. GitHub Actions 성공과 실제 운영 화면 확인은 서로 다른 검증입니다. 중요한 변경은 배포 기록과 운영 URL을 따로 확인합니다.

## 먼저 읽을 문서

- `AGENTS.md`: AI 및 자동화 개발 도구 작업 규칙
- `docs/AI_CONTEXT.md`: 제품 범위, 계정·데이터·공통 모듈 개요
- `docs/SITE_ARCHITECTURE.md`: 저장소 구조와 페이지 관계
- `docs/SEO_AND_DISCOVERY.md`: 사이트맵, 검색 메타데이터, 색인 지침
