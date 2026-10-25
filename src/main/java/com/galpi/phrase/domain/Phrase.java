package com.galpi.phrase.domain;

import com.galpi.galpi.domain.Galpi;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "phrases")
public class Phrase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "galpi_id", nullable = false, foreignKey = @ForeignKey(name = "fk_phrases_galpi"))
    private Galpi galpi;

    @Column(nullable = false, length = 500)
    private String content;

    @ElementCollection
    @CollectionTable(name = "phrase_sources", joinColumns = @JoinColumn(name = "phrase_id"),
            foreignKey = @ForeignKey(name = "fk_phrase_sources_phrase"))
    @OrderColumn(name = "source_order")
    @Column(name = "source", nullable = false, length = 200)
    private List<String> sources = new ArrayList<>();

    @Column(nullable = false)
    private boolean favorite;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Phrase() {
    }

    public Phrase(Galpi galpi, String content, List<String> sources, int displayOrder) {
        this.galpi = Objects.requireNonNull(galpi, "galpi is required");
        update(content, sources, displayOrder);
    }

    public void update(String content, List<String> sources, int displayOrder) {
        String normalizedContent = requiredText(content, 500, "content");
        List<String> normalizedSources = normalizeSources(sources);
        requireDisplayOrder(displayOrder);
        this.content = normalizedContent;
        this.sources.clear();
        this.sources.addAll(normalizedSources);
        this.displayOrder = displayOrder;
        touch();
    }

    public void replaceSources(List<String> sources) {
        List<String> normalized = normalizeSources(sources);
        this.sources.clear();
        this.sources.addAll(normalized);
        touch();
    }

    private static List<String> normalizeSources(List<String> sources) {
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        if (sources != null) {
            for (String source : sources) {
                normalized.add(requiredText(source, 200, "source"));
            }
        }
        if (normalized.size() > 10) {
            throw new IllegalArgumentException("sources must contain at most 10 items");
        }
        return List.copyOf(normalized);
    }

    public void setFavorite(boolean favorite) {
        this.favorite = favorite;
        touch();
    }

    public void setDisplayOrder(int displayOrder) {
        requireDisplayOrder(displayOrder);
        this.displayOrder = displayOrder;
        touch();
    }

    private static void requireDisplayOrder(int displayOrder) {
        if (displayOrder < 0) {
            throw new IllegalArgumentException("displayOrder must be non-negative");
        }
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        touch();
    }

    private void touch() {
        if (createdAt != null) {
            updatedAt = Instant.now();
        }
    }

    private static String requiredText(String value, int maxLength, String field) {
        if (value == null) {
            throw new IllegalArgumentException(field + " must contain 1 to " + maxLength + " characters");
        }
        String normalized = value.trim();
        if (normalized.isEmpty() || normalized.length() > maxLength) {
            throw new IllegalArgumentException(field + " must contain 1 to " + maxLength + " characters");
        }
        return normalized;
    }

    public UUID getId() {
        return id;
    }

    public Galpi getGalpi() {
        return galpi;
    }

    public String getContent() {
        return content;
    }

    public List<String> getSources() {
        return List.copyOf(sources);
    }

    public boolean isFavorite() {
        return favorite;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
