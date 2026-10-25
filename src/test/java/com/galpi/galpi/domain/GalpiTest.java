package com.galpi.galpi.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class GalpiTest {

    @Test
    void normalizesOptionalDescriptionAndTitle() {
        Galpi galpi = new Galpi("  공부  ", "   ", 0);

        assertThat(galpi.getTitle()).isEqualTo("공부");
        assertThat(galpi.getDescription()).isNull();
    }

    @Test
    void invalidUpdateDoesNotChangeExistingValues() {
        Galpi galpi = new Galpi("공부", "매일 시작하기", 1);

        assertThatThrownBy(() -> galpi.update("새 이름", "새 설명", -1))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(galpi.getTitle()).isEqualTo("공부");
        assertThat(galpi.getDescription()).isEqualTo("매일 시작하기");
        assertThat(galpi.getDisplayOrder()).isEqualTo(1);
    }

    @Test
    void rejectsBlankAndOverlongTitle() {
        assertThatThrownBy(() -> new Galpi("   ", null, 0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Galpi("가".repeat(51), null, 0))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
