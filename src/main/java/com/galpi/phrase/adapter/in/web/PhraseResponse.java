package com.galpi.phrase.adapter.in.web;

import com.galpi.phrase.domain.Phrase;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PhraseResponse(UUID id, UUID galpiId, String title, String content, List<String> sources, boolean favorite,
        Instant createdAt) {

    static PhraseResponse from(Phrase phrase) {
        return new PhraseResponse(phrase.getId(), phrase.getGalpiId(), phrase.getTitle(), phrase.getContent(), phrase.getSources(),
                phrase.isFavorite(), phrase.getCreatedAt());
    }
}
