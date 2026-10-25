package com.galpi;

import static org.assertj.core.api.Assertions.assertThat;

import com.galpi.galpi.domain.Galpi;
import com.galpi.phrase.domain.Phrase;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
class GalpiApplicationTests {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18-alpine");

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private Flyway flyway;

    @Test
    void contextLoadsWithPostgresAndFlyway() {
        assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("2");
    }

    @Test
    @Transactional
    void persistsOrderedSourcesAndDeletesChildrenWithGalpi() {
        Galpi galpi = new Galpi("클라이밍", "운동 전에 보기", 0);
        entityManager.persist(galpi);
        Phrase phrase = new Phrase(galpi, "발부터 확인하기", List.of("수업", "영상"), 0);
        entityManager.persist(phrase);
        entityManager.flush();

        UUID galpiId = galpi.getId();
        UUID phraseId = phrase.getId();
        entityManager.clear();

        Phrase saved = entityManager.find(Phrase.class, phraseId);
        assertThat(saved.getSources()).containsExactly("수업", "영상");
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isNotNull();

        entityManager.clear();
        jdbcTemplate.update("DELETE FROM galpis WHERE id = ?", galpiId);
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM phrases WHERE id = ?", Long.class, phraseId))
                .isZero();
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM phrase_sources WHERE phrase_id = ?", Long.class,
                phraseId)).isZero();
    }
}
