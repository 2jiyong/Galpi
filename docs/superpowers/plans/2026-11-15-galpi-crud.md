# 갈피 CRUD 구현 계획 (구현 2단계)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 갈피 만들기·보기·고치기·지우기와 최근 본 갈피를 REST API부터 모바일 화면까지 완성한다.

**Architecture:** 백엔드는 1단계 구조 위에 입력 포트(`GalpiUseCase`)와 서비스, REST 어댑터(`adapter/in/web`)를 더한다. 서비스는 한 트랜잭션 안에서 새로 읽고 → 바꾸고 → 저장하고, 최근 본 시각은 컬럼 하나만 갱신한다. 프론트는 react-router로 홈(`/`)과 갈피 상세(`/galpis/:galpiId`) 두 화면을 만들고, `fetch` 래퍼 하나로 API를 호출한다.

**Tech Stack:** Java 25, Spring Boot 4.1.1 (WebMVC, Data JPA), PostgreSQL 18, JUnit 5, MockMvc, Testcontainers / React 19, TypeScript, Vite, Tailwind CSS, react-router, Vitest, React Testing Library

**Spec:** `docs/superpowers/specs/2026-11-13-mvp-spec-design.md` (3.1, 3.2, 3.5의 빈 갈피 안내, 4장 홈·갈피 상세, 5장 갈피 API, 8장 2단계 주의사항)

## Global Constraints

- 갈피 제목은 앞뒤 공백을 뺀 뒤 1~50자, 설명은 0~200자. 비어 있으면 `null`로 저장한다 (기존 도메인 규칙 그대로)
- 갈피 목록은 만든 순서대로 보여 준다. 오래된 것이 위에 온다
- 최근 본 갈피는 `lastViewedAt`이 최신인 것부터 최대 3개. 하나도 없으면 영역을 숨긴다
- 갈피 상세에 들어가면 `POST /api/galpis/{id}/views`로 `last_viewed_at`만 갱신한다. 객체 전체를 저장하지 않는다
- 수정·삭제·보기 대상이 없으면 404. 저장소의 `save`로 없는 행을 새로 만들지 않는다
- 서버가 정하는 시각은 `Instant.now(clock).truncatedTo(ChronoUnit.MICROS)`. PostgreSQL 정밀도에 맞춘다
- 400 응답은 `ProblemDetail`이고, 필드 오류는 `errors: [{ "field": "title", "message": "..." }]` 속성에 담는다
- 화면 문구는 한국어. 모바일 세로 화면이 기준이며 가운데 정렬된 `max-w-md` 열을 쓴다. 기존 색 토큰(`canvas`, `paper`, `ink`, `moss`, `sage`, `sun`)을 쓴다
- 정렬 변경 API, 문장 기능, 인증, 홈의 무작위 문장은 이번 범위가 아니다 (3~5단계)
- 커밋은 `CLAUDE.md` 규칙을 따른다. 한국어로 쓰고, 접두어는 영어, 본문에 변경 내용을 항목별로 적는다
- 작업 브랜치: `feat/galpi-crud`

## Review Focus

1. **앞뒤 공백 때문에 50자를 넘는 제목**: `"  " + 50자 + "  "`는 공백을 빼면 50자이므로 화면과 서버 모두 받아들여야 한다 → Task 4 `GalpiForm.test.tsx` `validatesTrimmedLength`
2. **UUID 형식이 아닌 경로** (`/api/galpis/abc`): 500이 아니라 400 → Task 3 `rejectsMalformedId`
3. **만들기 버튼 연속 탭**: 저장 중에는 버튼을 비활성화해서 갈피가 두 개 생기지 않게 한다 → Task 4 `HomePage.test.tsx` `disablesSubmitWhileSaving`
4. **다른 기기에서 지운 갈피를 열기**: 화면이 깨지지 않고 "갈피를 찾을 수 없어요"를 보여 준다 → Task 5 `GalpiDetailPage.test.tsx` `showsNotFound`
5. **편집에서 설명을 지우기**: 설명을 빈칸으로 저장하면 `null`이 되어 화면에서 사라진다 → Task 2 `updateClearsDescription`, Task 3 `galpiLifecycleThroughApi`

