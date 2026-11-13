package com.galpi.phrase.domain;

import com.galpi.common.domain.TextRules;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

public final class Phrase {

    public static final int CONTENT_MAX_LENGTH = 500;
    public static final int SOURCE_MAX_LENGTH = 200;
    public static final int MAX_SOURCES = 10;

    private final UUID id;
    private UUID galpiId;
    private String content;
    private List<String> sources;
    private boolean favorite;
    private final Instant createdAt;
    private Instant updatedAt;

    private Phrase(UUID id, UUID galpiId, String content, List<String> sources, boolean favorite,
            Instant createdAt, Instant updatedAt) {
        this.id = Objects.requireNonNull(id, "id is required");
        this.galpiId = Objects.requireNonNull(galpiId, "galpiId is required");
        this.content = normalizeContent(content);
        this.sources = normalizeSources(sources);
        this.favorite = favorite;
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt is required");
        this.updatedAt = Objects.requireNonNull(updatedAt, "updatedAt is required");
    }

    public static Phrase create(UUID galpiId, String content, List<String> sources, Instant now) {
        return new Phrase(UUID.randomUUID(), galpiId, content, sources, false, now, now);
    }

    public static Phrase restore(UUID id, UUID galpiId, String content, List<String> sources, boolean favorite,
            Instant createdAt, Instant updatedAt) {
        return new Phrase(id, galpiId, content, sources, favorite, createdAt, updatedAt);
    }

    public void update(String content, List<String> sources, Instant now) {
        String normalizedContent = normalizeContent(content);
        List<String> normalizedSources = normalizeSources(sources);
        Objects.requireNonNull(now, "now is required");
        this.content = normalizedContent;
        this.sources = normalizedSources;
        this.updatedAt = now;
    }

    public void moveTo(UUID galpiId, Instant now) {
        Objects.requireNonNull(galpiId, "galpiId is required");
        Objects.requireNonNull(now, "now is required");
        this.galpiId = galpiId;
        this.updatedAt = now;
    }

    public void changeFavorite(boolean favorite, Instant now) {
        Objects.requireNonNull(now, "now is required");
        this.favorite = favorite;
        this.updatedAt = now;
    }

    private static String normalizeContent(String content) {
        return TextRules.required(content, CONTENT_MAX_LENGTH, "content");
    }

    private static List<String> normalizeSources(List<String> sources) {
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        if (sources != null) {
            for (String source : sources) {
                normalized.add(TextRules.required(source, SOURCE_MAX_LENGTH, "source"));
            }
        }
        if (normalized.size() > MAX_SOURCES) {
            throw new IllegalArgumentException("sources must contain at most " + MAX_SOURCES + " items");
        }
        return List.copyOf(normalized);
    }

    public UUID getId() {
        return id;
    }

    public UUID getGalpiId() {
        return galpiId;
    }

    public String getContent() {
        return content;
    }

    public List<String> getSources() {
        return sources;
    }

    public boolean isFavorite() {
        return favorite;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
