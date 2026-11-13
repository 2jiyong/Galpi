package com.galpi.galpi.adapter.out.persistence;

import com.galpi.galpi.domain.Galpi;
import com.galpi.galpi.domain.PhraseSort;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "galpis")
class GalpiJpaEntity {

    @Id
    private UUID id;

    @Column(nullable = false, length = Galpi.TITLE_MAX_LENGTH)
    private String title;

    @Column(length = Galpi.DESCRIPTION_MAX_LENGTH)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "phrase_sort", nullable = false, length = 10)
    private PhraseSort phraseSort;

    @Column(name = "last_viewed_at")
    private Instant lastViewedAt;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected GalpiJpaEntity() {
    }

    static GalpiJpaEntity fromDomain(Galpi galpi) {
        GalpiJpaEntity entity = new GalpiJpaEntity();
        entity.id = galpi.getId();
        entity.title = galpi.getTitle();
        entity.description = galpi.getDescription();
        entity.phraseSort = galpi.getPhraseSort();
        entity.lastViewedAt = galpi.getLastViewedAt();
        entity.displayOrder = 0;
        entity.createdAt = galpi.getCreatedAt();
        entity.updatedAt = galpi.getUpdatedAt();
        return entity;
    }

    Galpi toDomain() {
        return Galpi.restore(id, title, description, phraseSort, lastViewedAt, createdAt, updatedAt);
    }
}
