package com.galpi.phrase.application.service;

import com.galpi.galpi.application.GalpiNotFoundException;
import com.galpi.galpi.application.port.out.GalpiRepository;
import com.galpi.galpi.domain.Galpi;
import com.galpi.phrase.application.PhraseNotFoundException;
import com.galpi.phrase.application.port.in.PhraseUseCase;
import com.galpi.phrase.application.port.out.PhraseRepository;
import com.galpi.phrase.domain.Phrase;
import com.galpi.phrase.domain.PhraseOrder;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class PhraseService implements PhraseUseCase {

    private final PhraseRepository phrases;
    private final GalpiRepository galpis;
    private final Clock clock;

    public PhraseService(PhraseRepository phrases, GalpiRepository galpis, Clock clock) {
        this.phrases = phrases;
        this.galpis = galpis;
        this.clock = clock;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Phrase> listPhrases(UUID galpiId) {
        Galpi galpi = loadGalpi(galpiId);
        return phrases.findAllByGalpiId(galpiId).stream()
                .sorted(PhraseOrder.of(galpi.getPhraseSort()))
                .toList();
    }

    @Override
    public Phrase createPhrase(UUID galpiId, String title, String content, List<String> sources) {
        loadGalpi(galpiId);
        return phrases.save(Phrase.create(galpiId, title, content, sources, now()));
    }

    @Override
    public Phrase updatePhrase(UUID id, String title, String content, List<String> sources, UUID galpiId) {
        Phrase phrase = load(id);
        boolean moving = galpiId != null && !galpiId.equals(phrase.getGalpiId());
        if (moving) {
            loadGalpi(galpiId);
        }
        Instant now = now();
        phrase.update(title, content, sources, now);
        if (moving) {
            phrase.moveTo(galpiId, now);
        }
        return phrases.save(phrase);
    }

    @Override
    public void deletePhrase(UUID id) {
        if (!phrases.deleteById(id)) {
            throw new PhraseNotFoundException(id);
        }
    }

    @Override
    public Phrase changeFavorite(UUID id, boolean favorite) {
        Phrase phrase = load(id);
        phrase.changeFavorite(favorite, now());
        return phrases.save(phrase);
    }

    private Phrase load(UUID id) {
        return phrases.findById(id).orElseThrow(() -> new PhraseNotFoundException(id));
    }

    private Galpi loadGalpi(UUID id) {
        return galpis.findById(id).orElseThrow(() -> new GalpiNotFoundException(id));
    }

    // PostgreSQL keeps microseconds, so drop finer precision before it reaches a response.
    private Instant now() {
        return Instant.now(clock).truncatedTo(ChronoUnit.MICROS);
    }
}