---

### Task 1: 갈피 저장소 포트 확장

**Files:**
- Modify: `src/main/java/com/galpi/galpi/application/port/out/GalpiRepository.java`
- Modify: `src/main/java/com/galpi/galpi/adapter/out/persistence/GalpiJpaRepository.java`
- Modify: `src/main/java/com/galpi/galpi/adapter/out/persistence/GalpiPersistenceAdapter.java`
- Modify: `src/test/java/com/galpi/galpi/adapter/out/persistence/GalpiPersistenceAdapterTest.java`

**Interfaces:**
- Consumes: 1단계의 `Galpi`, `GalpiJpaEntity`, `PostgresIntegrationTest`
- Produces (`GalpiRepository`에 추가):
  - `List<Galpi> findAllOrderByCreatedAt()`: `created_at` 오름차순
  - `Map<UUID, Long> countPhrasesByGalpiId()`: 문장이 있는 갈피만 들어 있음
  - `long countPhrases(UUID galpiId)`
  - `boolean deleteById(UUID id)`: 지운 행이 있으면 `true`
  - `boolean updateLastViewedAt(UUID id, Instant viewedAt)`: `last_viewed_at`만 갱신하고, 행이 있으면 `true`

- [ ] **Step 1: 브랜치 생성**

Run: `git checkout main && git pull && git checkout -b feat/galpi-crud`

- [ ] **Step 2: 실패하는 통합 테스트 추가** (`GalpiPersistenceAdapterTest`, 고정 시각 `T0`, `T1` 그대로)
- `findAllOrdersByCreatedAt`: `T1`에 만든 "나중"과 `T0`에 만든 "먼저"를 이 순서로 저장 → 제목이 `containsExactly("먼저", "나중")`
- `countsPhrasesPerGalpi`: 갈피 A에 `jdbc`로 문장 2개를 INSERT하고 갈피 B에는 넣지 않음 → `countPhrasesByGalpiId()`는 `{A: 2}`, `countPhrases(A) == 2`, `countPhrases(B) == 0`
- `deleteByIdReportsWhetherRowExisted`: 저장한 갈피는 `true`이고 이후 `findById`가 비어 있음. 없는 ID는 `false`
- `updateLastViewedAtTouchesOnlyThatColumn`: `T0`에 저장 → `jdbc`로 제목을 "다른 기기에서 수정"으로 바꿈 → `updateLastViewedAt(id, T1)`이 `true` → 조회 결과 `lastViewedAt == T1`, 제목은 "다른 기기에서 수정", `updatedAt == T0`. 없는 ID는 `false`

문장 INSERT SQL: `INSERT INTO phrases (id, galpi_id, content, created_at, updated_at) VALUES (?, ?, '문장', now(), now())`

- [ ] **Step 3: 실패 확인**

Run: `./gradlew compileTestJava`
Expected: 컴파일 실패 (`findAllOrderByCreatedAt` 등 없음)

- [ ] **Step 4: 구현**
- `GalpiJpaRepository`에 추가:
  - `List<GalpiJpaEntity> findAllByOrderByCreatedAtAsc()`
  - `@Modifying @Query("delete from GalpiJpaEntity g where g.id = :id") int deleteByIdReturningCount(UUID id)`
  - `@Modifying @Query("update GalpiJpaEntity g set g.lastViewedAt = :viewedAt where g.id = :id") int updateLastViewedAt(UUID id, Instant viewedAt)`
  - 네이티브 쿼리 `SELECT galpi_id AS galpiId, count(*) AS phraseCount FROM phrases GROUP BY galpi_id`와 `SELECT count(*) FROM phrases WHERE galpi_id = :galpiId`. 첫 번째 쿼리의 결과는 인터페이스 프로젝션 `PhraseCountRow { UUID getGalpiId(); long getPhraseCount(); }`로 받는다
