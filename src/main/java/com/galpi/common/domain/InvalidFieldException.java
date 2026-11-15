package com.galpi.common.domain;

/** Validation failure tied to one input field, so the web layer can report which field was wrong. */
public class InvalidFieldException extends IllegalArgumentException {

    private final String field;

    public InvalidFieldException(String field, String message) {
        super(message);
        this.field = field;
    }

    public String field() {
        return field;
    }
}
