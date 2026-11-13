# 도메인/JPA 분리 구현 계획 (구현 1단계)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `Galpi`, `Phrase`를 Spring/JPA에 의존하지 않는 순수 도메인 모델로 바꾸고, DB 매핑은 영속성 어댑터로 옮긴다. 명세에 필요한 도메인 변경(문장 갈피 이동, 정렬 설정, 최근 본 시각)과 V3 마이그레이션을 함께 넣는다.

**Architecture:** 기능별 패키지(`galpi`, `phrase`) 안에 `domain`(순수 모델) → `application.port.out`(저장소 인터페이스) → `adapter.out.persistence`(JPA 엔티티, Spring Data 리포지토리, 포트 구현)를 둔다. 의존 방향은 어댑터에서 안쪽으로만 향한다. ID와 생성·수정 시각은 도메인이 직접 정한다.

**Tech Stack:** Java 25, Spring Boot 4.1.1, Spring Data JPA (Hibernate, `ddl-auto: validate`), Flyway, PostgreSQL 18, JUnit 5, AssertJ, Testcontainers

**Spec:** `docs/superpowers/specs/2026-11-13-mvp-spec-design.md`, `ARCHITECTURE.md`

## Global Constraints

- `*.domain` 패키지는 `jakarta.*`, `org.springframework.*`를 import하지 않는다
- 기존 스키마 동작을 유지한다: UUID 기본 키, 제목 1~50자, 설명 0~200자(비면 `null`), 내용 1~500자, 출처 각 1~200자, **중복을 합친 뒤 10개까지**, 출처 입력 순서 유지, 갈피 삭제 시 문장·출처 연쇄 삭제
- 모든 문자열은 앞뒤 공백을 제거한 뒤 검증한다
- 검증에 실패하면 `IllegalArgumentException`을 던지고 객체 상태는 바뀌지 않는다
- `display_order` 컬럼은 남기고 항상 `0`으로 저장한다. 도메인에는 두지 않는다(명세 1장: 순서 직접 변경은 다음 버전)
- 정렬 값은 `OLDEST`(기본값), `NEWEST` 두 가지다
- 작업 브랜치: `refactor/hexagonal-domain`

## Review Focus

1. **시각 정밀도**: PostgreSQL은 마이크로초까지만 저장한다. 나노초가 있는 `Instant`를 저장했다 읽으면 값이 달라진다. 통합 테스트는 `Instant.parse("2026-11-13T10:00:00Z")` 같은 고정값을 쓴다 → Task 2 `savesAndRestoresAllFields`
2. **출처를 줄여서 수정**: 출처 3개를 1개로 바꾸면 `phrase_sources`에 옛 행이 남지 않아야 한다 → Task 3 `updateReplacesSourcesInOrder`
3. **없는 갈피로 문장 저장/이동**: DB 외래 키가 막아야 한다(`DataIntegrityViolationException`) → Task 3 `rejectsPhraseForUnknownGalpi`
4. **최근 본 시각 기록이 수정 시각을 바꾸면 안 됨**: 보기만 한 것은 수정이 아니다 → Task 1 `markViewedDoesNotTouchUpdatedAt`
5. **다시 저장할 때 행이 늘어나면 안 됨**: 도메인이 ID를 정하므로 두 번째 저장은 UPDATE여야 한다 → Task 2 `savingTwiceUpdatesSameRow`

---

### Task 1: 순수 도메인 모델

**Files:**
- Create: `src/main/java/com/galpi/common/domain/TextRules.java`
- Create: `src/main/java/com/galpi/galpi/domain/PhraseSort.java`
- Modify (전체 재작성): `src/main/java/com/galpi/galpi/domain/Galpi.java`
- Modify (전체 재작성): `src/main/java/com/galpi/phrase/domain/Phrase.java`
- Modify (전체 재작성): `src/test/java/com/galpi/galpi/domain/GalpiTest.java`, `src/test/java/com/galpi/phrase/domain/PhraseTest.java`
- Modify: `src/test/java/com/galpi/GalpiApplicationTests.java` (영속성 테스트 메서드 삭제, `contextLoadsWithPostgresAndFlyway`만 남김. 영속성 검증은 Task 2·3의 어댑터 테스트로 옮김)

