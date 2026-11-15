package com.galpi.galpi.adapter.out.persistence;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface GalpiJpaRepository extends JpaRepository<GalpiJpaEntity, UUID> {

    List<GalpiJpaEntity> findAllByOrderByCreatedAtAsc();

    @Modifying
    @Query("delete from GalpiJpaEntity g where g.id = :id")
    int deleteByIdReturningCount(@Param("id") UUID id);

    @Modifying
    @Query("update GalpiJpaEntity g set g.lastViewedAt = :viewedAt where g.id = :id")
    int updateLastViewedAt(@Param("id") UUID id, @Param("viewedAt") Instant viewedAt);

    // Counted with native SQL so this adapter does not depend on the phrase feature's entities.
    @Query(value = "SELECT galpi_id AS galpiId, count(*) AS phraseCount FROM phrases GROUP BY galpi_id",
            nativeQuery = true)
    List<PhraseCountRow> countPhrasesGroupedByGalpi();

    @Query(value = "SELECT count(*) FROM phrases WHERE galpi_id = :galpiId", nativeQuery = true)
    long countPhrases(@Param("galpiId") UUID galpiId);

    interface PhraseCountRow {

        UUID getGalpiId();

        long getPhraseCount();
    }
}