- 문장 테이블은 문장 기능의 JPA 엔티티를 참조하지 않고 네이티브 SQL로 센다. 패키지끼리 의존이 생기지 않게 하기 위해서다
- 어댑터의 변경 메서드에는 `@Transactional`, 조회 메서드에는 `@Transactional(readOnly = true)`를 붙인다

- [ ] **Step 5: 테스트 통과 확인**

Run: `./gradlew test`
Expected: `BUILD SUCCESSFUL`, 출력에 `SKIPPED` 없음 (OrbStack 실행 중)

- [ ] **Step 6: 커밋**

```bash
git add -A src
git commit -F - <<'EOF'
feat: 갈피 저장소에 목록·문장 수·삭제·최근 본 시각 갱신 추가

- GalpiRepository: findAllOrderByCreatedAt, countPhrasesByGalpiId, countPhrases, deleteById, updateLastViewedAt 추가
- 삭제와 최근 본 시각 갱신은 영향받은 행 수로 대상 존재 여부를 돌려줌
- 최근 본 시각은 last_viewed_at 컬럼만 갱신해 다른 기기의 수정을 덮지 않음
- 문장 수는 네이티브 SQL로 세어 phrase 패키지에 의존하지 않음
EOF
```

---

### Task 2: 갈피 유스케이스와 서비스

**Files:**
- Create: `src/main/java/com/galpi/galpi/application/port/in/GalpiUseCase.java`
- Create: `src/main/java/com/galpi/galpi/application/port/in/GalpiSummary.java`
- Create: `src/main/java/com/galpi/galpi/application/GalpiNotFoundException.java`
- Create: `src/main/java/com/galpi/galpi/application/service/GalpiService.java`
- Create: `src/main/java/com/galpi/common/config/ClockConfig.java`
- Create: `src/test/java/com/galpi/galpi/application/service/GalpiServiceTest.java`
- Create: `src/test/java/com/galpi/galpi/application/service/InMemoryGalpiRepository.java`

**Interfaces:**
- Consumes: Task 1의 `GalpiRepository` 전체
- Produces:
  - `record GalpiSummary(Galpi galpi, long phraseCount)`
  - `interface GalpiUseCase`:
    - `List<GalpiSummary> listGalpis()`
    - `GalpiSummary getGalpi(UUID id)`
    - `GalpiSummary createGalpi(String title, String description)`
    - `GalpiSummary updateGalpi(UUID id, String title, String description)`
    - `void deleteGalpi(UUID id)`
    - `void markViewed(UUID id)`
  - `class GalpiNotFoundException extends RuntimeException`: `UUID id()`를 가진다
  - `ClockConfig`: `@Bean Clock clock()` → `Clock.systemUTC()`
  - `GalpiService(GalpiRepository repository, Clock clock)`: `@Service @Transactional`, 조회 메서드는 `readOnly = true`

- [ ] **Step 1: 실패하는 단위 테스트 작성**

`InMemoryGalpiRepository`는 `GalpiRepository`를 `LinkedHashMap`으로 구현한 테스트용 가짜다. 문장 수는 `void setPhraseCount(UUID id, long count)`로 정한다. `GalpiServiceTest`는 `Clock.fixed(T1, ZoneOffset.UTC)`로 서비스를 만들고, 기존 갈피는 저장소에 `T0`에 만든 상태로 넣는다.
- `listReturnsGalpisInCreationOrderWithPhraseCounts`: 두 갈피, 첫 번째에 문장 3개 → 순서 유지, `phraseCount`는 `3`, `0`
- `createUsesClockAndStartsWithZeroPhrases`: `createGalpi("  공부  ", "")` → 제목 `"공부"`, 설명 `null`, `createdAt == T1`, `phraseCount == 0`, 저장소에 들어 있음
- `createTruncatesClockToMicros`: 시계를 `T1.plusNanos(1_234_567)`로 둠 → `createdAt == T1.plusNanos(1_234_000)`
- `updateChangesTitleAndTouchesUpdatedAt`: → 제목 변경, `updatedAt == T1`, `createdAt == T0`
- `updateClearsDescription`: 설명 `"   "`로 수정 → `null`
- `updateUnknownGalpiThrowsNotFound`: `GalpiNotFoundException`, 저장소 크기 변화 없음
- `invalidUpdateKeepsStoredValues`: 제목 `"가".repeat(51)` → `IllegalArgumentException`, 저장된 제목 그대로
- `deleteRemovesGalpi` / `deleteUnknownGalpiThrowsNotFound`
- `markViewedRecordsClockTime`: 저장소의 `lastViewedAt == T1` / `markViewedUnknownGalpiThrowsNotFound`
- `getUnknownGalpiThrowsNotFound`

