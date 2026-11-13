package com.galpi;

import static org.assertj.core.api.Assertions.assertThat;

import com.galpi.support.PostgresIntegrationTest;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class GalpiApplicationTests extends PostgresIntegrationTest {

    @Autowired
    private Flyway flyway;

    @Test
    void contextLoadsWithPostgresAndFlyway() {
        assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("3");
    }
}
