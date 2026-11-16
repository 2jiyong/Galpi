# 문장 CRUD·정렬·즐겨찾기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 갈피 상세 화면에서 문장을 추가·수정(갈피 이동 포함)·삭제하고, 즐겨찾기를 켜고 끄고, 정렬(오래된 순/최신순)을 바꿔 저장할 수 있게 한다.

**Architecture:** 2단계와 같은 헥사고날 구조. `phrase` 기능에 `port/in`, `service`, `adapter/in/web`을 추가한다. 문장 정렬 규칙(즐겨찾기 먼저 → 만든 시각)은 도메인 비교자로 두고 서비스가 적용한다. 문장 서비스는 갈피 존재 확인과 정렬 설정을 `GalpiRepository` 출력 포트로 읽는다. 프론트는 갈피 상세 화면에 문장 목록, 정렬 선택, 즐겨찾기 토글, 문장 시트(추가/편집)를 붙인다.

**Tech Stack:** Spring Boot 4.1, JPA, PostgreSQL 18 (Testcontainers), React 19 + TS, react-router 8, Vitest + RTL

**Spec:** `docs/superpowers/specs/2026-11-13-mvp-spec-design.md` (3.3, 3.4, 5장)

## Global Constraints

- 문장 내용 1~500자, 출처 각 1~200자, 중복 합친 뒤 최대 10개 (`Phrase` 그대로)
- 목록 순서: 즐겨찾기 묶음 먼저, 각 묶음 안에서 갈피 `phraseSort`(OLDEST 기본/NEWEST)로 `createdAt` 정렬. 같은 시각이면 `id`로 고정
- 즐겨찾기를 눌러도 화면의 순서는 바뀌지 않는다. 목록을 새로 불러올 때만 반영한다
- 유스케이스는 한 트랜잭션에서 읽고 → 바꾸고 → 저장한다. 대상이 없으면 404
- 없는 `galpiId`로 만들거나 옮기면 404 (`GalpiNotFoundException`)
- 400은 `ProblemDetail` + `errors[{field, message}]`
- API: `GET/POST /api/galpis/{id}/phrases`, `PUT/DELETE /api/phrases/{id}`, `PUT /api/phrases/{id}/favorite`, `PUT /api/galpis/{id}/phrase-sort`
- 응답 항목: `id, galpiId, content, sources[], favorite, createdAt`
- 커밋은 CLAUDE.md 규칙(한글, 상세 본문)을 따른다
- 무작위 문장(`/api/phrases/random`)과 집중 보기는 4단계 범위다

## Review Focus

1. 즐겨찾기 토글 직후 목록 순서가 바뀌면 안 된다 → `GalpiDetailPage` `favoriteToggleKeepsOrder`
2. 문장을 다른 갈피로 옮긴 뒤 현재 목록과 문장 수가 갱신돼야 한다 → `movingPhraseRemovesItFromList`
3. 없는 갈피로 이동 요청 시 500이 아니라 404 → `PhraseServiceTest.updateToUnknownGalpiThrowsNotFound`, API 통합 테스트
4. 저장 중 시트를 닫아 중복 생성되면 안 된다 → `PhraseForm`/상세 화면 `keepsPhraseSheetOpenWhileSaving`
5. 출처 11개 입력을 막고, 서버 오류 필드(`content`, `source`, `sources`)를 화면 문구로 보여야 한다 → `PhraseForm` 테스트

---

### Task 1: 정렬 설정 저장 API

**Files:**
- Modify: `galpi/application/port/in/GalpiUseCase.java`, `galpi/application/service/GalpiService.java`, `galpi/adapter/in/web/GalpiController.java`
- Create: `galpi/adapter/in/web/PhraseSortRequest.java`
- Test: `GalpiServiceTest`, `GalpiControllerTest`

**Interfaces:**
- Produces: `GalpiSummary changePhraseSort(UUID id, PhraseSort sort)`; `PUT /api/galpis/{id}/phrase-sort` body `{ "phraseSort": "NEWEST" }` → 200 `GalpiResponse`
- `phraseSort`가 null이면 `InvalidFieldException("phraseSort", ...)` → 400. 알 수 없는 값은 JSON 파싱 단계에서 400

- [ ] 테스트: `changePhraseSortSavesSetting` (NEWEST로 바꾸면 저장소에서 NEWEST, updatedAt = 시계), `changePhraseSortThrowsWhenMissing`, `changePhraseSortRejectsNull` (field `phraseSort`)
- [ ] 컨트롤러 테스트: `changesPhraseSort` (200, `$.phraseSort` = NEWEST)
- [ ] 실패 확인 → 구현 → `./gradlew test` 통과 → 커밋 `feat: 갈피별 문장 정렬 설정 API 추가`

### Task 2: 공통 404 예외와 문장 저장소 확장

