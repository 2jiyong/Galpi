package com.galpi.phrase.application.service;

import com.galpi.phrase.application.port.out.PhraseRepository;
import com.galpi.phrase.domain.Phrase;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Test double that stores phrases in memory and hands out copies, like a real database round trip. */
class InMemoryPhraseRepository implements PhraseRepository {

    private final Map<UUID, Phrase> phrases = new LinkedHashMap<>();

    @Override
    public Phrase save(Phrase phrase) {
        phrases.put(phrase.getId(), copy(phrase));
        return copy(phrase);
    }

    @Override
    public Optional<Phrase> findById(UUID id) {
        return Optional.ofNullable(phrases.get(id)).map(InMemoryPhraseRepository::copy);
    }

    @Override
    public List<Phrase> findAllByGalpiId(UUID galpiId) {
        return phrases.values().stream()
                .filter(phrase -> phrase.getGalpiId().equals(galpiId))
                .map(InMemoryPhraseRepository::copy)
                .toList();
    }

    @Override
    public boolean deleteById(UUID id) {
        return phrases.remove(id) != null;
    }

    private static Phrase copy(Phrase phrase) {
        return Phrase.restore(phrase.getId(), phrase.getGalpiId(), phrase.getTitle(), phrase.getContent(), phrase.getSources(),
                phrase.isFavorite(), phrase.getCreatedAt(), phrase.getUpdatedAt());
    }
}
