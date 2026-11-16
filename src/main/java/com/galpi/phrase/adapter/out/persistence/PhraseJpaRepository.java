package com.galpi.phrase.adapter.out.persistence;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface PhraseJpaRepository extends JpaRepository<PhraseJpaEntity, UUID> {

    @EntityGraph(attributePaths = "sources")
    List<PhraseJpaEntity> findAllByGalpiId(UUID galpiId);

    // Sources go with the phrase through the ON DELETE CASCADE foreign key.
    @Modifying
    @Query("delete from PhraseJpaEntity p where p.id = :id")
    int deleteByIdReturningCount(@Param("id") UUID id);
}
