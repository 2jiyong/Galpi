package com.galpi.galpi.application.port.in;

import java.util.List;
import java.util.UUID;

public interface GalpiUseCase {

    List<GalpiSummary> listGalpis();

    GalpiSummary getGalpi(UUID id);

    GalpiSummary createGalpi(String title, String description);

    GalpiSummary updateGalpi(UUID id, String title, String description);

    void deleteGalpi(UUID id);

    void markViewed(UUID id);
}
