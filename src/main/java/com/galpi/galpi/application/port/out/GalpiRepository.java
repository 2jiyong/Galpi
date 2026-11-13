package com.galpi.galpi.application.port.out;

import com.galpi.galpi.domain.Galpi;
import java.util.Optional;
import java.util.UUID;

public interface GalpiRepository {

    Galpi save(Galpi galpi);

    Optional<Galpi> findById(UUID id);
}
