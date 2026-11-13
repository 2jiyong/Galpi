package com.galpi.phrase.adapter.out.persistence;

import com.galpi.phrase.application.port.out.PhraseRepository;
import com.galpi.phrase.domain.Phrase;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
class PhrasePersistenceAdapter implements PhraseRepository {

    private final PhraseJpaRepository repository;

    PhrasePersistenceAdapter(PhraseJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional
    public Phrase save(Phrase phrase) {
        return repository.save(PhraseJpaEntity.fromDomain(phrase)).toDomain();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Phrase> findById(UUID id) {
        return repository.findById(id).map(PhraseJpaEntity::toDomain);
    }
}
