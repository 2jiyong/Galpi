package com.galpi.phrase.application.port.in;

import com.galpi.phrase.domain.Phrase;
import java.util.List;
import java.util.UUID;

public interface PhraseUseCase {

    /** Phrases of a galpi in display order: favorites first, then by the galpi's sort setting. */
    List<Phrase> listPhrases(UUID galpiId);

    Phrase createPhrase(UUID galpiId, String content, List<String> sources);

    /** Replaces content and sources. A non-null {@code galpiId} different from the current one moves the phrase. */
    Phrase updatePhrase(UUID id, String content, List<String> sources, UUID galpiId);

    void deletePhrase(UUID id);

    Phrase changeFavorite(UUID id, boolean favorite);
}