**Interfaces:**
- Produces:
  - `TextRules.required(String value, int maxLength, String field): String`: trim 후 1~maxLength가 아니면 IAE
  - `TextRules.optional(String value, int maxLength, String field): String`: null이거나 공백이면 `null`, trim 후 maxLength 초과면 IAE
  - `enum PhraseSort { OLDEST, NEWEST }`
  - `Galpi.create(String title, String description, Instant now): Galpi`: 새 UUID, `PhraseSort.OLDEST`, `lastViewedAt = null`, `createdAt = updatedAt = now`
  - `Galpi.restore(UUID id, String title, String description, PhraseSort phraseSort, Instant lastViewedAt, Instant createdAt, Instant updatedAt): Galpi`: 같은 검증을 거친다
  - `Galpi#update(String title, String description, Instant now)`, `Galpi#changePhraseSort(PhraseSort sort, Instant now)`, `Galpi#markViewed(Instant now)`
  - 게터: `getId, getTitle, getDescription, getPhraseSort, getLastViewedAt, getCreatedAt, getUpdatedAt`
  - `Phrase.create(UUID galpiId, String content, List<String> sources, Instant now): Phrase`: 새 UUID, `favorite = false`
  - `Phrase.restore(UUID id, UUID galpiId, String content, List<String> sources, boolean favorite, Instant createdAt, Instant updatedAt): Phrase`
  - `Phrase#update(String content, List<String> sources, Instant now)`, `Phrase#moveTo(UUID galpiId, Instant now)`, `Phrase#changeFavorite(boolean favorite, Instant now)`
  - 게터: `getId, getGalpiId, getContent, getSources`(불변 리스트), `isFavorite, getCreatedAt, getUpdatedAt`
  - `null`인 id, galpiId, phraseSort, 시각 인자는 `NullPointerException`(`Objects.requireNonNull`)

- [ ] **Step 1: 브랜치 생성**

Run: `git checkout main && git pull && git checkout -b refactor/hexagonal-domain`

- [ ] **Step 2: 도메인 테스트 재작성 (실패하는 테스트)**

공통 고정 시각: `T0 = Instant.parse("2026-11-13T10:00:00Z")`, `T1 = T0.plusSeconds(60)`.

`GalpiTest`:
- 기존 3개 테스트를 새 API로 옮긴다: `normalizesOptionalDescriptionAndTitle`(`create("  공부  ", "   ", T0)` → 제목 `"공부"`, 설명 `null`), `invalidUpdateDoesNotChangeExistingValues`(`update("   ", "새 설명", T1)` → IAE, 제목·설명·`updatedAt == T0` 유지), `rejectsBlankAndOverlongTitle`(공백, `"가".repeat(51)` → IAE)
- `acceptsBoundaryLengths`: 제목 50자, 설명 200자 허용 / 설명 201자 IAE
- `createSetsDefaults`: `getPhraseSort() == OLDEST`, `getLastViewedAt() == null`, `getCreatedAt() == getUpdatedAt() == T0`, `getId() != null`
- `updateTouchesUpdatedAt`: `update("운동", null, T1)` → `getUpdatedAt() == T1`, `getCreatedAt() == T0`
- `changePhraseSortTouchesUpdatedAt`: `changePhraseSort(NEWEST, T1)` → 정렬 `NEWEST`, `updatedAt == T1`
- `markViewedDoesNotTouchUpdatedAt`: `markViewed(T1)` → `lastViewedAt == T1`, `updatedAt == T0`
- `restoreKeepsGivenValues`: 모든 필드가 넘긴 값 그대로

