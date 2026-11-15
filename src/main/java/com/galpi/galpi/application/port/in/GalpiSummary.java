package com.galpi.galpi.application.port.in;

import com.galpi.galpi.domain.Galpi;

public record GalpiSummary(Galpi galpi, long phraseCount) {
}
