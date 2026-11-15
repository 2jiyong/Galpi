package com.galpi.galpi.adapter.in.web;

import com.galpi.galpi.application.port.in.GalpiSummary;
import com.galpi.galpi.domain.Galpi;
import com.galpi.galpi.domain.PhraseSort;
import java.time.Instant;
import java.util.UUID;

public record GalpiResponse(UUID id, String title, String description, PhraseSort phraseSort, long phraseCount,
        Instant lastViewedAt, Instant createdAt) {

    static GalpiResponse from(GalpiSummary summary) {
        Galpi galpi = summary.galpi();
        return new GalpiResponse(galpi.getId(), galpi.getTitle(), galpi.getDescription(), galpi.getPhraseSort(),
                summary.phraseCount(), galpi.getLastViewedAt(), galpi.getCreatedAt());
    }
}