`PhraseTest` (공통 `GALPI_ID = UUID.randomUUID()`):
- 기존 5개 테스트를 새 API로 옮긴다. `rejectsInvalidSourcesWithoutChangingContent`는 `displayOrder` 단언을 빼고 `updatedAt == T0` 유지로 바꾼다
- `deduplicatesBeforeCountingSources`: 서로 다른 출처 10개 + 중복 1개(총 11개 입력) → 허용, 출처 10개
- `moveToChangesGalpi`: `moveTo(other, T1)` → `getGalpiId() == other`, `updatedAt == T1`
- `changeFavoriteTouchesUpdatedAt`: `changeFavorite(true, T1)` → `isFavorite()`, `updatedAt == T1`
- `rejectsNullGalpi`: `create(null, "문장", List.of(), T0)`, `moveTo(null, T1)` → NPE

- [ ] **Step 3: 테스트 실패 확인**

Run: `./gradlew test --tests 'com.galpi.*.domain.*'`
Expected: 컴파일 실패(`create`, `PhraseSort` 등 없음)

- [ ] **Step 4: `TextRules`, `PhraseSort`, `Galpi`, `Phrase` 구현**

- `Galpi`와 `Phrase`의 기존 `requiredText`/`optionalText` 복사본을 `TextRules`로 합친다
- 출처 정규화는 기존 `Phrase.normalizeSources` 로직(`LinkedHashSet`으로 중복 제거 후 10개 초과 검사)을 유지한다
- 길이 제한은 상수로 둔다: `Galpi.TITLE_MAX_LENGTH = 50`, `DESCRIPTION_MAX_LENGTH = 200`, `Phrase.CONTENT_MAX_LENGTH = 500`, `SOURCE_MAX_LENGTH = 200`, `MAX_SOURCES = 10`
- 상태 변경 메서드는 검증을 모두 끝낸 뒤에 필드를 대입한다(실패해도 상태가 바뀌지 않게)
- 생성자는 private로 두고 `create`/`restore`만 공개한다. JPA 어노테이션, `@PrePersist`, 빈 생성자, `displayOrder`는 모두 제거한다

- [ ] **Step 5: `GalpiApplicationTests` 정리**

`persistsOrderedSourcesAndDeletesChildrenWithGalpi`와 이 메서드만 쓰던 필드·import를 지운다. 이제 엔티티가 없으므로 Hibernate 검증할 대상도 없다.

- [ ] **Step 6: 전체 테스트 통과 확인**

Run: `./gradlew test`
Expected: `BUILD SUCCESSFUL`. `grep -rE "import (jakarta|org\.springframework)" src/main/java/com/galpi/*/domain` 결과가 비어 있음

- [ ] **Step 7: 커밋**

```bash
git add -A src
git commit -m "refactor: make galpi and phrase pure domain models"
```

---

### Task 2: V3 마이그레이션과 갈피 영속성 어댑터

**Files:**
- Create: `src/main/resources/db/migration/V3__add_galpi_view_and_sort.sql` (내용은 명세 6장 그대로)
- Create: `src/main/java/com/galpi/galpi/application/port/out/GalpiRepository.java`
- Create: `src/main/java/com/galpi/galpi/adapter/out/persistence/GalpiJpaEntity.java`
- Create: `src/main/java/com/galpi/galpi/adapter/out/persistence/GalpiJpaRepository.java`
- Create: `src/main/java/com/galpi/galpi/adapter/out/persistence/GalpiPersistenceAdapter.java`
- Create: `src/test/java/com/galpi/support/PostgresIntegrationTest.java`
- Create: `src/test/java/com/galpi/galpi/adapter/out/persistence/GalpiPersistenceAdapterTest.java`
- Modify: `src/test/java/com/galpi/GalpiApplicationTests.java` (Flyway 버전 기대값 `"2"` → `"3"`, 베이스 클래스 사용)

**Interfaces:**
- Consumes: Task 1의 `Galpi`, `PhraseSort`
- Produces:
  - `interface GalpiRepository { Galpi save(Galpi galpi); Optional<Galpi> findById(UUID id); }`
  - `GalpiJpaEntity`(package-private, `@Entity @Table(name = "galpis")`): `static GalpiJpaEntity fromDomain(Galpi)`, `Galpi toDomain()`
  - `GalpiPersistenceAdapter`(`@Component`, `implements GalpiRepository`)
  - `abstract class PostgresIntegrationTest`: `@SpringBootTest`, `@Testcontainers(disabledWithoutDocker = true)`, `static @Container @ServiceConnection PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18-alpine")`, `protected JdbcTemplate jdbc`(`@Autowired`), `@BeforeEach`에서 `DELETE FROM galpis`

