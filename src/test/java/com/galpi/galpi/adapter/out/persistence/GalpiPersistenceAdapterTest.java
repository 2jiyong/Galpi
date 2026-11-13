package com.galpi.galpi.adapter.out.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.galpi.galpi.application.port.out.GalpiRepository;
import com.galpi.galpi.domain.Galpi;
import com.galpi.galpi.domain.PhraseSort;
import com.galpi.support.PostgresIntegrationTest;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

class GalpiPersistenceAdapterTest extends PostgresIntegrationTest {

    private static final Instant T0 = Instant.parse("2026-11-13T10:00:00Z");
    private static final Instant T1 = T0.plusSeconds(60);

    @Autowired
    private GalpiRepository repository;

    @Test
    void savesAndRestoresAllFields() {
        Galpi galpi = Galpi.create("클라이밍", "운동 전에", T0);
        galpi.changePhraseSort(PhraseSort.NEWEST, T1);
        galpi.markViewed(T1);

        repository.save(galpi);
        Galpi found = repository.findById(galpi.getId()).orElseThrow();

        assertThat(found.getId()).isEqualTo(galpi.getId());
        assertThat(found.getTitle()).isEqualTo("클라이밍");
        assertThat(found.getDescription()).isEqualTo("운동 전에");
        assertThat(found.getPhraseSort()).isEqualTo(PhraseSort.NEWEST);
        assertThat(found.getLastViewedAt()).isEqualTo(T1);
        assertThat(found.getCreatedAt()).isEqualTo(T0);
        assertThat(found.getUpdatedAt()).isEqualTo(T1);
    }

    @Test
    void newGalpiUsesSchemaDefaults() {
        Galpi galpi = repository.save(Galpi.create("공부", null, T0));

        Map<String, Object> row = jdbc.queryForMap(
                "SELECT phrase_sort, last_viewed_at, display_order FROM galpis WHERE id = ?", galpi.getId());

        assertThat(row.get("phrase_sort")).isEqualTo("OLDEST");
        assertThat(row.get("last_viewed_at")).isNull();
        assertThat(row.get("display_order")).isEqualTo(0);
    }

    @Test
    void savingTwiceUpdatesSameRow() {
        Galpi galpi = repository.save(Galpi.create("운동", "설명", T0));
        galpi.update("공부", null, T1);

        repository.save(galpi);

        assertThat(jdbc.queryForObject("SELECT count(*) FROM galpis", Long.class)).isEqualTo(1);
        Galpi found = repository.findById(galpi.getId()).orElseThrow();
        assertThat(found.getTitle()).isEqualTo("공부");
        assertThat(found.getDescription()).isNull();
    }

    @Test
    void findByIdReturnsEmptyForUnknownId() {
        assertThat(repository.findById(UUID.randomUUID())).isEmpty();
    }

    @Test
    void databaseRejectsUnknownPhraseSort() {
        assertThatThrownBy(() -> jdbc.update("""
                INSERT INTO galpis (id, title, phrase_sort, created_at, updated_at)
                VALUES (?, '공부', 'RANDOM', now(), now())
                """, UUID.randomUUID()))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