**Files:**
- Create: `common/application/ResourceNotFoundException.java` (추상, `String title()`)
- Modify: `GalpiNotFoundException` → 상속, `ApiExceptionHandler` → 공통 예외 하나로 404 처리
- Create: `phrase/application/PhraseNotFoundException.java` (title "문장을 찾을 수 없습니다")
- Modify: `PhraseRepository`, `PhraseJpaRepository`, `PhrasePersistenceAdapter`
- Create: `phrase/domain/PhraseOrder.java`
- Test: `PhraseOrderTest`, `PhrasePersistenceAdapterTest`

**Interfaces:**
- Produces: `List<Phrase> PhraseRepository.findAllByGalpiId(UUID galpiId)` (순서 보장 없음), `boolean PhraseRepository.deleteById(UUID id)`
- Produces: `static Comparator<Phrase> PhraseOrder.of(PhraseSort sort)` — favorite desc → createdAt (OLDEST asc / NEWEST desc) → id asc
- `findAllByGalpiId`는 `@EntityGraph(attributePaths = "sources")`로 출처를 한 번에 읽는다

- [ ] 테스트 `PhraseOrderTest`: `favoritesComeFirstThenOldest`, `newestSortsEachGroupDescending`, `sameCreatedAtFallsBackToId`
- [ ] 테스트 `PhrasePersistenceAdapterTest`: `findAllByGalpiIdReturnsOnlyThatGalpisPhrasesWithSources`, `deleteByIdRemovesPhraseAndSources` (없는 id는 false)
- [ ] 기존 `GalpiControllerTest` 404 테스트가 그대로 통과하는지 확인
- [ ] 커밋 `feat: 문장 정렬 규칙과 저장소 조회·삭제 추가`

### Task 3: 문장 유스케이스

**Files:**
- Create: `phrase/application/port/in/PhraseUseCase.java`, `phrase/application/service/PhraseService.java`
- Test: `phrase/application/service/PhraseServiceTest.java`, `InMemoryPhraseRepository.java`; `InMemoryGalpiRepository`를 `public`으로 바꿔 재사용

**Interfaces:**
- Produces (`PhraseUseCase`):
  - `List<Phrase> listPhrases(UUID galpiId)` — 갈피 없으면 `GalpiNotFoundException`, `PhraseOrder.of(galpi.getPhraseSort())`로 정렬
  - `Phrase createPhrase(UUID galpiId, String content, List<String> sources)`
  - `Phrase updatePhrase(UUID id, String content, List<String> sources, UUID galpiId)` — `galpiId`가 null이거나 같으면 이동하지 않음, 다르면 대상 갈피 확인 후 `moveTo`
  - `void deletePhrase(UUID id)`
  - `Phrase changeFavorite(UUID id, boolean favorite)`
- 시각은 `Instant.now(clock).truncatedTo(MICROS)`

- [ ] 테스트: `listSortsFavoritesFirstUsingGalpiSetting`, `listThrowsWhenGalpiMissing`, `createSavesWithClock`, `createThrowsWhenGalpiMissing`, `updateChangesContentAndMoves`, `updateToUnknownGalpiThrowsNotFound` (원래 문장 그대로), `updateThrowsWhenPhraseMissing`, `deleteRemovesPhrase`, `deleteThrowsWhenMissing`, `changeFavoriteSaves`
- [ ] 커밋 `feat: 문장 유스케이스 추가`

### Task 4: 문장 REST API

**Files:**
- Create: `phrase/adapter/in/web/PhraseController.java`, `PhraseRequest.java (content, sources, galpiId)`, `FavoriteRequest.java (Boolean favorite)`, `PhraseResponse.java`
- Test: `PhraseControllerTest` (@WebMvcTest), `PhraseApiIntegrationTest`

**Interfaces:**
- `GET /api/galpis/{galpiId}/phrases` → 200 배열; `POST /api/galpis/{galpiId}/phrases` → 201 + Location `/api/phrases/{id}`
- `PUT /api/phrases/{id}` → 200; `DELETE /api/phrases/{id}` → 204; `PUT /api/phrases/{id}/favorite` → 200 (`favorite` null이면 400 field `favorite`)

- [ ] 컨트롤러 테스트: `listsPhrases`, `createsPhraseWithLocation`, `returnsNotFoundForMissingPhrase` (title "문장을 찾을 수 없습니다"), `rejectsMissingFavorite`
- [ ] 통합 테스트 `phraseLifecycleThroughApi`: 생성 → 즐겨찾기 → 다른 문장보다 앞에 오는지 → 정렬 NEWEST → 다른 갈피로 이동 → 삭제 → 404; `movingToUnknownGalpiReturnsNotFound`
- [ ] `./gradlew test` 전체 통과 → 커밋 `feat: 문장 REST API 추가`

### Task 5: 프론트 API 클라이언트

