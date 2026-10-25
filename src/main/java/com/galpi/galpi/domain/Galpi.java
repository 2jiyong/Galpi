package com.galpi.galpi.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "galpis")
public class Galpi {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 50)
    private String title;

    @Column(length = 200)
    private String description;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Galpi() {
    }

    public Galpi(String title, String description, int displayOrder) {
        update(title, description, displayOrder);
    }

    public void update(String title, String description, int displayOrder) {
        String normalizedTitle = requiredText(title, 50, "title");
        String normalizedDescription = optionalText(description, 200, "description");
        requireDisplayOrder(displayOrder);
        this.title = normalizedTitle;
        this.description = normalizedDescription;
        this.displayOrder = displayOrder;
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

    static String requiredText(String value, int maxLength, String field) {
        if (value == null) {
            throw new IllegalArgumentException(field + " must contain 1 to " + maxLength + " characters");
        }
        String normalized = value.trim();
        if (normalized.isEmpty() || normalized.length() > maxLength) {
            throw new IllegalArgumentException(field + " must contain 1 to " + maxLength + " characters");
        }
        return normalized;
    }

    static String optionalText(String value, int maxLength, String field) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.length() > maxLength) {
            throw new IllegalArgumentException(field + " must contain at most " + maxLength + " characters");
        }
        return normalized;
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
