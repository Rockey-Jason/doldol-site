# DORONUM FACTORY — v4.5.0 사양 차이 및 완료 게이트

- 점검일: 2026-11-03
- 기준: 저장소의 `도로늄 공장을 만드는 법.md` v4.5.0
- 대상: 기존 GitHub Pages / Three.js 브라우저 게임
- 적용 결정: 기존 웹 게임 유지(A안). Unity 전용 구현물은 웹 런타임 모듈, Canvas/DOM UI, Playwright 검증으로 대응한다.
- 상태 의미: **Implemented** = 해당 Gate 증거까지 통과, **Partial** = 일부 구현/연결 또는 테스트 미완료, **Missing** = 주요 기능 없음, **Conflict** = 정식 수치·데이터와 현재 구현이 상충, **Not Verifiable** = 실행 환경/실물 기기 등으로 확인할 수 없음.
- 중요: 함수·화면이 존재하는 것만으로 Gate 통과로 간주하지 않는다. 이 표의 상태는 전체 구현 완결 여부 기준이다.

## Phase별 현황

| Phase | 상태 | 저장소 근거 | 현재 동작 | 남은 Gate / 주의 |
|---|---|---|---|---|
| 0 프로젝트 감사 | Partial | `Docs/PROJECT_AUDIT.md`, 본 문서, `SAVE_COMPATIBILITY_REPORT.md` | 기존 파일·저장 키·월드·CI를 조사했고 Unity/웹 차이를 기록 | 실제 Android/iOS 기기, 장시간 실제 실행, 전체 사용자 세이브 표본은 확인하지 못함 |
| 1 Core Runtime / 데이터 | Partial | `simulation-core.js`, `game-data-validation.js`, `failure-runtime.js` | 0.1초 상수, 18개 Stage trace, stack ID/예약/검증, 연구 그래프 검증, 저장 가능한 RNG/실패 이벤트 구조 | 모든 Stage의 별도 권위 처리기, 도메인 이벤트/RewardClaimID 전역 적용, Stack 소유권·provenance 완전 구현 미완 |
| 2 플레이어·카메라·입력 | Partial | `factory.js`, `world3d.js`, `e2e/factory-smoke.mjs` | 1·3인칭/전략 시점, 프레임 기반 이동, 키보드/터치 HUD, 생존·채집 상호작용 | 실제 장치 입력/카메라 충돌·안전 복구 지점·게임패드 전체 검증 미완 |
| 3 월드·자원·채굴 | Conflict | `terrain-system.js`, `world3d.js`, `factory.js` | 두 대륙 192×160 타일, 8 바이옴, 높낮이 지형, 5층 지하 광산, Seed 기반 생성, 현재 정적 광산 데이터에 자연 도로늄 광맥 없음 | 사양의 2048m×2048m와 현재 타일 월드 실제 범위/좌표 체계가 다름. 기존 세이브/건물 무손실 월드 스케일 변환 정책 필요 |
| 4 인벤토리·아이템·제작 트랜잭션 | Partial | `simulation-core.js`, `factory.js` | ItemStack 단위 수량/품질/순도/synthetic, 5000 상한, split/merge, 예약, 다중 재료 원자 소비, 중복 예약 차단 | owner-domain, NeverSplit/NeverMerge, 전역 ID 충돌 방지, 컨베이어/창고/배송의 모든 소유권 이전 원자성 미완 |
| 5 기계·생산 | Partial | `production-runtime.js`, `factory.js`, `failure-runtime.js` | 전력 gate, ramp 온도/압력, 안전범위, wear, completion buffer 1개, 결정론적 hazard 계산기 | 실제 MachineData 기반 FailureProfile·등급별 결과가 미등록이므로 게임 내 고장 롤/자원 손실/잔류물 적용은 비활성. 정비 레시피/재개 경계 미완 |
| 6 전력·물류·유체·저장 | Partial | `factory.js`, `simulation-core.js` | 단순 전력 총량, 벨트 인접 이동, 창고·시장·기계 출력 전달, 로컬 저장 백업 | NetworkID·배터리/변압기 그래프, Sorter/Splitter/Merger/루프 교착, 별도 Fluid graph·탱크·밸브·예약·오염 미구현 |
| 7 연구·스킬 | Partial | `factory.js`, `skill-runtime.js`, `skill-runtime.test.mjs` | 18 연구 노드와 선행 DAG, 5 분야·20 스킬 노드, 고유 마일스톤 ClaimID, 총 15포인트 상한, 선행 조건·중복 구매 검증 | 스킬의 모든 효과가 실제 서브시스템에 연결된 것은 아님. 현재 스캐너 거리·채굴 속도·창고/버퍼 자금비 일부만 적용. 나머지 효과는 해당 시스템 구현 후 연결 필요 |
| 8 건설·공장 상호작용 | Partial | `factory.js`, `terrain-system.js`, `world3d.js` | 평탄화/기초, 배치 비용·연구/지형 조건, 적응형 컨베이어, 시설 철거 | 포트 연결 미리보기, Blueprint, 멀티타일 footprint·건설 트랜잭션/환불 중복 검증 미완 |
| 9 경제·포장·배송 | Partial | `factory.js` | 수동/자동 시장 판매, 생산 통계, 미션 자금 보상 | 계약/포장 단계, 배송 상태, Stack 제출 중복 차단, route risk, 운송 보험·배송 ledger 미구현 |
| 10 도로늄 생산 체계 | Conflict | `factory.js`, `world3d.js`, `game-data-validation.js` | 기존 게임의 15개 변형 ID·모델·레시피, 품질/순도/synthetic 메타데이터 및 일부 synthetic 입력 차단 | 현재 ID 집합(`doronium_normal/blue/red/iron/orange/thermal/cold/black/clear/special/limited/crystal/resonant/prismatic/void`)이 B9의 정식 ID 집합(`ITEM_DORONUM_NORMAL/YELLOW/ULTRA/BLUE/RED/IRON/ORANGE/SLIGHTLY_RUSTED/RUSTED/TRANSLUCENT/THERMAL_CRYSTAL/COLD_CRYSTAL/BLACK/SPECIAL_EDITION/LIMITED_EDITION`)과 일치하지 않음. 외형/alias로 대체하지 말고 버전 migration + canonical model/recipe/metadata + 획득 경로를 먼저 완료해야 함. 자연 도로늄 광맥은 생성하지 않음 |
| 11 스토리·ORBIT·퀘스트 | Partial | `factory.js`, `index.html` | 10개 메인 퀘스트, 5개 chapter label, 보상/대사/인트로/다음 임무 표시 | 사양의 Chapter 1–8/Act I–VI와 현재 5개 chapter 모델 대응 불완전. Lore Archive, 이벤트 기반 StoryRuntime, 컷신 skip/보상 ClaimID 전면 적용 미완 |
| 12 Infinity Fusion / 엔딩 | Conflict | `factory.js`, `production-runtime.js`, `simulation-core.js` | 현재 변형 15종을 각 100개 요구하고 aggregate Quality/Purity/Synthetic 메타데이터를 사전 검사, 7단계 260초 표시, 출력 1개, Relay 3+Core+Planet 엔딩 조건 | B9/REQ-INFINITY의 정확한 15개 canonical ID가 현재 변형 ID와 다르며 각 Stack별 자격/manifest checksum 검사가 아님. 시작 시 `takeItem()`으로 15종 재료를 즉시 소비하고 active-job custody/rollback/recovery를 하지 않음. Stage power는 canonical 0.5–5.0MW와 불일치. FusionFailureProfile의 input outcome 및 resumable reservation/CompletionBuffer도 미완 |
| 13 UI·아트·애니메이션·오디오·접근성 | Partial | `index.html`, `factory.css`, `world3d.js`, `factory.js` | Three.js 환경/기계/결정, 모바일 HUD, 모션 감소 설정, 이벤트 Tone | 40개 챕터별 음악 자산/믹싱, 전체 UI 키보드 포커스·스크린리더, 실제 고장/성공 애니메이션과 효과음 트리거 미완 |
| 14 성능·안정성·출시 | Partial | `.github/workflows/doronium-factory-validation.yml`, `e2e/factory-smoke.mjs` | Node 정적 검사/단위 테스트, Playwright WebGL/모바일 에뮬레이션, 가상 1시간(36,000 fixed tick) 회귀, Three.js 청크/인스턴싱/적응형 품질 | CI/Pages 결과는 실제 실행 후 기록. 가상 1시간은 벽시계 60분 soak가 아님. 실제 모바일/저사양 PC/장시간 메모리 누수 테스트 미완 |

