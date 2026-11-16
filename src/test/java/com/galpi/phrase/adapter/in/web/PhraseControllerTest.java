package com.galpi.phrase.adapter.in.web;

import static org.hamcrest.Matchers.endsWith;
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
import com.galpi.phrase.application.PhraseNotFoundException;
import com.galpi.phrase.application.port.in.PhraseUseCase;
import com.galpi.phrase.domain.Phrase;
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

@WebMvcTest(PhraseController.class)
@Import(ApiExceptionHandler.class)
class PhraseControllerTest {

    private static final Instant T0 = Instant.parse("2026-11-13T10:00:00Z");
    private static final UUID GALPI_ID = UUID.randomUUID();

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PhraseUseCase useCase;

    @Test
    void listsPhrases() throws Exception {
        Phrase phrase = Phrase.create(GALPI_ID, null, "발부터 보기", List.of("수업", "영상"), T0);
        given(useCase.listPhrases(GALPI_ID)).willReturn(List.of(phrase));

        mockMvc.perform(get("/api/galpis/" + GALPI_ID + "/phrases"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(phrase.getId().toString()))
                .andExpect(jsonPath("$[0].galpiId").value(GALPI_ID.toString()))
                .andExpect(jsonPath("$[0].content").value("발부터 보기"))
                .andExpect(jsonPath("$[0].sources[1]").value("영상"))
                .andExpect(jsonPath("$[0].favorite").value(false))
                .andExpect(jsonPath("$[0].createdAt").value("2026-11-13T10:00:00Z"));
    }

    @Test
    void createsPhraseWithLocation() throws Exception {
        Phrase phrase = Phrase.create(GALPI_ID, null, "문장", List.of("책"), T0);
        given(useCase.createPhrase(GALPI_ID, null, "문장", List.of("책"))).willReturn(phrase);

        mockMvc.perform(post("/api/galpis/" + GALPI_ID + "/phrases").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"문장\",\"sources\":[\"책\"]}"))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", endsWith("/api/phrases/" + phrase.getId())))
                .andExpect(jsonPath("$.content").value("문장"));
    }

    @Test
    void updatesAndDeletesPhrase() throws Exception {
        UUID otherGalpi = UUID.randomUUID();
        Phrase phrase = Phrase.create(otherGalpi, null, "바뀜", List.of(), T0);
        given(useCase.updatePhrase(phrase.getId(), null, "바뀜", List.of(), otherGalpi)).willReturn(phrase);

        mockMvc.perform(put("/api/phrases/" + phrase.getId()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"바뀜\",\"sources\":[],\"galpiId\":\"" + otherGalpi + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.galpiId").value(otherGalpi.toString()));
        mockMvc.perform(delete("/api/phrases/" + phrase.getId())).andExpect(status().isNoContent());

        verify(useCase).deletePhrase(phrase.getId());
    }

    @Test
    void changesFavorite() throws Exception {
        Phrase phrase = Phrase.create(GALPI_ID, null, "문장", List.of(), T0);
        phrase.changeFavorite(true, T0);
        given(useCase.changeFavorite(phrase.getId(), true)).willReturn(phrase);

        mockMvc.perform(put("/api/phrases/" + phrase.getId() + "/favorite").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"favorite\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.favorite").value(true));
    }

    @Test
    void rejectsMissingFavorite() throws Exception {
        mockMvc.perform(put("/api/phrases/" + UUID.randomUUID() + "/favorite")
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("favorite"));
    }

    @Test
    void returnsNotFoundForMissingPhrase() throws Exception {
        UUID id = UUID.randomUUID();
        given(useCase.changeFavorite(id, false)).willThrow(new PhraseNotFoundException(id));

        mockMvc.perform(put("/api/phrases/" + id + "/favorite").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"favorite\":false}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("문장을 찾을 수 없습니다"));
    }
}
