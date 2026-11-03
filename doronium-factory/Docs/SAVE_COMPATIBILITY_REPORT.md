# Doronium Factory — Save Compatibility & Recovery Report

- 점검일: 2026-11-03
- 현재 게임 키: `doronium_factory_infinite_industry_local_v1`
- 계정별 로컬 키: `doronium_factory_infinite_industry_local_v1_<Supabase user id>`
- 클라우드 키: `doronium_factory_infinite_industry_v1`
- 저장 테이블: 기존 Supabase `dori_cloud_storage`
- 주의: 이 문서는 저장소 소스 계약을 기록한다. 사용자의 실계정 세이브를 직접 열어 검사한 결과를 뜻하지 않는다.

## 이전 데이터 형식

| 필드 | 기존 값 / 동작 | 호환 결정 |
|---|---|---|
| Envelope | local `game/version/savedAt/checksum/state`; 이전 버전은 envelope 내부 schemaVersion이 없을 수 있음 | 기존 envelope를 계속 읽고 새 envelope만 schemaVersion을 추가 |
| Checksum | `factory.js`의 FNV-1a 32-bit hex | `save-store.js`에서 동일 문자열/UTF-16 code unit 계산 방식 유지 |
| World | `worldVersion: 4` | 기존 `hydrateState()` 좌표/노드 migration을 변경하지 않음 |
| Runtime | `runtime.schemaVersion: 4` (없는 경우 legacy inventory로 ItemStack migration) | runtime이 없는 기존 세이브는 기존 inventory/meta를 기반으로 1회 migration |
| Player / Buildings | 좌표, layer, camera, buildings, flatten/foundation | 기존 값을 merge하고 새 기능 필드만 기본값으로 추가 |
| Inventory | aggregate quantity map + meta에서 ItemStack으로 migration | 기존 수량보다 새 ItemStack 총량을 줄이지 않음 |
| Research / Quest | 연구 ID, progress, questIndex, chapter, flags | ID와 순서를 바꾸지 않음 |
| Cloud | 기존 사용자 소유 `dori_cloud_storage` row | 같은 user_id/storage_key를 사용. 새 저장 envelope도 같은 행에 기록 |

## 새 저장 계약

- Save schema: 4
- gameVersion: `v4.5-web-adaptation`
- 저장 envelope: `game/version/schemaVersion/gameVersion/savedAt/checksum/state`
- 저장 전 Runtime와 Skill ledger를 검증한다.
- 저장 순서: immutable snapshot → JSON serialize → checksum → temporary key → read-back verify → backup rotation → main key → read-back verify → temp cleanup.
- 최근 정상 스냅샷 최대 3개를 `_backup_1..3`에 보관한다.
- 메인 데이터가 손상/누락되면 timestamp가 가장 최신인 checksum-valid main/temp/backup 후보에서 복구한다.
- 새 버전이 모르는 미래 schema는 reject하고 기존 저장을 덮어쓰지 않는다.
- 계정별 키와 클라우드 저장 키는 변경하지 않는다.

## 복구 / migration 규칙

1. 기존 main save가 정상이고 최신이면 계속 사용한다.
2. main 손상 시 checksum-valid 임시 저장 또는 3개 백업 중 최신 후보를 복구한다.
3. 이전 envelope에 schemaVersion이 없어도 state.runtime schemaVersion을 사용해 유효성 판정한다.
4. 예전 runtime이 없다면 inventory와 meta에서 ItemStack을 migration한다.
5. `worldVersion < 3`의 legacy 좌표 이동 및 `worldVersion < 4`의 확장 surface 병합 로직은 유지한다.
6. skill 필드가 없는 저장은 시작 스킬 상태로 migration하되, 기존 연구 tier/chapter/mine depth/crystal biome 발견이 명백할 때만 그 milestone ClaimID를 복구한다.
7. 같은 milestone ClaimID는 중복 지급하지 않는다.
8. 클라우드 저장 실패 시 로컬 저장을 성공한 것으로 오인하지 않는다. UI에는 로컬/클라우드 상태를 별도로 표시한다.

## 테스트 기대값

- 유효 envelope read/write 성공
- checksum 변조 거절
- 과거 schema / runtime 없는 legacy state migration
- 미래 schema는 거절하고 main save 유지
- 3회 backup rotation 순서 보존
- main corrupt → valid backup 복구
- temporary write 실패 → 기존 main 보존
- 스킬 point / stack / failure RNG / event ID 저장 후 이어짐

실제 계정 데이터에 대해 자동 migration을 수행했다는 의미는 아니다. 테스트 데이터와 실제 사용자 세이브는 구분한다.
