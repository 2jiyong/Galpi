# 갈피

마음의 방향을 잃거나 중요한 요령이 떠오르지 않을 때, 미리 기록해 둔 문장을 꺼내 보며 다시 갈피를 잡는 앱입니다.

상세한 제품 기획은 [PROJECT_PLAN.md](./PROJECT_PLAN.md)에서 확인할 수 있습니다.

백엔드는 **헥사고날 아키텍처**를 기준으로 개발합니다. 도메인과 유스케이스를 중심에 두고, HTTP와 PostgreSQL/JPA는 어댑터로 분리합니다. 의존성 방향과 현재 코드에서 분리할 부분은 [ARCHITECTURE.md](./ARCHITECTURE.md)에 명시했습니다.

## 기술 스택

- Backend: Java 25, Spring Boot 4.1.1, Gradle 9.2.1
- Frontend: React 19.3, TypeScript, Vite, Tailwind CSS
- Database: PostgreSQL 18, Flyway
- API docs: springdoc-openapi
- Test: JUnit, MockMvc, Testcontainers, Vitest, React Testing Library

## 사전 준비

- Java 25
- Node.js 24.19.0
- pnpm 11.25.0
- Docker 및 Docker Compose

저장소의 `.java-version`, `.nvmrc`, `frontend/package.json`에 기준 버전이 명시되어 있습니다.

## 로컬 개발

### 1. PostgreSQL 실행

```bash
docker compose up -d
```

기본 접속 정보는 다음과 같습니다.

| 항목 | 기본값 | 환경변수 |
| --- | --- | --- |
| Host | `localhost` | `DB_HOST` |
| Port | `5432` | `DB_PORT` |
| Database | `galpi` | `DB_NAME` |
| Username | `galpi` | `DB_USERNAME` |
| Password | `galpi` | `DB_PASSWORD` |

필요하면 `.env.example`을 참고해 로컬 환경변수를 설정합니다. 실제 비밀번호가 포함된 `.env` 파일은 Git에서 제외됩니다.

### 2. 백엔드 실행

```bash
./gradlew bootRun
```

백엔드는 `http://localhost:8080`에서 실행됩니다.

### 3. 프론트엔드 실행

```bash
cd frontend
pnpm install
pnpm dev
```

프론트엔드는 `http://localhost:5173`에서 실행되며 `/api` 요청을 백엔드로 전달합니다.

## API 및 운영 상태

- 애플리케이션 상태: `GET http://localhost:8080/api/health`
- Actuator 상태: `GET http://localhost:8080/actuator/health`
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`

## 테스트와 검사

백엔드 테스트:

```bash
./gradlew test
```

Docker가 실행 중이면 Testcontainers가 PostgreSQL과 Flyway 통합 테스트를 수행합니다. Docker를 사용할 수 없으면 해당 통합 테스트만 건너뜁니다.

프론트엔드 검사:

```bash
cd frontend
pnpm lint
pnpm test:run
pnpm build
```

## 통합 빌드

```bash
./gradlew bootJar
java -jar build/libs/galpi-0.0.1-SNAPSHOT.jar
```

`bootJar`는 프론트엔드 의존성 설치와 프로덕션 빌드를 실행하고, 결과를 Spring Boot JAR의 정적 리소스에 포함합니다. 운영에서는 하나의 JAR로 API와 React 화면을 함께 제공합니다.

## 프로젝트 구조

```text
.
├── frontend/                   # React 애플리케이션
├── src/main/java/com/galpi/   # Spring Boot 소스
├── src/main/resources/        # 설정과 Flyway 마이그레이션
├── src/test/                  # 백엔드 테스트
├── compose.yaml               # 로컬 PostgreSQL
└── .github/workflows/ci.yml   # CI 검사와 통합 빌드
```
