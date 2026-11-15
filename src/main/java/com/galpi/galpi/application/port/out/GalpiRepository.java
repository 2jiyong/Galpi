package com.galpi.galpi.application.port.out;

import com.galpi.galpi.domain.Galpi;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface GalpiRepository {

    Galpi save(Galpi galpi);

    Optional<Galpi> findById(UUID id);

    List<Galpi> findAllOrderByCreatedAt();

    /** Phrase counts keyed by galpi id; galpis without phrases are absent. */
    Map<UUID, Long> countPhrasesByGalpiId();

    long countPhrases(UUID galpiId);

    /** Returns {@code true} when a row was deleted. */
    boolean deleteById(UUID id);

    /** Updates only {@code last_viewed_at}; returns {@code true} when the galpi exists. */
    boolean updateLastViewedAt(UUID id, Instant viewedAt);
}
