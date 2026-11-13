package com.galpi.phrase.adapter.out.persistence;

import com.galpi.phrase.domain.Phrase;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "phrases")
class PhraseJpaEntity {

    @Id
    private UUID id;

    @Column(name = "galpi_id", nullable = false)
    private UUID galpiId;

    @Column(nullable = false, length = Phrase.CONTENT_MAX_LENGTH)
    private String content;

    @ElementCollection
    @CollectionTable(name = "phrase_sources", joinColumns = @JoinColumn(name = "phrase_id"),
            foreignKey = @ForeignKey(name = "fk_phrase_sources_phrase"))
    @OrderColumn(name = "source_order")
    @Column(name = "source", nullable = false, length = Phrase.SOURCE_MAX_LENGTH)
    private List<String> sources = new ArrayList<>();

    @Column(nullable = false)
    private boolean favorite;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected PhraseJpaEntity() {
    }

    static PhraseJpaEntity fromDomain(Phrase phrase) {
        PhraseJpaEntity entity = new PhraseJpaEntity();
        entity.id = phrase.getId();
        entity.galpiId = phrase.getGalpiId();
        entity.content = phrase.getContent();
        entity.sources = new ArrayList<>(phrase.getSources());
        entity.favorite = phrase.isFavorite();
        entity.displayOrder = 0;
        entity.createdAt = phrase.getCreatedAt();
        entity.updatedAt = phrase.getUpdatedAt();
        return entity;
    }

    Phrase toDomain() {
        return Phrase.restore(id, galpiId, content, sources, favorite, createdAt, updatedAt);
    }
}
