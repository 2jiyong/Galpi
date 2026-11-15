package com.galpi.galpi.application.service;

import com.galpi.galpi.application.GalpiNotFoundException;
import com.galpi.galpi.application.port.in.GalpiSummary;
import com.galpi.galpi.application.port.in.GalpiUseCase;
import com.galpi.galpi.application.port.out.GalpiRepository;
import com.galpi.galpi.domain.Galpi;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class GalpiService implements GalpiUseCase {

    private final GalpiRepository repository;
    private final Clock clock;

    public GalpiService(GalpiRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    @Override
    @Transactional(readOnly = true)
    public List<GalpiSummary> listGalpis() {
        Map<UUID, Long> phraseCounts = repository.countPhrasesByGalpiId();
        return repository.findAllOrderByCreatedAt().stream()
                .map(galpi -> new GalpiSummary(galpi, phraseCounts.getOrDefault(galpi.getId(), 0L)))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public GalpiSummary getGalpi(UUID id) {
        return summarize(load(id));
    }

    @Override
    public GalpiSummary createGalpi(String title, String description) {
        Galpi saved = repository.save(Galpi.create(title, description, now()));
        return new GalpiSummary(saved, 0);
    }

    @Override
    public GalpiSummary updateGalpi(UUID id, String title, String description) {
        Galpi galpi = load(id);
        galpi.update(title, description, now());
        return summarize(repository.save(galpi));
    }

    @Override
    public void deleteGalpi(UUID id) {
        if (!repository.deleteById(id)) {
            throw new GalpiNotFoundException(id);
        }
    }

    @Override
    public void markViewed(UUID id) {
        if (!repository.updateLastViewedAt(id, now())) {
            throw new GalpiNotFoundException(id);
        }
    }

    private Galpi load(UUID id) {
        return repository.findById(id).orElseThrow(() -> new GalpiNotFoundException(id));
    }

    private GalpiSummary summarize(Galpi galpi) {
        return new GalpiSummary(galpi, repository.countPhrases(galpi.getId()));
    }

    // PostgreSQL keeps microseconds, so drop finer precision before it reaches a response.
    private Instant now() {
        return Instant.now(clock).truncatedTo(ChronoUnit.MICROS);
    }
}
