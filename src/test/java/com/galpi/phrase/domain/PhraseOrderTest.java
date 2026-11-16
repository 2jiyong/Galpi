package com.galpi.phrase.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.galpi.galpi.domain.PhraseSort;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

class PhraseOrderTest {

    private static final Instant T0 = Instant.parse("2026-11-13T10:00:00Z");
    private static final UUID GALPI_ID = UUID.randomUUID();

    private static Phrase phrase(String content, Instant createdAt, boolean favorite) {
        return Phrase.restore(UUID.randomUUID(), GALPI_ID, null, content, List.of(), favorite, createdAt, createdAt);
    }

    private final Phrase oldPlain = phrase("오래된 일반", T0, false);
    private final Phrase newPlain = phrase("최신 일반", T0.plusSeconds(20), false);
    private final Phrase oldFavorite = phrase("오래된 즐겨찾기", T0.plusSeconds(10), true);
    private final Phrase newFavorite = phrase("최신 즐겨찾기", T0.plusSeconds(30), true);

    private List<String> sorted(PhraseSort sort, Phrase... phrases) {
        return Stream.of(phrases).sorted(PhraseOrder.of(sort)).map(Phrase::getContent).toList();
    }

    @Test
    void favoritesComeFirstThenOldest() {
        assertThat(sorted(PhraseSort.OLDEST, newPlain, newFavorite, oldPlain, oldFavorite))
                .containsExactly("오래된 즐겨찾기", "최신 즐겨찾기", "오래된 일반", "최신 일반");
    }

    @Test
    void newestSortsEachGroupDescending() {
        assertThat(sorted(PhraseSort.NEWEST, oldPlain, oldFavorite, newPlain, newFavorite))
                .containsExactly("최신 즐겨찾기", "오래된 즐겨찾기", "최신 일반", "오래된 일반");
    }

    @Test
    void sameCreatedAtFallsBackToId() {
        Phrase a = Phrase.restore(UUID.fromString("00000000-0000-0000-0000-000000000001"), GALPI_ID, null, "a",
                List.of(), false, T0, T0);
        Phrase b = Phrase.restore(UUID.fromString("00000000-0000-0000-0000-000000000002"), GALPI_ID, null, "b",
                List.of(), false, T0, T0);

        assertThat(sorted(PhraseSort.OLDEST, b, a)).containsExactly("a", "b");
        assertThat(sorted(PhraseSort.NEWEST, b, a)).containsExactly("a", "b");
    }
}
