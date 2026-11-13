package com.galpi.galpi.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class GalpiTest {

    private static final Instant T0 = Instant.parse("2026-11-13T10:00:00Z");
    private static final Instant T1 = T0.plusSeconds(60);

    @Test
    void normalizesOptionalDescriptionAndTitle() {
        Galpi galpi = Galpi.create("  공부  ", "   ", T0);

        assertThat(galpi.getTitle()).isEqualTo("공부");
        assertThat(galpi.getDescription()).isNull();
    }

    @Test
    void invalidUpdateDoesNotChangeExistingValues() {
        Galpi galpi = Galpi.create("공부", "매일 시작하기", T0);

        assertThatThrownBy(() -> galpi.update("   ", "새 설명", T1))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(galpi.getTitle()).isEqualTo("공부");
        assertThat(galpi.getDescription()).isEqualTo("매일 시작하기");
        assertThat(galpi.getUpdatedAt()).isEqualTo(T0);
    }

    @Test
    void rejectsBlankAndOverlongTitle() {
        assertThatThrownBy(() -> Galpi.create("   ", null, T0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> Galpi.create("가".repeat(51), null, T0))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void acceptsBoundaryLengths() {
        Galpi galpi = Galpi.create("가".repeat(50), "나".repeat(200), T0);

        assertThat(galpi.getTitle()).hasSize(50);
        assertThat(galpi.getDescription()).hasSize(200);
        assertThatThrownBy(() -> Galpi.create("공부", "나".repeat(201), T0))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void createSetsDefaults() {
        Galpi galpi = Galpi.create("공부", null, T0);

        assertThat(galpi.getId()).isNotNull();
        assertThat(galpi.getPhraseSort()).isEqualTo(PhraseSort.OLDEST);
        assertThat(galpi.getLastViewedAt()).isNull();
        assertThat(galpi.getCreatedAt()).isEqualTo(T0);
        assertThat(galpi.getUpdatedAt()).isEqualTo(T0);
    }

    @Test
    void updateTouchesUpdatedAt() {
        Galpi galpi = Galpi.create("공부", "설명", T0);

        galpi.update("운동", null, T1);

        assertThat(galpi.getTitle()).isEqualTo("운동");
        assertThat(galpi.getDescription()).isNull();
        assertThat(galpi.getCreatedAt()).isEqualTo(T0);
        assertThat(galpi.getUpdatedAt()).isEqualTo(T1);
    }

    @Test
    void changePhraseSortTouchesUpdatedAt() {
        Galpi galpi = Galpi.create("공부", null, T0);

        galpi.changePhraseSort(PhraseSort.NEWEST, T1);

        assertThat(galpi.getPhraseSort()).isEqualTo(PhraseSort.NEWEST);
        assertThat(galpi.getUpdatedAt()).isEqualTo(T1);
        assertThatThrownBy(() -> galpi.changePhraseSort(null, T1))
                .isInstanceOf(NullPointerException.class);
    }

    @Test
    void markViewedDoesNotTouchUpdatedAt() {
        Galpi galpi = Galpi.create("공부", null, T0);

        galpi.markViewed(T1);

        assertThat(galpi.getLastViewedAt()).isEqualTo(T1);
        assertThat(galpi.getUpdatedAt()).isEqualTo(T0);
    }

    @Test
    void restoreKeepsGivenValues() {
        UUID id = UUID.randomUUID();

        Galpi galpi = Galpi.restore(id, "클라이밍", "운동 전에", PhraseSort.NEWEST, T1, T0, T1);

        assertThat(galpi.getId()).isEqualTo(id);
        assertThat(galpi.getTitle()).isEqualTo("클라이밍");
        assertThat(galpi.getDescription()).isEqualTo("운동 전에");
        assertThat(galpi.getPhraseSort()).isEqualTo(PhraseSort.NEWEST);
        assertThat(galpi.getLastViewedAt()).isEqualTo(T1);
        assertThat(galpi.getCreatedAt()).isEqualTo(T0);
        assertThat(galpi.getUpdatedAt()).isEqualTo(T1);
    }
}
