package com.galpi.phrase.domain;

import com.galpi.galpi.domain.PhraseSort;
import java.util.Comparator;

/** Display order of phrases inside a galpi: favorites first, then by creation time, then by id for stability. */
public final class PhraseOrder {

    private PhraseOrder() {
    }

    public static Comparator<Phrase> of(PhraseSort sort) {
        Comparator<Phrase> byCreatedAt = Comparator.comparing(Phrase::getCreatedAt);
        if (sort == PhraseSort.NEWEST) {
            byCreatedAt = byCreatedAt.reversed();
        }
        return Comparator.comparing((Phrase phrase) -> !phrase.isFavorite())
                .thenComparing(byCreatedAt)
                .thenComparing(Phrase::getId);
    }
}
