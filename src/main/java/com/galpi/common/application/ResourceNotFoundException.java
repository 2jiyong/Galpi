package com.galpi.common.application;

/** A requested resource does not exist. The API layer turns it into 404 with {@link #title()}. */
public abstract class ResourceNotFoundException extends RuntimeException {

    protected ResourceNotFoundException(String message) {
        super(message);
    }

    /** Short message shown to people, used as the ProblemDetail title. */
    public abstract String title();
}
