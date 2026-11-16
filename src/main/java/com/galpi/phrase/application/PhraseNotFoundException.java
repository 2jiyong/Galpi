package com.galpi.phrase.application;

import com.galpi.common.application.ResourceNotFoundException;
import java.util.UUID;

public class PhraseNotFoundException extends ResourceNotFoundException {

    private final UUID id;

    public PhraseNotFoundException(UUID id) {
        super("Phrase not found: " + id);
        this.id = id;
    }

    public UUID id() {
        return id;
    }

    @Override
    public String title() {
        return "문장을 찾을 수 없습니다";
    }
}
