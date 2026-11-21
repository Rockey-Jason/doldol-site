# 돌이사이트 (Doldol Site)

돌이사이트는 돌이 세계의 뉴스, 가상 경제, 생활 콘텐츠, 학습 콘텐츠와 여러 기존 서비스를 하나의 웹 공간에서 제공하는 정적 웹사이트입니다.

- **저장소:** [Rockey-Jason/doldol-site](https://github.com/Rockey-Jason/doldol-site)
- **운영 주소:** https://rockey-jason.github.io/doldol-site/
- **기본 브랜치:** main
- **호스팅:** GitHub Pages
- **주요 데이터 연동:** Supabase

## 먼저 읽을 문서

1. AGENTS.md — AI 개발 도구가 지켜야 하는 작업 규칙
2. docs/AI_CONTEXT.md — 제품 범위, 화면, 데이터 및 런타임에 대한 AI용 통합 문맥
3. docs/SITE_ARCHITECTURE.md — 디렉터리와 페이지별 역할
4. docs/SEO_AND_DISCOVERY.md — 검색 엔진과 배포 시 SEO 처리

## 주요 구조

| 경로 | 역할 |
|---|---|
| index.html | 사이트 홈, 기본 탐색 및 로그인 상태에 따른 홈 UI |
| *.html, dori-world/, doronium-factory/, rockey/ | 각 기존 페이지 및 별도 화면 |
| css/ | 공통 디자인 토대와 기능별 스타일 |
| js/ | 계정 동기화, 공통 UI, 알림, 업적, 경제 및 설정 모듈 |
| assets/ | 돌이 이미지, 아이템, 프레임 및 생활 이미지 |
| supabase/ | DB 마이그레이션과 Edge Functions |
| scripts/ | 품질 검사와 페이지 검증 스크립트 |
| .github/workflows/ | 품질 검사와 GitHub Pages 배포 자동화 |

## 품질 검사

Node.js 22 환경에서 다음 명령을 실행합니다.

~~~bash
node scripts/site-quality-check.mjs
node scripts/validate-dori-life.mjs
node scripts/validate-runtime-polish.mjs
node scripts/site-seo-build.mjs --check
~~~

ROCKEY 전용 클라이언트와 서버의 별도 검사 명령은 각 하위 디렉터리의 package.json을 기준으로 합니다. 루트 package.json은 전체 사이트 프런트엔드 빌드 도구가 아니라 저장소 내 자동화 작업의 의존성을 정의합니다.

## 배포

main에 반영된 변경은 .github/workflows/deploy-rockey-pages.yml의 GitHub Actions 흐름으로 검사·조립된 뒤 GitHub Pages에 배포됩니다. 게시 직전에 scripts/site-seo-build.mjs가 사이트맵에 등록된 공개 페이지의 검색 메타데이터를 정규화합니다.

실제 배포 성공 여부는 GitHub Actions 실행 결과와 운영 URL을 확인한 후에만 성공으로 판단합니다.

## 변경 원칙

- 기본값은 **새 기능 추가가 아닌 기존 기능의 안정화와 완성도 개선**입니다.
- 기존 URL, 사용자 데이터, Supabase 계약, 권한 판정 및 저장 형식을 임의로 변경하지 않습니다.
- 화면 하나를 수정할 때 공통 디자인과 PC·모바일 레이아웃을 함께 확인합니다.
- 서비스 워커의 캐시 대상이나 정적 리소스를 변경하면 캐시 버전과 오프라인 동작을 검토합니다.
- 비밀 키·토큰·사용자 개인정보를 소스 코드, 로그, 문서에 기록하지 않습니다.
