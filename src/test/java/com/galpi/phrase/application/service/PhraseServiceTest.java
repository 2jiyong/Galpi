package com.galpi.phrase.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.galpi.galpi.application.GalpiNotFoundException;
import com.galpi.galpi.application.service.InMemoryGalpiRepository;
import com.galpi.galpi.domain.Galpi;
import com.galpi.galpi.domain.PhraseSort;
import com.galpi.phrase.application.PhraseNotFoundException;
import com.galpi.phrase.domain.Phrase;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class PhraseServiceTest {

    private static final Instant T0 = Instant.parse("2026-11-13T10:00:00Z");
    private static final Instant T1 = T0.plusSeconds(60);

    private final InMemoryGalpiRepository galpis = new InMemoryGalpiRepository();
    private final InMemoryPhraseRepository phrases = new InMemoryPhraseRepository();
    private final PhraseService service = new PhraseService(phrases, galpis, Clock.fixed(T1, ZoneOffset.UTC));

    private final Galpi climbing = galpis.save(Galpi.create("클라이밍", null, T0));
    private final Galpi study = galpis.save(Galpi.create("공부", null, T0));

    private Phrase existing(String content, Instant createdAt, boolean favorite) {
        Phrase phrase = Phrase.restore(UUID.randomUUID(), climbing.getId(), content, List.of(), favorite,
                createdAt, createdAt);
        return phrases.save(phrase);
    }

    @Test
    void listSortsFavoritesFirstUsingGalpiSetting() {
        existing("오래된", T0, false);
        existing("최신", T0.plusSeconds(20), false);
        existing("즐겨찾기", T0.plusSeconds(10), true);
        phrases.save(Phrase.create(study.getId(), "다른 갈피", List.of(), T0));

        assertThat(service.listPhrases(climbing.getId())).extracting(Phrase::getContent)
                .containsExactly("즐겨찾기", "오래된", "최신");

        climbing.changePhraseSort(PhraseSort.NEWEST, T1);
        galpis.save(climbing);
        assertThat(service.listPhrases(climbing.getId())).extracting(Phrase::getContent)
                .containsExactly("즐겨찾기", "최신", "오래된");
    }

    @Test
    void listThrowsWhenGalpiMissing() {
        assertThatThrownBy(() -> service.listPhrases(UUID.randomUUID()))
                .isInstanceOf(GalpiNotFoundException.class);
    }

    @Test
    void createSavesWithClock() {
        Phrase created = service.createPhrase(climbing.getId(), "  발부터 보기 ", List.of("수업"));

        assertThat(created.getContent()).isEqualTo("발부터 보기");
        assertThat(created.getCreatedAt()).isEqualTo(T1);
        assertThat(phrases.findById(created.getId())).isPresent();
    }

    @Test
    void createThrowsWhenGalpiMissing() {
        assertThatThrownBy(() -> service.createPhrase(UUID.randomUUID(), "문장", List.of()))
                .isInstanceOf(GalpiNotFoundException.class);
    }

    @Test
    void updateChangesContentAndMoves() {
        Phrase phrase = existing("원래", T0, false);

        Phrase updated = service.updatePhrase(phrase.getId(), "바뀜", List.of("책"), study.getId());

        assertThat(updated.getGalpiId()).isEqualTo(study.getId());
        Phrase stored = phrases.findById(phrase.getId()).orElseThrow();
        assertThat(stored.getContent()).isEqualTo("바뀜");
        assertThat(stored.getSources()).containsExactly("책");
        assertThat(stored.getGalpiId()).isEqualTo(study.getId());
        assertThat(stored.getUpdatedAt()).isEqualTo(T1);
    }

    @Test
    void updateWithoutGalpiKeepsCurrentGalpi() {
        Phrase phrase = existing("원래", T0, false);

        service.updatePhrase(phrase.getId(), "바뀜", List.of(), null);

        assertThat(phrases.findById(phrase.getId()).orElseThrow().getGalpiId()).isEqualTo(climbing.getId());
    }

    @Test
    void updateToUnknownGalpiThrowsNotFound() {
        Phrase phrase = existing("원래", T0, false);

        assertThatThrownBy(() -> service.updatePhrase(phrase.getId(), "바뀜", List.of(), UUID.randomUUID()))
                .isInstanceOf(GalpiNotFoundException.class);
        Phrase stored = phrases.findById(phrase.getId()).orElseThrow();
        assertThat(stored.getContent()).isEqualTo("원래");
        assertThat(stored.getGalpiId()).isEqualTo(climbing.getId());
    }

    @Test
    void updateThrowsWhenPhraseMissing() {
        assertThatThrownBy(() -> service.updatePhrase(UUID.randomUUID(), "문장", List.of(), null))
                .isInstanceOf(PhraseNotFoundException.class);
    }

    @Test
    void deleteRemovesPhrase() {
        Phrase phrase = existing("문장", T0, false);

        service.deletePhrase(phrase.getId());

        assertThat(phrases.findById(phrase.getId())).isEmpty();
    }

    @Test
    void deleteThrowsWhenMissing() {
        assertThatThrownBy(() -> service.deletePhrase(UUID.randomUUID()))
                .isInstanceOf(PhraseNotFoundException.class);
    }

    @Test
    void changeFavoriteSaves() {
        Phrase phrase = existing("문장", T0, false);

        Phrase changed = service.changeFavorite(phrase.getId(), true);

        assertThat(changed.isFavorite()).isTrue();
        assertThat(phrases.findById(phrase.getId()).orElseThrow().isFavorite()).isTrue();
    }

    @Test
    void changeFavoriteThrowsWhenMissing() {
        assertThatThrownBy(() -> service.changeFavorite(UUID.randomUUID(), true))
                .isInstanceOf(PhraseNotFoundException.class);
    }
}
