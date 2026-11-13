## Commit messages

- Write commit messages in Korean. Keep the conventional prefix in English (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `build:`, `chore:`).
- Under the one-line subject, add a detailed body: list which files or features changed, what changed, and why, one item per line.
- Never include anything security-sensitive (passwords, tokens, keys, internal addresses).

Example:

```text
feat: 문장 영속성 어댑터 추가

- PhraseJpaEntity: phrases, phrase_sources 테이블 매핑과 도메인 변환 추가
- PhrasePersistenceAdapter: PhraseRepository 포트 구현
- 출처 순서 유지와 갈피 삭제 시 연쇄 삭제를 통합 테스트로 검증
```

Pull request titles and descriptions follow the same rules.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
