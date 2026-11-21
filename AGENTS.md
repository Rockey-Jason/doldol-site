# AI Agent Instructions — Doldol Site

이 저장소를 수정하는 모든 AI 에이전트는 작업 전에 다음 문서를 읽습니다.

- README.md
- docs/AI_CONTEXT.md
- docs/SITE_ARCHITECTURE.md
- SEO·색인 작업이면 docs/SEO_AND_DISCOVERY.md

## Product rules

1. 사용자가 명시적으로 요청하지 않는 한 새로운 기능, 게임, 별도 서비스 또는 중복 시스템을 추가하지 않습니다.
2. 사이트 유지보수 요청은 기존 기능의 버그 수정, 완성도, 일관성, 접근성, 성능, 검색 가능성 및 문서화에 한정합니다.
3. 사용자 데이터, 계정 식별자, 경제 잔액, 보상, 업적, 권한, Supabase 스키마와 기존 URL을 추측으로 변경하지 않습니다.
4. UI를 수정할 때 PC·모바일·긴 텍스트·로딩·오류·빈 상태를 고려합니다.
5. 기존 공유 모듈을 우선 사용하고, 페이지별로 공통 동작을 복제하지 않습니다.
6. 서버 권한이 필요한 동작을 브라우저 UI 표시나 클라이언트 상태만으로 보호했다고 간주하지 않습니다.
7. 비밀 정보는 커밋, 브라우저 코드, 문서, 테스트 출력에 넣지 않습니다.

## Required workflow

1. 현재 구현과 호출 관계를 먼저 읽고 수정 범위를 정합니다.
2. 기존 품질 검사를 실행하거나 CI 결과를 확인합니다.
3. 작고 검증 가능한 변경으로 수정합니다.
4. 아래의 저장소 검사와 관련 기능별 검사를 실행합니다.
5. sw.js 또는 캐시 대상 리소스를 변경하면 캐시 무효화와 새 버전 전환을 검증합니다.
6. GitHub Actions 배포 실행과 결과를 확인합니다. 실행 중이거나 실패한 상태를 배포 성공이라고 보고하지 않습니다.
7. 완료 보고에는 실제 변경 파일, 실행한 검사, 배포 실행 결과, 남은 수동 작업을 구분해서 적습니다.

## Quality commands

~~~bash
node scripts/site-quality-check.mjs
node scripts/validate-dori-life.mjs
node scripts/validate-runtime-polish.mjs
node scripts/site-seo-build.mjs --check
~~~

ROCKEY 클라이언트·서버 테스트는 해당 디렉터리의 package.json 및 CI workflow를 따릅니다. 기능을 수정하지 않는 일반 사이트 유지보수에서는 관련 없는 게임 로직을 변경하지 않습니다.

## Architecture invariants

- 정적 공개 사이트의 운영 기본 주소는 https://rockey-jason.github.io/doldol-site/ 입니다.
- GitHub Pages는 main 브랜치의 배포 workflow를 통해 게시합니다.
- css/dori-foundation.css, css/doldol-theme.css, js/doldol-theme.js는 공유 UI 계층입니다.
- js/dori-cloud-sync.js는 Supabase 기반 계정 데이터 동기화의 핵심 경로입니다. 이를 수정하기 전 연결된 페이지와 인증 이벤트를 함께 확인합니다.
- sw.js는 앱 셸 캐싱과 페이지 이동 시 공통 리소스 보정 동작을 담당합니다. 같은 리소스를 HTML과 서비스 워커가 중복 주입하지 않도록 합니다.
- DB 구조와 권한 정책은 supabase/migrations/ 및 Edge Functions의 현재 구현을 기준으로 판단합니다. 예전 문서나 대화의 필드 이름을 최신 스키마로 간주하지 않습니다.
