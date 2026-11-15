package com.galpi.galpi.application;

import java.util.UUID;

public class GalpiNotFoundException extends RuntimeException {

    private final UUID id;

    public GalpiNotFoundException(UUID id) {
        super("Galpi not found: " + id);
        this.id = id;
    }

    public UUID id() {
        return id;
    }
}