- [ ] **Step 2: 실패 확인**

Run: `./gradlew test --tests 'com.galpi.galpi.application.*'`
Expected: 컴파일 실패 (`GalpiUseCase` 없음)

- [ ] **Step 3: 구현**

`updateGalpi`는 `findById`(없으면 `GalpiNotFoundException`) → `galpi.update(...)` → `save` 순서다. `deleteGalpi`와 `markViewed`는 저장소가 `false`를 돌려주면 `GalpiNotFoundException`을 던진다. 시각은 Global Constraints 규칙대로 구한다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `./gradlew test`
Expected: `BUILD SUCCESSFUL`, `SKIPPED` 없음

- [ ] **Step 5: 커밋**

```bash
git add -A src
git commit -F - <<'EOF'
feat: 갈피 유스케이스와 서비스 추가

- GalpiUseCase 입력 포트: 목록, 단건 조회, 생성, 수정, 삭제, 최근 본 시각 기록
- GalpiService: 한 트랜잭션에서 조회 후 수정·저장하고, 대상이 없으면 GalpiNotFoundException
- 서버 시각은 Clock 빈에서 얻고 PostgreSQL 정밀도에 맞춰 마이크로초로 자름
- 메모리 저장소 가짜로 서비스 단위 테스트 작성
EOF
```

---

### Task 3: 갈피 REST API와 오류 응답

**Files:**
- Create: `src/main/java/com/galpi/common/domain/InvalidFieldException.java`
- Modify: `src/main/java/com/galpi/common/domain/TextRules.java` (`IllegalArgumentException` 대신 `InvalidFieldException`)
- Create: `src/main/java/com/galpi/common/api/ApiExceptionHandler.java`
- Create: `src/main/java/com/galpi/galpi/adapter/in/web/GalpiController.java`
- Create: `src/main/java/com/galpi/galpi/adapter/in/web/GalpiRequest.java`
- Create: `src/main/java/com/galpi/galpi/adapter/in/web/GalpiResponse.java`
- Modify: `src/main/resources/application.yml` (`spring.mvc.problemdetails.enabled: true`)
- Create: `src/test/java/com/galpi/galpi/adapter/in/web/GalpiControllerTest.java`
- Create: `src/test/java/com/galpi/galpi/adapter/in/web/GalpiApiIntegrationTest.java`

**Interfaces:**
- Consumes: Task 2의 `GalpiUseCase`, `GalpiSummary`, `GalpiNotFoundException`
- Produces (HTTP, Task 4·5가 사용):

| 메서드 | 경로 | 성공 | 실패 |
|---|---|---|---|
| GET | `/api/galpis` | 200 `GalpiResponse[]` | |
| POST | `/api/galpis` | 201 + `Location: /api/galpis/{id}` + `GalpiResponse` | 400 |
| GET | `/api/galpis/{id}` | 200 `GalpiResponse` | 404, 400(형식) |
| PUT | `/api/galpis/{id}` | 200 `GalpiResponse` | 400, 404 |
| DELETE | `/api/galpis/{id}` | 204 | 404 |
| POST | `/api/galpis/{id}/views` | 204 | 404 |

  - `record GalpiRequest(String title, String description)`
  - `record GalpiResponse(UUID id, String title, String description, PhraseSort phraseSort, long phraseCount, Instant lastViewedAt, Instant createdAt)` + `static GalpiResponse from(GalpiSummary)`
  - `class InvalidFieldException extends IllegalArgumentException`: `String field()`. 기존 `IllegalArgumentException` 단언은 그대로 통과한다
  - `ApiExceptionHandler extends ResponseEntityExceptionHandler` (`@RestControllerAdvice`):
    - `InvalidFieldException` → 400, `title: "입력값을 확인해 주세요"`, 속성 `errors: [{field, message}]`
    - `GalpiNotFoundException` → 404, `title: "갈피를 찾을 수 없습니다"`