## 중요 사양 충돌과 안전 결정

1. **엔진** — 사용자가 웹게임 유지(A안)를 선택했다. Unity 프로젝트/씬/프리팹/빌드는 이번 구현 대상이 아니다. 해당 Gate는 브라우저 동등물로만 평가한다.
2. **월드 크기** — 기존 월드 192×160 타일을 유지한다. 2048m×2048m로 무작정 바꾸면 기존 좌표, 건물, 지형, 세이브 호환성을 깨므로 버전이 있는 좌표 migration과 검증 없이 변경하지 않는다.
3. **월드 광물** — 현재 `makeMineDeposits()` 정적 목록은 stone/copper/iron/coal/quartz/gold/diamond 계열이며 도로늄 Deposit ID는 없다. README에 남아 있던 “4·5층 자연 도로늄” 표현은 코드와 맞지 않아 정정한다.
4. **Canonical Doronum IDs** — 현재 기존 게임의 15개 변형 ID는 명세 B9의 15개 정식 ITEM_DORONUM ID와 다르다. 외형·표시 이름·alias로 Infinity 입력을 승인하지 않는다. ID migration과 정식 Recipe/Presentation/Physical profile 정합 전까지 Phase 10/12는 Conflict다.
5. **Failure** — 위험 수식·RNG·event journal은 기반 코드다. 사양에서 요구한 실제 기계별 등급 분포 및 결과 데이터가 정의/검증되기 전까지 게임에서 무작위로 자원 손실을 일으키지 않는다.
6. **Infinity 전력** — 사양 수치와 현재 전력 경제가 다르다. 단위와 발전기 용량을 일괄 수정하면 게임 전력 경제가 망가질 수 있으므로 Conflict로 표시하고 임의 변환하지 않는다.
7. **보상** — 스킬 포인트는 시작 1 + 연구 Tier 1–7 각 1 + 기존 chapter 1–4 각 1 + 고유 탐험 마일스톤 3으로 합계 15를 상한으로 한다. 반복 생산/채굴은 포인트를 지급하지 않는다.

## CI에서 요구할 최소 Gate

- 18 canonical tick trace와 0.1초 고정 간격
- Stack split/merge/reservation/atomic rollback 및 runtime validation
- 게임 데이터 참조/연구 DAG 검증
- 기계 전력/환경/wear/completion buffer 테스트
- failure hazard/RNG/이벤트 journal 테스트(실제 프로필 연결 여부 별도)
- 20 skill node DAG, milestone idempotency, point cap, prerequisites
- 저장 envelope checksum, future schema reject, 3개 백업 회전, 손상 복구, legacy save decode
- Playwright: WebGL, 15개 결정, 모바일 입력, 스킬 UI 확인, 생존 버튼, 채굴/건설, 가상 1시간 회귀
- 배포는 Pages workflow의 성공 결과를 별도로 확인한다.

**완료 선언 기준:** 위 Phase 중 Partial/Conflict/Missing이 하나라도 남아 있으면 전체 v4.5.0 완성이라고 보고하지 않는다. 각 Gate를 통과한 구체 기능만 Implemented로 승격한다.
