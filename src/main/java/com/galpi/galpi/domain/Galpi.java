package com.galpi.galpi.domain;

import com.galpi.common.domain.TextRules;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public final class Galpi {

    public static final int TITLE_MAX_LENGTH = 50;
    public static final int DESCRIPTION_MAX_LENGTH = 200;

    private final UUID id;
    private String title;
    private String description;
    private PhraseSort phraseSort;
    private Instant lastViewedAt;
    private final Instant createdAt;
    private Instant updatedAt;

    private Galpi(UUID id, String title, String description, PhraseSort phraseSort, Instant lastViewedAt,
            Instant createdAt, Instant updatedAt) {
        this.id = Objects.requireNonNull(id, "id is required");
        this.title = normalizeTitle(title);
        this.description = normalizeDescription(description);
        this.phraseSort = Objects.requireNonNull(phraseSort, "phraseSort is required");
        this.lastViewedAt = lastViewedAt;
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt is required");
        this.updatedAt = Objects.requireNonNull(updatedAt, "updatedAt is required");
    }

    public static Galpi create(String title, String description, Instant now) {
        return new Galpi(UUID.randomUUID(), title, description, PhraseSort.OLDEST, null, now, now);
    }

    public static Galpi restore(UUID id, String title, String description, PhraseSort phraseSort,
            Instant lastViewedAt, Instant createdAt, Instant updatedAt) {
        return new Galpi(id, title, description, phraseSort, lastViewedAt, createdAt, updatedAt);
    }

    public void update(String title, String description, Instant now) {
        String normalizedTitle = normalizeTitle(title);
        String normalizedDescription = normalizeDescription(description);
        Objects.requireNonNull(now, "now is required");
        this.title = normalizedTitle;
        this.description = normalizedDescription;
        this.updatedAt = now;
    }

    public void changePhraseSort(PhraseSort phraseSort, Instant now) {
        Objects.requireNonNull(phraseSort, "phraseSort is required");
        Objects.requireNonNull(now, "now is required");
        this.phraseSort = phraseSort;
        this.updatedAt = now;
    }

    public void markViewed(Instant now) {
        this.lastViewedAt = Objects.requireNonNull(now, "now is required");
    }

    private static String normalizeTitle(String title) {
        return TextRules.required(title, TITLE_MAX_LENGTH, "title");
    }

    private static String normalizeDescription(String description) {
        return TextRules.optional(description, DESCRIPTION_MAX_LENGTH, "description");
    }

    public UUID getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public PhraseSort getPhraseSort() {
        return phraseSort;
    }

    public Instant getLastViewedAt() {
        return lastViewedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
