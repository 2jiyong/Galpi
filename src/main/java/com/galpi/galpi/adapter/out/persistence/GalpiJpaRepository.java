package com.galpi.galpi.adapter.out.persistence;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface GalpiJpaRepository extends JpaRepository<GalpiJpaEntity, UUID> {
}
