# 백엔드 아키텍처

Galpi 백엔드는 **헥사고날 아키텍처(Ports and Adapters)**를 기준으로 개발한다. 기능은 `galpi`, `phrase` 등 도메인별로 묶고, 각 기능 안에서 다음 경계를 지킨다.

```text
HTTP 요청 → 입력 어댑터 → 입력 포트/유스케이스 → 도메인
                                    ↓
                               출력 포트
                                    ↓
                         JPA 영속성 어댑터 → PostgreSQL
```

## 계층별 책임

- **도메인**: `Galpi`, `Phrase`의 상태와 규칙. Spring, JPA, HTTP에 의존하지 않는다.
- **애플리케이션**: 갈피 생성·수정, 문장 저장·조회 등의 유스케이스와 트랜잭션 경계. 저장이나 외부 조회가 필요하면 출력 포트를 사용한다.
- **입력 포트 및 어댑터**: 유스케이스 인터페이스는 안쪽에 두고, REST 컨트롤러는 요청 검증·DTO 변환·응답과 오류 코드를 담당한다.
- **출력 포트 및 어댑터**: 저장소 인터페이스는 안쪽에 두고, JPA 엔티티·Spring Data Repository·도메인 변환은 영속성 어댑터에 둔다.

의존성은 바깥에서 안으로 향한다. 도메인과 유스케이스는 컨트롤러, JPA 엔티티, Spring Data Repository를 직접 참조하지 않는다. HTTP DTO와 DB 모델은 도메인 모델과 별개로 유지한다.

## 현재 상태와 다음 단계

도메인과 JPA 분리를 마쳤다. `Galpi`, `Phrase`는 Spring·JPA에 의존하지 않는 순수 도메인 모델이며, ID와 생성·수정 시각을 도메인이 직접 정한다. JPA 엔티티와 도메인 변환은 영속성 어댑터에 있다.

기능별 패키지 구조는 다음과 같다.

```text
com.galpi.<기능>/
├── domain/                        # 순수 도메인 모델과 규칙
├── application/port/in/           # 유스케이스 (입력 포트)
├── application/port/out/          # 저장소 등 출력 포트 (인터페이스)
├── application/service/           # 유스케이스 구현, 트랜잭션 경계
├── adapter/in/web/                # REST 컨트롤러와 요청·응답 형식
└── adapter/out/persistence/       # JPA 엔티티, Spring Data 리포지토리, 출력 포트 구현
```

공통 문자열 검증은 `com.galpi.common.domain.TextRules`에 있다. 문장은 갈피를 객체가 아니라 `galpiId`로만 참조하며, 갈피 삭제 시 연쇄 삭제는 DB 외래 키가 처리한다.

- 문장 표시 순서(즐겨찾기 먼저 → 갈피의 정렬 설정에 따른 만든 시각 → id)는 도메인 규칙 `PhraseOrder`에 있다
- 문장 서비스는 갈피 존재 확인과 정렬 설정을 갈피 기능의 출력 포트 `GalpiRepository`로 읽는다
- 404 예외는 `common.application.ResourceNotFoundException`을 상속하고, 공통 예외 처리기는 이 부모 하나만 안다

갈피 CRUD(최근 본 갈피 포함)와 문장 CRUD·정렬·즐겨찾기를 화면까지 마쳤다. 다음 단계는 집중 보기와 홈의 무작위 문장이다.
