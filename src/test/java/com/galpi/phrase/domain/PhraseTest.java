package com.galpi.phrase.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.galpi.galpi.domain.Galpi;
import java.util.List;
import org.junit.jupiter.api.Test;

class PhraseTest {

    private final Galpi galpi = new Galpi("클라이밍", null, 0);

    @Test
    void normalizesSourcesWhilePreservingOrder() {
        Phrase phrase = new Phrase(galpi, "  발을 먼저 보기  ",
                List.of("  수업  ", "영상", "수업"), 0);

        assertThat(phrase.getContent()).isEqualTo("발을 먼저 보기");
        assertThat(phrase.getSources()).containsExactly("수업", "영상");
        assertThatThrownBy(() -> phrase.getSources().add("새 출처"))
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void allowsNoSourcesAndDefaultsToNotFavorite() {
        Phrase phrase = new Phrase(galpi, "팔보다 다리로", null, 0);

        assertThat(phrase.getSources()).isEmpty();
        assertThat(phrase.isFavorite()).isFalse();
    }

    @Test
    void rejectsInvalidSourcesWithoutChangingContent() {
        Phrase phrase = new Phrase(galpi, "원래 문장", List.of("원래 출처"), 0);

        assertThatThrownBy(() -> phrase.update("바뀐 문장", List.of(" "), 1))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(phrase.getContent()).isEqualTo("원래 문장");
        assertThat(phrase.getSources()).containsExactly("원래 출처");
        assertThat(phrase.getDisplayOrder()).isZero();
    }

    @Test
    void rejectsMoreThanTenDistinctSources() {
        List<String> sources = java.util.stream.IntStream.range(0, 11)
                .mapToObj(index -> "출처 " + index)
                .toList();

        assertThatThrownBy(() -> new Phrase(galpi, "문장", sources, 0))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsOverlongContentAndSource() {
        assertThatThrownBy(() -> new Phrase(galpi, "가".repeat(501), List.of(), 0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Phrase(galpi, "문장", List.of("가".repeat(201)), 0))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
