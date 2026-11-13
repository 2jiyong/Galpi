package com.galpi.galpi.adapter.out.persistence;

import com.galpi.galpi.application.port.out.GalpiRepository;
import com.galpi.galpi.domain.Galpi;
import java.util.Optional;
import java.util.UUID;
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
}
