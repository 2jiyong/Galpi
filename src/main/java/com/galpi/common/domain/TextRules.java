package com.galpi.common.domain;

public final class TextRules {

    private TextRules() {
    }

    public static String required(String value, int maxLength, String field) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.isEmpty() || normalized.length() > maxLength) {
            throw new IllegalArgumentException(field + " must contain 1 to " + maxLength + " characters");
        }
        return normalized;
    }

    public static String optional(String value, int maxLength, String field) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.length() > maxLength) {
            throw new IllegalArgumentException(field + " must contain at most " + maxLength + " characters");
        }
        return normalized;
    }
}
