# 도로늄 공장 — INFINITE INDUSTRY

PC와 모바일 브라우저에서 실행되는 실시간 3D 공장 건설·자동화 시뮬레이션 게임입니다. Three.js WebGL 렌더러가 지형, 자원 지형물, 생산 설비, 엔지니어를 3D 장면으로 표시하며 기존 생산·연구·퀘스트·저장 시뮬레이션을 유지합니다.

## 시작하기

돌이사이트 메인 화면의 **도로늄 공장 입장** 카드를 누르거나 다음 경로로 접속합니다.

- GitHub Pages: https://rockey-jason.github.io/doldol-site/doronium-factory/

## 조작

### PC
- **W / A / S / D** 또는 방향키: 엔지니어 이동
- **마우스 왼쪽 드래그**: 3D 월드 카메라 이동\n- **마우스 오른쪽 또는 Shift+드래그**: 3D 카메라 회전
- **마우스 휠 / + / −**: 3D 카메라 확대·축소
- **R**: 선택한 시설 방향 회전
- **B / F / I / T / M**: 건설 / 운영 / 창고 / 연구 / 임무 탭
- **Space**: 시뮬레이션 일시정지
- 월드 타일 클릭: 자원 채집, 시설 선택, 건설

### 모바일
- 3D 월드를 한 번 탭해 자원을 채집하거나 시설을 선택합니다.
- 손가락을 드래그해 3D 카메라를 이동합니다.
- 지도 위 시설 배치도 같은 탭 방식으로 진행합니다.
- 오른쪽 패널의 탭으로 건설·운영·창고·연구·임무를 전환합니다.

## 핵심 플레이 루프

1. 숲과 암석 지대에서 목재·석재를 채집합니다.
2. 철광석·구리·석탄 광맥에 채굴기를 설치합니다.
3. 발전기와 제련로·압연기·조립기를 배치해 생산 라인을 만듭니다.
4. 컨베이어, 창고, 거래소를 연결해 물류와 판매를 자동화합니다.
5. 기술 연구로 새로운 시설과 도로늄 공정을 해금합니다.
6. 돌이 고기 나무에서 비합성 돌이 고기를 수확하고, 10개를 압력 반응로에서 도로늄으로 합성합니다.
7. 15종의 도로늄 결정과 고급 연구를 모아 인피니티 퓨전을 완성합니다.
8. 지정된 3개 지점에 안정화 릴레이를 설치하고 중앙 코어를 가동해 행성을 안정화합니다.

## 시설 조작

건설 탭에서 시설을 고르면 월드 타일을 클릭해 설치할 수 있습니다. 기계를 클릭하면 운영 패널에서 입출력 버퍼를 확인하고, 출력 회수·원료 투입·방향 회전·해체를 할 수 있습니다. 컨베이어는 R 키 또는 방향 회전 버튼으로 운송 방향을 바꿉니다.

기계 출력은 인접한 컨베이어·창고·거래소 또는 다른 생산 기계로 전달할 수 있습니다. 컨베이어 끝에는 창고나 거래소를 연결하면 생산품을 자동 회수하거나 판매할 수 있습니다.

## 저장

- 비로그인 상태: 이 브라우저의 로컬 저장을 사용합니다.
- 돌이사이트 계정 로그인 상태: 기존 `dori_cloud_storage` 테이블의 전용 저장 키 `doronium_factory_infinite_industry_v1`를 사용해 계정별 클라우드 저장을 시도합니다.
- 로컬 게스트 저장과 계정별 로컬 저장은 별도 키로 분리됩니다.
- 오프라인 생산은 진행하지 않습니다.
- 클라우드 동기화가 실패해도 현재 기기의 로컬 저장은 유지됩니다.

## 검증 상태

GitHub Actions에서 JavaScript 구문 검사와 필수 게임 런타임 파일/계약 검사를 통과했습니다. GitHub Pages 빌드 및 배포 작업도 성공했습니다. 실제 브라우저에서의 장시간 플레이, PC·모바일 간 계정 전환, 저장 복구 및 엔드게임 반복 테스트는 별도 플레이 검증이 필요합니다.


## 시뮬레이션 시간

- 게임 시뮬레이션은 0.10초 고정 스텝으로 진행하며, 렌더 프레임 속도와 생산 시간 계산을 분리합니다.

## 3D 렌더러 적용 내역

- `world3d.js`: Three.js 0.180.0 WebGL 기반 3D 월드 렌더러
- 36×28 타일 월드, 안개·방향광·환경광·그림자, 자원 지형물, 플레이어 엔지니어, 시설별 절차적 3D 모델
- 기존 `factory.js`의 생산·전력·연구·퀘스트·퓨전·저장 로직과 계정별 클라우드 저장 키를 유지
- 드래그 이동, 레이캐스트 타일 선택, 모바일 포인터 입력, 카메라 확대/축소
- 장면 재구성 시 GPU geometry/material 자원 정리
- Three.js는 jsDelivr CDN에서 불러오며, CDN 또는 WebGL을 사용할 수 없는 환경에서는 호환용 2D 렌더러로 전환해 UI와 저장 기능이 중단되지 않도록 합니다.

## 남은 출시 검증

현재 3D 월드 렌더링과 기존 게임 루프의 연결은 적용됐으며 GitHub Actions의 JavaScript 구문 및 필수 계약 검사가 통과했습니다. 다만 브라우저별 WebGL 호환성, 실제 모바일 기기 성능, 60분 이상 메모리/안정성, 기존 저장 데이터의 전수 회귀, 전체 v4.5 사양 준수는 아직 완료로 표시하지 않습니다. 3D 기계 모델은 현재 코드로 생성하는 절차적 모델이며 전용 고품질 외부 에셋·애니메이션은 후속 작업입니다.


## BUILD 3D INTERACTION & VALIDATION

- Facilities now use distinct procedural 3D assemblies: wind generator, solar array, mining drill, water pump, Dori greenhouse, furnace, wire mill, robotic assembler, research chamber, pressure reactor, fusion vessel, cooling tower, relay dish and planetary core.
- Machine animation is driven by current machine state; conveyor items are represented as individual 3D meshes and move along the belt using the same `moveTimer` that drives logical transfer.
- The engineer uses four-direction grid pathfinding, facility-footprint collision and proximity interaction. Mobile touch movement buttons and two-finger camera orbit/zoom are available.
- The inventory includes a 15-variant 3D crystal codex. Each variant has its own geometry family, material and emissive color; Infinity has a separate final form.
- Reactor recipe preflight rejects synthetic Dori Meat before consumption, preserving rejected inventory.
- GitHub Actions now runs desktop Chromium WebGL, phone-sized touch emulation, recipe/reference checks, collision checks, a virtual one-hour fixed-tick production run and item-conservation assertions.

### Validation boundary

A virtual one-hour soak advances 36,000 fixed 0.1-second simulation ticks in automated Chromium. This is not a 60-minute wall-clock endurance test. Phone-sized Playwright emulation is not a physical Android/iPhone test. GPU behavior and thermals on real devices still require device testing. Procedural code-generated meshes are not a substitute for bespoke artist-authored production assets.
