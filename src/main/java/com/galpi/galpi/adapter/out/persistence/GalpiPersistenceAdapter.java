package com.galpi.galpi.adapter.out.persistence;

import com.galpi.galpi.application.port.out.GalpiRepository;
import com.galpi.galpi.domain.Galpi;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
class GalpiPersistenceAdapter implements GalpiRepository {

    private final GalpiJpaRepository repository;

    GalpiPersistenceAdapter(GalpiJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional
    public Galpi save(Galpi galpi) {
        return repository.save(GalpiJpaEntity.fromDomain(galpi)).toDomain();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Galpi> findById(UUID id) {
        return repository.findById(id).map(GalpiJpaEntity::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Galpi> findAllOrderByCreatedAt() {
        return repository.findAllByOrderByCreatedAtAsc().stream().map(GalpiJpaEntity::toDomain).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Map<UUID, Long> countPhrasesByGalpiId() {
        return repository.countPhrasesGroupedByGalpi().stream()
                .collect(Collectors.toMap(GalpiJpaRepository.PhraseCountRow::getGalpiId,
                        GalpiJpaRepository.PhraseCountRow::getPhraseCount));
    }

    @Override
    @Transactional(readOnly = true)
    public long countPhrases(UUID galpiId) {
        return repository.countPhrases(galpiId);
    }

    @Override
    @Transactional
    public boolean deleteById(UUID id) {
        return repository.deleteByIdReturningCount(id) > 0;
    }

    @Override
    @Transactional
    public boolean updateLastViewedAt(UUID id, Instant viewedAt) {
        return repository.updateLastViewedAt(id, viewedAt) > 0;
    }
}