- [ ] **Step 1: 실패하는 컨트롤러 테스트 작성** (`@WebMvcTest(GalpiController.class)` + `@Import(ApiExceptionHandler.class)` + `@MockitoBean GalpiUseCase`)
- `listsGalpis`: `$[0].title == "공부"`, `$[0].phraseCount == 2`, `$[0].createdAt == "2026-11-13T10:00:00Z"`, `$[0].lastViewedAt`는 null
- `createsGalpiWithLocation`: 201, `Location` 헤더가 `/api/galpis/{id}`로 끝남
- `returnsFieldErrorForInvalidTitle`: 유스케이스가 `new InvalidFieldException("title", "...")`을 던짐 → 400, `$.errors[0].field == "title"`
- `returnsNotFound`: `GalpiNotFoundException` → 404, `$.title == "갈피를 찾을 수 없습니다"`
- `rejectsMalformedId`: `GET /api/galpis/abc` → 400
- `rejectsMalformedJson`: 본문 `"{"` → 400
- `deletesAndMarksViewedWithNoContent`: 각각 204, 유스케이스 호출 `verify`

- [ ] **Step 2: 실패하는 API 통합 테스트 작성** (`GalpiApiIntegrationTest extends PostgresIntegrationTest`, `@AutoConfigureMockMvc`)
- `galpiLifecycleThroughApi`: POST(제목 "클라이밍", 설명 "운동 전에") → GET 목록 길이 1 → POST views 204 → GET 단건의 `lastViewedAt` not null → PUT(설명 "") → `description` null → DELETE 204 → GET 단건 404
- `rejectsOverlongTitleWithFieldError`: 제목 51자 POST → 400, `$.errors[0].field == "title"`

- [ ] **Step 3: 실패 확인**

Run: `./gradlew compileTestJava`
Expected: 컴파일 실패 (`GalpiController` 없음)

- [ ] **Step 4: 구현**
- `TextRules`가 `InvalidFieldException(field, message)`를 던지게 바꾼다. 메시지는 지금 문자열 그대로 둔다. 화면 문구는 프론트가 필드 이름을 보고 정한다
- 컨트롤러에 `@Tag(name = "Galpi")`와 메서드별 `@Operation(summary = ...)`를 붙인다 (`HealthController` 패턴)
- 형식이 틀린 UUID(`MethodArgumentTypeMismatchException`)와 깨진 JSON은 `ResponseEntityExceptionHandler`의 기본 처리로 400이 되는지 테스트로 확인한다

- [ ] **Step 5: 테스트 통과 확인**

Run: `./gradlew test`
Expected: `BUILD SUCCESSFUL`, `SKIPPED` 없음

- [ ] **Step 6: 커밋**

```bash
git add -A src
git commit -F - <<'EOF'
feat: 갈피 REST API와 공통 오류 응답 추가

- GalpiController: 목록, 생성(201, Location), 단건 조회, 수정, 삭제(204), 최근 본 시각 기록(204)
- ApiExceptionHandler: 필드 검증 실패는 400 ProblemDetail에 errors 목록, 없는 갈피는 404
- TextRules가 필드 이름을 담은 InvalidFieldException을 던지도록 변경
- spring.mvc.problemdetails 활성화로 깨진 JSON과 잘못된 ID 형식도 400 ProblemDetail로 응답
- MockMvc 컨트롤러 테스트와 실제 DB를 쓰는 API 흐름 통합 테스트 추가
EOF
```

---

### Task 4: 프론트 기반과 홈 화면

