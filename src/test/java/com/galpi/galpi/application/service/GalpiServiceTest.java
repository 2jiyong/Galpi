package com.galpi.galpi.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.galpi.galpi.application.GalpiNotFoundException;
import com.galpi.galpi.application.port.in.GalpiSummary;
import com.galpi.common.domain.InvalidFieldException;
import com.galpi.galpi.domain.Galpi;
import com.galpi.galpi.domain.PhraseSort;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class GalpiServiceTest {

    private static final Instant T0 = Instant.parse("2026-11-13T10:00:00Z");
    private static final Instant T1 = T0.plusSeconds(60);

    private final InMemoryGalpiRepository repository = new InMemoryGalpiRepository();
    private final GalpiService service = serviceAt(T1);

    private GalpiService serviceAt(Instant now) {
        return new GalpiService(repository, Clock.fixed(now, ZoneOffset.UTC));
    }

    private Galpi existing(String title, Instant createdAt) {
        return repository.save(Galpi.create(title, "설명", createdAt));
    }

    @Test
    void listReturnsGalpisInCreationOrderWithPhraseCounts() {
        Galpi first = existing("공부", T0);
        Galpi second = existing("운동", T1);
        repository.setPhraseCount(first.getId(), 3);

        List<GalpiSummary> summaries = service.listGalpis();

        assertThat(summaries).extracting(summary -> summary.galpi().getTitle()).containsExactly("공부", "운동");
        assertThat(summaries).extracting(GalpiSummary::phraseCount).containsExactly(3L, 0L);
        assertThat(summaries.get(1).galpi().getId()).isEqualTo(second.getId());
    }

    @Test
    void createUsesClockAndStartsWithZeroPhrases() {
        GalpiSummary created = service.createGalpi("  공부  ", "");

        assertThat(created.galpi().getTitle()).isEqualTo("공부");
        assertThat(created.galpi().getDescription()).isNull();
        assertThat(created.galpi().getCreatedAt()).isEqualTo(T1);
        assertThat(created.phraseCount()).isZero();
        assertThat(repository.findById(created.galpi().getId())).isPresent();
    }

    @Test
    void createTruncatesClockToMicros() {
        GalpiSummary created = serviceAt(T1.plusNanos(1_234_567)).createGalpi("공부", null);

        assertThat(created.galpi().getCreatedAt()).isEqualTo(T1.plusNanos(1_234_000));
    }

    @Test
    void getReturnsGalpiWithPhraseCount() {
        Galpi galpi = existing("공부", T0);
        repository.setPhraseCount(galpi.getId(), 2);

        GalpiSummary summary = service.getGalpi(galpi.getId());

        assertThat(summary.galpi().getTitle()).isEqualTo("공부");
        assertThat(summary.phraseCount()).isEqualTo(2);
    }

    @Test
    void updateChangesTitleAndTouchesUpdatedAt() {
        Galpi galpi = existing("공부", T0);

        GalpiSummary updated = service.updateGalpi(galpi.getId(), "운동", "설명");

        assertThat(updated.galpi().getTitle()).isEqualTo("운동");
        assertThat(updated.galpi().getUpdatedAt()).isEqualTo(T1);
        assertThat(updated.galpi().getCreatedAt()).isEqualTo(T0);
        assertThat(repository.findById(galpi.getId()).orElseThrow().getTitle()).isEqualTo("운동");
    }

    @Test
    void updateClearsDescription() {
        Galpi galpi = existing("공부", T0);

        service.updateGalpi(galpi.getId(), "공부", "   ");

        assertThat(repository.findById(galpi.getId()).orElseThrow().getDescription()).isNull();
    }

    @Test
    void updateUnknownGalpiThrowsNotFound() {
        assertThatThrownBy(() -> service.updateGalpi(UUID.randomUUID(), "공부", null))
                .isInstanceOf(GalpiNotFoundException.class);
        assertThat(repository.size()).isZero();
    }

    @Test
    void invalidUpdateKeepsStoredValues() {
        Galpi galpi = existing("공부", T0);

        assertThatThrownBy(() -> service.updateGalpi(galpi.getId(), "가".repeat(51), null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(repository.findById(galpi.getId()).orElseThrow().getTitle()).isEqualTo("공부");
    }

    @Test
    void deleteRemovesGalpi() {
        Galpi galpi = existing("공부", T0);

        service.deleteGalpi(galpi.getId());

        assertThat(repository.findById(galpi.getId())).isEmpty();
    }

    @Test
    void deleteUnknownGalpiThrowsNotFound() {
        assertThatThrownBy(() -> service.deleteGalpi(UUID.randomUUID()))
                .isInstanceOf(GalpiNotFoundException.class);
    }

    @Test
    void markViewedRecordsClockTime() {
        Galpi galpi = existing("공부", T0);

        service.markViewed(galpi.getId());

        Galpi stored = repository.findById(galpi.getId()).orElseThrow();
        assertThat(stored.getLastViewedAt()).isEqualTo(T1);
        assertThat(stored.getUpdatedAt()).isEqualTo(T0);
    }

    @Test
    void markViewedUnknownGalpiThrowsNotFound() {
        assertThatThrownBy(() -> service.markViewed(UUID.randomUUID()))
                .isInstanceOf(GalpiNotFoundException.class);
    }

    @Test
    void getUnknownGalpiThrowsNotFound() {
        UUID id = UUID.randomUUID();

        assertThatThrownBy(() -> service.getGalpi(id))
                .isInstanceOf(GalpiNotFoundException.class)
                .satisfies(error -> assertThat(((GalpiNotFoundException) error).id()).isEqualTo(id));
    }

    @Test
    void changePhraseSortSavesSetting() {
        Galpi galpi = existing("공부", T0);

        GalpiSummary changed = service.changePhraseSort(galpi.getId(), PhraseSort.NEWEST);

        assertThat(changed.galpi().getPhraseSort()).isEqualTo(PhraseSort.NEWEST);
        Galpi stored = repository.findById(galpi.getId()).orElseThrow();
        assertThat(stored.getPhraseSort()).isEqualTo(PhraseSort.NEWEST);
        assertThat(stored.getUpdatedAt()).isEqualTo(T1);
    }

    @Test
    void changePhraseSortThrowsWhenMissing() {
        assertThatThrownBy(() -> service.changePhraseSort(UUID.randomUUID(), PhraseSort.NEWEST))
                .isInstanceOf(GalpiNotFoundException.class);
    }

    @Test
    void changePhraseSortRejectsNull() {
        Galpi galpi = existing("공부", T0);

        assertThatThrownBy(() -> service.changePhraseSort(galpi.getId(), null))
                .isInstanceOf(InvalidFieldException.class)
                .satisfies(error -> assertThat(((InvalidFieldException) error).field()).isEqualTo("phraseSort"));
    }
}
