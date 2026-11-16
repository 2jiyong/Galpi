package com.galpi.phrase.adapter.in.web;

import java.util.List;
import java.util.UUID;

/** {@code galpiId} is read only on update, where a different galpi moves the phrase. */
public record PhraseRequest(String content, List<String> sources, UUID galpiId) {
}