**Files:**
- Modify: `frontend/package.json`, `frontend/pnpm-lock.yaml` (`react-router` 추가)
- Create: `frontend/src/api/galpis.ts`, `frontend/src/api/galpis.test.ts`
- Create: `frontend/src/test/mockFetch.ts`
- Create: `frontend/src/components/GalpiForm.tsx`, `frontend/src/components/GalpiForm.test.tsx`
- Create: `frontend/src/pages/HomePage.tsx`, `frontend/src/pages/HomePage.test.tsx`
- Modify (전체 재작성): `frontend/src/App.tsx`, `frontend/src/App.test.tsx`
- Modify: `frontend/src/main.tsx` (`BrowserRouter`로 감싸기)

**Interfaces:**
- Consumes: Task 3의 HTTP API
- Produces:
  - `type Galpi = { id: string; title: string; description: string | null; phraseSort: 'OLDEST' | 'NEWEST'; phraseCount: number; lastViewedAt: string | null; createdAt: string }`
  - `type GalpiInput = { title: string; description: string }`
  - `class ApiError extends Error { status: number; fieldErrors: Record<string, string> }`: 응답의 `errors` 배열을 `field → message`로 바꿔 담는다
  - `listGalpis(): Promise<Galpi[]>`, `getGalpi(id: string): Promise<Galpi>`, `createGalpi(input: GalpiInput): Promise<Galpi>`, `updateGalpi(id: string, input: GalpiInput): Promise<Galpi>`, `deleteGalpi(id: string): Promise<void>`, `markGalpiViewed(id: string): Promise<void>`. 2xx가 아니면 `ApiError`를 던진다
  - `validateGalpiInput(input: GalpiInput): Partial<Record<'title' | 'description', string>>`
  - `<GalpiForm initial?: GalpiInput, submitLabel: string, onSubmit: (input: GalpiInput) => Promise<void>, onCancel: () => void />`: 서버가 400 `ApiError`를 돌려주면 필드 아래에 오류를 표시한다
  - `recentGalpis(galpis: Galpi[], limit = 3): Galpi[]` (`HomePage.tsx`에서 export)
  - `mockFetch(handlers: Record<string, (init?: RequestInit) => Response | Promise<Response>>)`: 키는 `"GET /api/galpis"` 형식
  - 라우트: `/` → `HomePage`, `/galpis/:galpiId` → `GalpiDetailPage`(Task 5, 이번 작업에서는 자리만 잡음), 그 밖 → "페이지를 찾을 수 없어요"

**화면 문구 (정확히 이대로)**
- 헤더: `갈피`, 버튼 `새 갈피`
- 섹션: `최근에 본 갈피`, `모든 갈피`
- 빈 상태: `첫 갈피를 만들어 보세요` + 버튼 `갈피 만들기`
- 목록 항목: 제목과 `문장 {n}개`
- 폼: 라벨 `제목`, `설명 (선택)`, 버튼 `만들기`(생성) 또는 `저장`(수정), `취소`
- 검증: `제목을 입력해 주세요`, `제목은 50자까지 쓸 수 있어요`, `설명은 200자까지 쓸 수 있어요`
- 서버 필드 오류(서버 메시지 대신 필드 이름으로 고른 문구): `title` → `제목은 1~50자로 입력해 주세요`, `description` → `설명은 200자까지 쓸 수 있어요`
- 실패: 400인데 필드 오류가 없으면 `입력한 내용을 다시 확인해 주세요`, 그 밖의 실패는 `잠시 후 다시 시도해 주세요`
- 불러오는 중: `불러오는 중…`, 목록을 못 불러옴: `갈피를 불러오지 못했어요` + 버튼 `다시 시도`

- [ ] **Step 1: 의존성 추가**

Run: `cd frontend && pnpm add --save-exact react-router`
Expected: `package.json`에 정확한 버전이 적힘

