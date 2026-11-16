package com.galpi.galpi.application.service;

import com.galpi.galpi.application.port.out.GalpiRepository;
import com.galpi.galpi.domain.Galpi;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Test double that stores galpis in memory and keeps restored copies, like a real database round trip. */
public class InMemoryGalpiRepository implements GalpiRepository {

    private final Map<UUID, Galpi> galpis = new LinkedHashMap<>();
    private final Map<UUID, Long> phraseCounts = new HashMap<>();

    public void setPhraseCount(UUID galpiId, long count) {
        phraseCounts.put(galpiId, count);
    }

    public int size() {
        return galpis.size();
    }

    @Override
    public Galpi save(Galpi galpi) {
        galpis.put(galpi.getId(), copy(galpi));
        return copy(galpi);
    }

    @Override
    public Optional<Galpi> findById(UUID id) {
        return Optional.ofNullable(galpis.get(id)).map(InMemoryGalpiRepository::copy);
    }

    @Override
    public List<Galpi> findAllOrderByCreatedAt() {
        return galpis.values().stream()
                .sorted(Comparator.comparing(Galpi::getCreatedAt))
                .map(InMemoryGalpiRepository::copy)
                .toList();
    }

    @Override
    public Map<UUID, Long> countPhrasesByGalpiId() {
        return Map.copyOf(phraseCounts);
    }

    @Override
    public long countPhrases(UUID galpiId) {
        return phraseCounts.getOrDefault(galpiId, 0L);
    }

    @Override
    public boolean deleteById(UUID id) {
        phraseCounts.remove(id);
        return galpis.remove(id) != null;
    }

    @Override
    public boolean updateLastViewedAt(UUID id, Instant viewedAt) {
        Galpi galpi = galpis.get(id);
        if (galpi == null) {
            return false;
        }
        galpi.markViewed(viewedAt);
        return true;
    }

    private static Galpi copy(Galpi galpi) {
        return Galpi.restore(galpi.getId(), galpi.getTitle(), galpi.getDescription(), galpi.getPhraseSort(),
                galpi.getLastViewedAt(), galpi.getCreatedAt(), galpi.getUpdatedAt());
    }
}