**Files:**
- Create: `frontend/src/api/client.ts` (`ApiError`, `request`를 `galpis.ts`에서 옮김; `galpis.ts`는 `ApiError`를 다시 내보냄)
- Create: `frontend/src/api/phrases.ts`
- Modify: `frontend/src/api/galpis.ts` (`changePhraseSort(id, sort): Promise<Galpi>`)
- Test: `frontend/src/api/phrases.test.ts`

**Interfaces:**
- `type Phrase = { id; galpiId; content; sources: string[]; favorite: boolean; createdAt }`
- `type PhraseInput = { content: string; sources: string[]; galpiId: string }`
- `listPhrases(galpiId)`, `createPhrase(input)` (POST `/api/galpis/{input.galpiId}/phrases`), `updatePhrase(id, input)`, `deletePhrase(id)`, `setPhraseFavorite(id, favorite)`

- [ ] 테스트: 각 함수의 메서드·경로·본문, 400 응답의 fieldErrors
- [ ] 커밋 `feat: 문장 API 클라이언트 추가`

### Task 6: 문장 입력 폼

**Files:**
- Create: `frontend/src/lib/phraseValidation.ts`, `frontend/src/components/PhraseForm.tsx`
- Modify: `frontend/src/components/Sheet.tsx` (내용이 길면 시트 안에서 스크롤: `max-h-[90vh] overflow-y-auto`)
- Test: `frontend/src/components/PhraseForm.test.tsx`

**Interfaces:**
- `PhraseForm({ initial?: PhraseInput, galpis: {id, title}[], submitLabel, onSubmit(input): Promise<void>, onCancel, onDelete?: () => Promise<void> })`
- 라벨: `내용`, 글자 수 `n/500`, `출처 (선택)` 줄마다 입력란 + `출처 n 삭제` 버튼, `+ 출처 추가`(10개면 비활성), `갈피` select, `취소`/submitLabel, `onDelete`가 있으면 `삭제`
- 보낼 때 빈 출처 줄은 뺀다
- 프론트 검증: 내용 비었음 "내용을 입력해 주세요", 500자 초과 "내용은 500자까지 쓸 수 있어요", 출처 200자 초과 "출처는 200자까지 쓸 수 있어요"
- 서버 필드 문구: `content` "내용은 1~500자로 입력해 주세요", `source` "출처는 1~200자로 입력해 주세요", `sources` "출처는 10개까지 넣을 수 있어요"

- [ ] 테스트: `submitsTrimmedInputWithoutEmptySources`, `showsContentErrorWithoutSubmitting`, `limitsSourcesToTen`, `removesSourceRow`, `showsServerFieldError`, `disablesButtonsWhileSaving`
- [ ] 커밋 `feat: 문장 입력 폼 추가`

### Task 7: 갈피 상세의 문장 목록

**Files:**
- Modify: `frontend/src/pages/GalpiDetailPage.tsx`
- Test: `frontend/src/pages/GalpiDetailPage.test.tsx` (기존 테스트에 `GET /api/galpis/g1/phrases` 핸들러 추가)

**Interfaces:**
- 상세 진입 시 갈피와 문장을 함께 불러온다. 추가·수정·삭제 후에는 둘 다 다시 불러온다(문장 수, 집중 보기 버튼 상태, 정렬 반영)
- `문장 n개`, 정렬 select (label `정렬`, 옵션 `오래된 순`/`최신순`) → `changePhraseSort` 후 목록 재조회
- 목록(`aria-label="문장 목록"`): 즐겨찾기 버튼 (`aria-label="즐겨찾기"`, `aria-pressed`), 내용, 출처(` · `로 이어서), `편집` 버튼
- 즐겨찾기: 응답을 받으면 그 항목의 별만 바꾼다. 실패하면 "잠시 후 다시 시도해 주세요"
- `+ 문장 추가` → 시트 "문장 추가" (갈피 기본값 = 현재 갈피). 편집 시트 "문장 편집"에 `삭제` (확인 "이 문장을 삭제할까요?")
- 갈피 선택 목록은 시트를 열 때 `listGalpis()`로 받고, 실패하면 현재 갈피만 보여 준다
- 문장 목록 로드 실패 시 "문장을 불러오지 못했어요" + `다시 시도`

- [ ] 테스트: `listsPhrasesInServerOrder`, `favoriteToggleKeepsOrder`, `changingSortSavesAndReloads`, `addsPhraseAndReloads`, `movingPhraseRemovesItFromList`, `deletesPhraseAfterConfirm`, `keepsPhraseSheetOpenWhileSaving`
- [ ] `pnpm test:run`, `lint`, `typecheck`, `build` 통과 → 커밋 `feat: 갈피 상세에 문장 목록과 편집 추가`

### Task 8: 문서와 그래프

- [ ] `ARCHITECTURE.md` "현재 상태와 다음 단계"를 갱신(문장 기능 완료, 다음은 4단계)
- [ ] `graphify update .`
- [ ] 커밋 `docs: 3단계 완료 상태 반영`
