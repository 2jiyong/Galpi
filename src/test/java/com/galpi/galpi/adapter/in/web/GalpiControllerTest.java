package com.galpi.galpi.adapter.in.web;

import static org.hamcrest.Matchers.endsWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.galpi.common.api.ApiExceptionHandler;
import com.galpi.common.domain.InvalidFieldException;
import com.galpi.galpi.application.GalpiNotFoundException;
import com.galpi.galpi.application.port.in.GalpiSummary;
import com.galpi.galpi.application.port.in.GalpiUseCase;
import com.galpi.galpi.domain.Galpi;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(GalpiController.class)
@Import(ApiExceptionHandler.class)
class GalpiControllerTest {

    private static final Instant T0 = Instant.parse("2026-11-13T10:00:00Z");

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private GalpiUseCase useCase;

    @Test
    void listsGalpis() throws Exception {
        given(useCase.listGalpis()).willReturn(List.of(new GalpiSummary(Galpi.create("공부", null, T0), 2)));

        mockMvc.perform(get("/api/galpis"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("공부"))
                .andExpect(jsonPath("$[0].phraseCount").value(2))
                .andExpect(jsonPath("$[0].phraseSort").value("OLDEST"))
                .andExpect(jsonPath("$[0].createdAt").value("2026-11-13T10:00:00Z"))
                .andExpect(jsonPath("$[0].lastViewedAt").isEmpty());
    }

    @Test
    void createsGalpiWithLocation() throws Exception {
        Galpi galpi = Galpi.create("클라이밍", "운동 전에", T0);
        given(useCase.createGalpi("클라이밍", "운동 전에")).willReturn(new GalpiSummary(galpi, 0));

        mockMvc.perform(post("/api/galpis").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"클라이밍\",\"description\":\"운동 전에\"}"))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", endsWith("/api/galpis/" + galpi.getId())))
                .andExpect(jsonPath("$.id").value(galpi.getId().toString()));
    }

    @Test
    void returnsFieldErrorForInvalidTitle() throws Exception {
        given(useCase.createGalpi(any(), any()))
                .willThrow(new InvalidFieldException("title", "title must contain 1 to 50 characters"));

        mockMvc.perform(post("/api/galpis").contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("입력값을 확인해 주세요"))
                .andExpect(jsonPath("$.errors[0].field").value("title"))
                .andExpect(jsonPath("$.errors[0].message").value("title must contain 1 to 50 characters"));
    }

    @Test
    void returnsNotFound() throws Exception {
        UUID id = UUID.randomUUID();
        given(useCase.getGalpi(id)).willThrow(new GalpiNotFoundException(id));

        mockMvc.perform(get("/api/galpis/" + id))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("갈피를 찾을 수 없습니다"));
    }

    @Test
    void rejectsMalformedId() throws Exception {
        mockMvc.perform(get("/api/galpis/abc")).andExpect(status().isBadRequest());
    }

    @Test
    void rejectsMalformedJson() throws Exception {
        mockMvc.perform(put("/api/galpis/" + UUID.randomUUID()).contentType(MediaType.APPLICATION_JSON).content("{"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deletesAndMarksViewedWithNoContent() throws Exception {
        UUID id = UUID.randomUUID();

        mockMvc.perform(delete("/api/galpis/" + id)).andExpect(status().isNoContent());
        mockMvc.perform(post("/api/galpis/" + id + "/views")).andExpect(status().isNoContent());

        verify(useCase).deleteGalpi(id);
        verify(useCase).markViewed(id);
    }
}
