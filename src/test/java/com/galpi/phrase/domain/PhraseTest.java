package com.galpi.phrase.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class PhraseTest {

    private static final Instant T0 = Instant.parse("2026-11-13T10:00:00Z");
    private static final Instant T1 = T0.plusSeconds(60);
    private static final UUID GALPI_ID = UUID.randomUUID();

    @Test
    void normalizesSourcesWhilePreservingOrder() {
        Phrase phrase = Phrase.create(GALPI_ID, "  발을 먼저 보기  ",
                List.of("  수업  ", "영상", "수업"), T0);

        assertThat(phrase.getContent()).isEqualTo("발을 먼저 보기");
        assertThat(phrase.getSources()).containsExactly("수업", "영상");
        assertThatThrownBy(() -> phrase.getSources().add("새 출처"))
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void allowsNoSourcesAndDefaultsToNotFavorite() {
        Phrase phrase = Phrase.create(GALPI_ID, "팔보다 다리로", null, T0);

        assertThat(phrase.getId()).isNotNull();
        assertThat(phrase.getGalpiId()).isEqualTo(GALPI_ID);
        assertThat(phrase.getSources()).isEmpty();
        assertThat(phrase.isFavorite()).isFalse();
        assertThat(phrase.getCreatedAt()).isEqualTo(T0);
        assertThat(phrase.getUpdatedAt()).isEqualTo(T0);
    }

    @Test
    void rejectsInvalidSourcesWithoutChangingContent() {
        Phrase phrase = Phrase.create(GALPI_ID, "원래 문장", List.of("원래 출처"), T0);

        assertThatThrownBy(() -> phrase.update("바뀐 문장", List.of(" "), T1))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(phrase.getContent()).isEqualTo("원래 문장");
        assertThat(phrase.getSources()).containsExactly("원래 출처");
        assertThat(phrase.getUpdatedAt()).isEqualTo(T0);
    }

    @Test
    void rejectsMoreThanTenDistinctSources() {
        List<String> sources = IntStream.range(0, 11)
                .mapToObj(index -> "출처 " + index)
                .toList();

        assertThatThrownBy(() -> Phrase.create(GALPI_ID, "문장", sources, T0))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void deduplicatesBeforeCountingSources() {
        List<String> sources = new ArrayList<>(IntStream.range(0, 10)
                .mapToObj(index -> "출처 " + index)
                .toList());
        sources.add("출처 0");

        Phrase phrase = Phrase.create(GALPI_ID, "문장", sources, T0);

        assertThat(phrase.getSources()).hasSize(10);
    }

    @Test
    void rejectsOverlongContentAndSource() {
        assertThatThrownBy(() -> Phrase.create(GALPI_ID, "가".repeat(501), List.of(), T0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> Phrase.create(GALPI_ID, "문장", List.of("가".repeat(201)), T0))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void updateReplacesContentAndSources() {
        Phrase phrase = Phrase.create(GALPI_ID, "원래 문장", List.of("a", "b"), T0);

        phrase.update("바뀐 문장", List.of("c"), T1);

        assertThat(phrase.getContent()).isEqualTo("바뀐 문장");
        assertThat(phrase.getSources()).containsExactly("c");
        assertThat(phrase.getUpdatedAt()).isEqualTo(T1);
    }

    @Test
    void moveToChangesGalpi() {
        Phrase phrase = Phrase.create(GALPI_ID, "문장", List.of(), T0);
        UUID other = UUID.randomUUID();

        phrase.moveTo(other, T1);

        assertThat(phrase.getGalpiId()).isEqualTo(other);
        assertThat(phrase.getUpdatedAt()).isEqualTo(T1);
    }

    @Test
    void changeFavoriteTouchesUpdatedAt() {
        Phrase phrase = Phrase.create(GALPI_ID, "문장", List.of(), T0);

        phrase.changeFavorite(true, T1);

        assertThat(phrase.isFavorite()).isTrue();
        assertThat(phrase.getUpdatedAt()).isEqualTo(T1);
    }

    @Test
    void rejectsNullGalpi() {
        assertThatThrownBy(() -> Phrase.create(null, "문장", List.of(), T0))
                .isInstanceOf(NullPointerException.class);

        Phrase phrase = Phrase.create(GALPI_ID, "문장", List.of(), T0);
        assertThatThrownBy(() -> phrase.moveTo(null, T1))
                .isInstanceOf(NullPointerException.class);
        assertThat(phrase.getGalpiId()).isEqualTo(GALPI_ID);
    }

    @Test
    void restoreKeepsGivenValues() {
        UUID id = UUID.randomUUID();

        Phrase phrase = Phrase.restore(id, GALPI_ID, "문장", List.of("수업"), true, T0, T1);

        assertThat(phrase.getId()).isEqualTo(id);
        assertThat(phrase.getGalpiId()).isEqualTo(GALPI_ID);
        assertThat(phrase.getContent()).isEqualTo("문장");
        assertThat(phrase.getSources()).containsExactly("수업");
        assertThat(phrase.isFavorite()).isTrue();
        assertThat(phrase.getCreatedAt()).isEqualTo(T0);
        assertThat(phrase.getUpdatedAt()).isEqualTo(T1);
    }
}