- [ ] **Step 1: 실패하는 통합 테스트 작성**

`GalpiPersistenceAdapterTest extends PostgresIntegrationTest`, `@Autowired GalpiRepository repository`. 테스트 클래스에 `@Transactional`을 붙이지 않는다(실제 DB 왕복을 검증하기 위해).
- `savesAndRestoresAllFields`: `create("클라이밍", "운동 전에", T0)` → `changePhraseSort(NEWEST, T1)` → `markViewed(T1)` → 저장 → `findById`의 모든 필드가 원래 객체와 같음
- `newGalpiUsesSchemaDefaults`: 새 갈피 저장 후 `jdbc`로 `phrase_sort = 'OLDEST'`, `last_viewed_at IS NULL`, `display_order = 0`
- `savingTwiceUpdatesSameRow`: 저장 → `update("공부", null, T1)` → 다시 저장 → `SELECT count(*) FROM galpis == 1`, 조회한 제목 `"공부"`, 설명 `null`
- `findByIdReturnsEmptyForUnknownId`: `findById(UUID.randomUUID())` → `isEmpty()`
- `databaseRejectsUnknownPhraseSort`: `jdbc`로 `phrase_sort = 'RANDOM'` INSERT → `DataIntegrityViolationException`

`GalpiApplicationTests`는 `PostgresIntegrationTest`를 상속하도록 바꾸고 Flyway 버전 `"3"`을 기대한다.

- [ ] **Step 2: 실패 확인**

Run: `./gradlew compileTestJava`
Expected: 컴파일 실패(`GalpiRepository` 없음)

- [ ] **Step 3: V3 마이그레이션, 포트, 엔티티, 리포지토리, 어댑터 구현**

- 엔티티: `@Id UUID id`(`@GeneratedValue` 없음, 도메인이 정한 값), `title`(length 50), `description`(length 200), `@Enumerated(EnumType.STRING) @Column(name = "phrase_sort", length = 10) phraseSort`, `last_viewed_at`, `display_order`(항상 0), `created_at`, `updated_at`. 시각 필드는 `Instant`
- `GalpiJpaRepository extends JpaRepository<GalpiJpaEntity, UUID>`
- 어댑터 `save`는 `repository.save(GalpiJpaEntity.fromDomain(galpi)).toDomain()`. ID가 이미 있으므로 Spring Data가 merge로 처리하고, 두 번째 저장은 UPDATE가 된다
- 어댑터 `findById`에는 `@Transactional(readOnly = true)`를 붙인다

- [ ] **Step 4: 테스트 실행**

Run: `./gradlew test`
Expected: `BUILD SUCCESSFUL`. Docker가 없으면 통합 테스트는 `SKIPPED`로 출력된다. 이 경우 Step 6의 CI 확인이 필수다

- [ ] **Step 5: 커밋**

```bash
git add -A src
git commit -m "feat: add galpi persistence adapter and V3 migration"
```

- [ ] **Step 6: CI에서 통합 테스트 확인 (로컬에 Docker가 없을 때)**

Run: `git push -u origin refactor/hexagonal-domain`, 아직 PR이 없으면 `gh pr create --draft --base main --title "refactor: separate domain from JPA"`, 이어서 `gh pr checks --watch`
Expected: `verify pass`. `gh run view <id> --log | grep SKIPPED` 결과 없음

---

### Task 3: 문장 영속성 어댑터와 문서 갱신

**Files:**
- Create: `src/main/java/com/galpi/phrase/application/port/out/PhraseRepository.java`
- Create: `src/main/java/com/galpi/phrase/adapter/out/persistence/PhraseJpaEntity.java`
- Create: `src/main/java/com/galpi/phrase/adapter/out/persistence/PhraseJpaRepository.java`
- Create: `src/main/java/com/galpi/phrase/adapter/out/persistence/PhrasePersistenceAdapter.java`
- Create: `src/test/java/com/galpi/phrase/adapter/out/persistence/PhrasePersistenceAdapterTest.java`
- Modify: `ARCHITECTURE.md` ("현재 상태와 다음 단계" 절)

