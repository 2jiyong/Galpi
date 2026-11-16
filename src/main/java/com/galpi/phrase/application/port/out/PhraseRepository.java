package com.galpi.phrase.application.port.out;

import com.galpi.phrase.domain.Phrase;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PhraseRepository {

    Phrase save(Phrase phrase);

    Optional<Phrase> findById(UUID id);

    /** Phrases of one galpi in no particular order; callers sort with {@code PhraseOrder}. */
    List<Phrase> findAllByGalpiId(UUID galpiId);

    /** Returns whether a phrase was deleted. */
    boolean deleteById(UUID id);
}