- [ ] **Step 2: 실패하는 테스트 작성**
- `galpis.test.ts`
  - `createGalpiPostsJson`: 메서드 `POST`, `Content-Type: application/json`, 본문이 입력과 같음
  - `throwsApiErrorWithFieldErrors`: 400 `{ errors: [{ field: 'title', message: 'x' }] }` → `ApiError`의 `status 400`, `fieldErrors.title == 'x'`
  - `deleteGalpiAcceptsNoContent`: 204면 에러 없이 끝남
- `GalpiForm.test.tsx`
  - `requiresTitle`: 빈 제목으로 제출 → `제목을 입력해 주세요` 표시, `onSubmit` 호출 안 됨
  - `validatesTrimmedLength`: `"  " + "가".repeat(50) + "  "`는 통과하고 51자는 `제목은 50자까지 쓸 수 있어요`
  - `showsServerFieldError`: `onSubmit`이 `ApiError(400, { title: 'title must contain 1 to 50 characters' })`로 실패 → 제목 아래에 `제목은 1~50자로 입력해 주세요` 표시 (서버의 영어 메시지는 보이지 않음)
- `HomePage.test.tsx` (`MemoryRouter`로 렌더)
  - `showsEmptyState`: 목록 `[]` → `첫 갈피를 만들어 보세요`. `최근에 본 갈피` 없음
  - `listsGalpisInServerOrderWithCounts`: 두 갈피 → 순서대로 링크 `href="/galpis/{id}"`, `문장 2개`
  - `recentGalpisShowsLatestThree`: `recentGalpis`에 `lastViewedAt` 있는 4개 + 없는 1개 → 최신 3개만, 내림차순
  - `createsGalpiAndNavigates`: `새 갈피` → 제목 입력 → `만들기` → POST 호출 → 새 갈피 상세 경로로 이동
  - `disablesSubmitWhileSaving`: POST가 끝나지 않는 동안 `만들기`가 `disabled`
  - `showsRetryOnLoadFailure`: GET 500 → `갈피를 불러오지 못했어요`, `다시 시도`를 누르면 다시 요청
- `App.test.tsx`: `/`는 `HomePage`, 없는 경로는 `페이지를 찾을 수 없어요`

- [ ] **Step 3: 실패 확인**

Run: `cd frontend && pnpm test:run`
Expected: 새 모듈을 찾지 못해 FAIL

- [ ] **Step 4: 구현**
- 이전 소개 화면과 서버 상태 표시는 지우고 라우터로 바꾼다
- 폼은 홈 위에 겹쳐 뜨는 패널(`role="dialog"`, `aria-label="새 갈피"`)로 띄운다. 네이티브 `<dialog>`는 jsdom 지원이 부족해서 쓰지 않는다
- `GalpiForm`의 제목·설명 입력에는 `maxLength`를 걸지 않는다. 앞뒤 공백이 붙은 입력을 받아야 하기 때문이다. 검증은 `validateGalpiInput`이 trim한 값으로 한다

- [ ] **Step 5: 검사 통과 확인**

Run: `cd frontend && pnpm lint && pnpm test:run && pnpm build`
Expected: 셋 모두 오류 없음

- [ ] **Step 6: 커밋**

```bash
git add frontend
git commit -F - <<'EOF'
feat: 프론트 라우팅과 갈피 홈 화면 추가

- react-router로 홈(/)과 갈피 상세(/galpis/:galpiId) 라우트 구성, 없는 경로 안내
- api/galpis.ts: 갈피 API 호출과 필드 오류를 담는 ApiError
- GalpiForm: 제목·설명 입력, 앞뒤 공백을 뺀 길이 검증, 서버 필드 오류 표시
- HomePage: 최근 본 갈피 최대 3개, 모든 갈피와 문장 수, 빈 상태, 새 갈피 만들기
- 저장 중 버튼 비활성화로 중복 생성 방지, 목록 불러오기 실패 시 다시 시도
- 기존 소개 화면과 서버 상태 표시 제거
EOF
```

---

### Task 5: 갈피 상세 화면과 전체 확인

**Files:**
- Create: `frontend/src/pages/GalpiDetailPage.tsx`, `frontend/src/pages/GalpiDetailPage.test.tsx`
- Modify: `frontend/src/App.tsx` (상세 라우트 연결)

