package com.galpi.galpi.application;

import com.galpi.common.application.ResourceNotFoundException;
import java.util.UUID;

public class GalpiNotFoundException extends ResourceNotFoundException {

    private final UUID id;

    public GalpiNotFoundException(UUID id) {
        super("Galpi not found: " + id);
        this.id = id;
    }

    public UUID id() {
        return id;
    }

    @Override
    public String title() {
        return "갈피를 찾을 수 없습니다";
    }
}
