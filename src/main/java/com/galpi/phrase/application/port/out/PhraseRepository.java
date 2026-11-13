package com.galpi.phrase.application.port.out;

import com.galpi.phrase.domain.Phrase;
import java.util.Optional;
import java.util.UUID;

public interface PhraseRepository {

    Phrase save(Phrase phrase);

    Optional<Phrase> findById(UUID id);
}
