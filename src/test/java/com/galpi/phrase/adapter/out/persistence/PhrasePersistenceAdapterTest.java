package com.galpi.phrase.adapter.out.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.galpi.galpi.application.port.out.GalpiRepository;
import com.galpi.galpi.domain.Galpi;
import com.galpi.phrase.application.port.out.PhraseRepository;
import com.galpi.phrase.domain.Phrase;
import com.galpi.support.PostgresIntegrationTest;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

class PhrasePersistenceAdapterTest extends PostgresIntegrationTest {

    private static final Instant T0 = Instant.parse("2026-11-13T10:00:00Z");
    private static final Instant T1 = T0.plusSeconds(60);

    @Autowired
    private GalpiRepository galpiRepository;

    @Autowired
    private PhraseRepository repository;

    private Galpi galpiA;
    private Galpi galpiB;

    @BeforeEach
    void saveGalpis() {
        galpiA = galpiRepository.save(Galpi.create("클라이밍", null, T0));
        galpiB = galpiRepository.save(Galpi.create("공부", null, T0));
    }

    @Test
    void persistsOrderedSourcesAndFavorite() {
        Phrase phrase = Phrase.create(galpiA.getId(), "발부터 확인하기", List.of("수업", "영상"), T0);
        phrase.changeFavorite(true, T1);

        repository.save(phrase);
        Phrase found = repository.findById(phrase.getId()).orElseThrow();

        assertThat(found.getGalpiId()).isEqualTo(galpiA.getId());
        assertThat(found.getContent()).isEqualTo("발부터 확인하기");
        assertThat(found.getSources()).containsExactly("수업", "영상");
        assertThat(found.isFavorite()).isTrue();
        assertThat(found.getCreatedAt()).isEqualTo(T0);
        assertThat(found.getUpdatedAt()).isEqualTo(T1);
    }

    @Test
    void updateReplacesSourcesInOrder() {
        Phrase phrase = repository.save(Phrase.create(galpiA.getId(), "문장", List.of("a", "b", "c"), T0));
        phrase.update("문장", List.of("c"), T1);

        repository.save(phrase);

        assertThat(repository.findById(phrase.getId()).orElseThrow().getSources()).containsExactly("c");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM phrase_sources WHERE phrase_id = ?", Long.class,
                phrase.getId())).isEqualTo(1);
    }

    @Test
    void moveToPersistsNewGalpi() {
        Phrase phrase = repository.save(Phrase.create(galpiA.getId(), "문장", List.of(), T0));
        phrase.moveTo(galpiB.getId(), T1);

        repository.save(phrase);

        assertThat(repository.findById(phrase.getId()).orElseThrow().getGalpiId()).isEqualTo(galpiB.getId());
    }

    @Test
    void deletingGalpiDeletesPhrasesAndSources() {
        Phrase phrase = repository.save(Phrase.create(galpiA.getId(), "문장", List.of("수업"), T0));

        jdbc.update("DELETE FROM galpis WHERE id = ?", galpiA.getId());

        assertThat(jdbc.queryForObject("SELECT count(*) FROM phrases WHERE id = ?", Long.class, phrase.getId()))
                .isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM phrase_sources WHERE phrase_id = ?", Long.class,
                phrase.getId())).isZero();
    }

    @Test
    void rejectsPhraseForUnknownGalpi() {
        Phrase phrase = Phrase.create(UUID.randomUUID(), "문장", List.of(), T0);

        assertThatThrownBy(() -> repository.save(phrase))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
