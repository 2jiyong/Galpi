package com.galpi.phrase.adapter.out.persistence;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface PhraseJpaRepository extends JpaRepository<PhraseJpaEntity, UUID> {
}