**Interfaces:**
- Consumes: Task 4의 `getGalpi`, `updateGalpi`, `deleteGalpi`, `markGalpiViewed`, `GalpiForm`, `ApiError`, `mockFetch`

**화면 문구 (정확히 이대로)**
- 뒤로 가기 링크: `‹ 갈피 목록` (`/`로 이동)
- 메뉴 버튼: `편집`, `삭제`
- 삭제 확인(`window.confirm`): `문장 {n}개도 함께 삭제됩니다. 이 갈피를 삭제할까요?`. 문장이 0개면 `이 갈피를 삭제할까요?`
- 집중 보기 버튼 `집중해서 보기`. 문장이 0개면 비활성화하고 그 아래에 `문장을 먼저 추가해 보세요`
- 없음: `갈피를 찾을 수 없어요` + 링크 `홈으로`

- [ ] **Step 1: 실패하는 테스트 작성** (`MemoryRouter initialEntries={['/galpis/g1']}` + `Routes`)
- `showsGalpiAndMarksViewed`: 제목·설명 표시, `POST /api/galpis/g1/views`가 호출됨
- `disablesFocusWhenNoPhrases`: `phraseCount: 0` → `집중해서 보기`가 `disabled`, 안내 문구 표시
- `editsGalpi`: `편집` → 폼에 기존 값이 채워짐 → 제목 변경 → `저장` → PUT 본문 확인 → 바뀐 제목 표시
- `deletesAfterConfirmAndGoesHome`: `confirm`이 `true` → 확인 문구에 `문장 3개도 함께 삭제됩니다` 포함 → DELETE 호출 → `/`로 이동
- `keepsGalpiWhenDeleteCancelled`: `confirm`이 `false` → DELETE 호출 안 됨
- `showsNotFound`: GET이 404 → `갈피를 찾을 수 없어요`, `홈으로` 링크

- [ ] **Step 2: 실패 확인**

Run: `cd frontend && pnpm test:run`
Expected: `GalpiDetailPage` 모듈이 없어 FAIL

- [ ] **Step 3: 구현**

화면에 들어오면 `getGalpi`와 `markGalpiViewed`를 함께 호출한다. 보기 기록 호출이 실패해도 화면은 정상으로 보여 준다(기록은 부가 기능이다). 문장 목록 영역은 3단계에서 채우므로 지금은 안내 문구만 둔다.

- [ ] **Step 4: 프론트 검사**

Run: `cd frontend && pnpm lint && pnpm test:run && pnpm build`
Expected: 셋 모두 오류 없음

- [ ] **Step 5: 전체 확인**

Run: `./gradlew test && ./gradlew bootJar`
Expected: 둘 다 `BUILD SUCCESSFUL`, 테스트에 `SKIPPED` 없음

직접 실행해 확인: `docker compose up -d` → `java -jar build/libs/galpi-0.0.1-SNAPSHOT.jar` → 브라우저에서 `http://localhost:8080` 열기 → 갈피 생성 → 상세 진입 → 홈의 `최근에 본 갈피`에 나타남 → 편집 → 삭제. `/galpis/<id>` 경로에서 새로고침해도 상세 화면이 열림(SPA 폴백 확인)

- [ ] **Step 6: 커밋, 푸시, PR**

```bash
git add frontend
git commit -F - <<'EOF'
feat: 갈피 상세 화면 추가

- GalpiDetailPage: 제목·설명 표시, 들어올 때 최근 본 시각 기록
- 편집은 GalpiForm 재사용, 삭제는 문장 수를 알려 주는 확인 후 홈으로 이동
- 문장이 없으면 집중해서 보기 버튼 비활성화와 안내 문구
- 없는 갈피는 찾을 수 없음 안내와 홈으로 링크
EOF
git push -u origin feat/galpi-crud
gh pr create --base main --title "feat: 갈피 CRUD와 최근 본 갈피 (구현 2단계)" --body "<변경 요약과 확인 결과>"
gh pr checks --watch
```
Expected: `verify pass`