**Interfaces:**
- Consumes: Task 1의 `Phrase`, Task 2의 `GalpiRepository`, `PostgresIntegrationTest`
- Produces:
  - `interface PhraseRepository { Phrase save(Phrase phrase); Optional<Phrase> findById(UUID id); }`
  - `PhraseJpaEntity`(package-private, `@Entity @Table(name = "phrases")`): `static PhraseJpaEntity fromDomain(Phrase)`, `Phrase toDomain()`
  - `PhrasePersistenceAdapter`(`@Component`, `implements PhraseRepository`)

- [ ] **Step 1: 실패하는 통합 테스트 작성**

`PhrasePersistenceAdapterTest extends PostgresIntegrationTest`. `@BeforeEach`에서 `GalpiRepository`로 갈피 A, B를 저장한다.
- `persistsOrderedSourcesAndFavorite`: 출처 `List.of("수업", "영상")`, `changeFavorite(true, T1)` → 저장 → 조회 결과 출처 `containsExactly("수업", "영상")`, `isFavorite()`, 시각이 원래 값과 같음
- `updateReplacesSourcesInOrder`: 출처 `("a", "b", "c")`로 저장 → `update("문장", List.of("c"), T1)` → 저장 → 조회 출처 `containsExactly("c")`, `jdbc`로 `phrase_sources` 행 수 1
- `moveToPersistsNewGalpi`: A에 저장 → `moveTo(B.getId(), T1)` → 저장 → 조회 `getGalpiId() == B.getId()`
- `deletingGalpiDeletesPhrasesAndSources`: `jdbc.update("DELETE FROM galpis WHERE id = ?", A.getId())` → 해당 문장의 `phrases`, `phrase_sources` 행 수가 0 (기존 `GalpiApplicationTests`에 있던 검증을 옮긴 것)
- `rejectsPhraseForUnknownGalpi`: `Phrase.create(UUID.randomUUID(), ...)` 저장 → `DataIntegrityViolationException`

- [ ] **Step 2: 실패 확인**

Run: `./gradlew compileTestJava`
Expected: 컴파일 실패(`PhraseRepository` 없음)

- [ ] **Step 3: 포트, 엔티티, 리포지토리, 어댑터 구현**

- 엔티티: `@Id UUID id`, `@Column(name = "galpi_id", nullable = false) UUID galpiId`(`@ManyToOne` 대신 ID만 둔다. 연쇄 삭제는 DB 외래 키가 처리한다), `content`(length 500), `favorite`, `display_order`(항상 0), `created_at`, `updated_at`
- 출처 매핑은 기존 것을 그대로 쓴다: `@ElementCollection @CollectionTable(name = "phrase_sources", joinColumns = @JoinColumn(name = "phrase_id")) @OrderColumn(name = "source_order") @Column(name = "source", length = 200) List<String> sources`
- 어댑터의 `save`, `findById`에 `@Transactional`을 붙인다(`findById`는 `readOnly = true`). 지연 로딩되는 출처를 트랜잭션 안에서 도메인으로 변환해야 하기 때문이다

- [ ] **Step 4: `ARCHITECTURE.md` 갱신**

"현재 상태와 다음 단계" 절을 다음 내용으로 바꾼다.
- 도메인과 JPA 분리 완료
- 패키지 구조 `<기능>/domain`, `<기능>/application/port/out`, `<기능>/adapter/out/persistence`
- 다음 단계는 유스케이스(입력 포트)와 REST 컨트롤러

- [ ] **Step 5: 테스트 실행**

Run: `./gradlew test`
Expected: `BUILD SUCCESSFUL`

- [ ] **Step 6: 커밋, 푸시, CI 확인**

```bash
git add -A src ARCHITECTURE.md
git commit -m "feat: add phrase persistence adapter"
git push
gh pr checks --watch
```
Expected: `verify pass`. 로그에 `SKIPPED` 없음. 그 뒤 `gh pr ready`
