package com.galpi.phrase.adapter.in.web;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.galpi.support.PostgresIntegrationTest;
import com.jayway.jsonpath.JsonPath;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class PhraseApiIntegrationTest extends PostgresIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private String postJson(String url, String body) throws Exception {
        String response = mockMvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.id");
    }

    private String createGalpi(String title) throws Exception {
        return postJson("/api/galpis", "{\"title\":\"" + title + "\"}");
    }

    private String createPhrase(String galpiId, String content) throws Exception {
        return postJson("/api/galpis/" + galpiId + "/phrases", "{\"content\":\"" + content + "\",\"sources\":[\"수업\"]}");
    }

    @Test
    void phraseLifecycleThroughApi() throws Exception {
        String climbing = createGalpi("클라이밍");
        String study = createGalpi("공부");
        String first = createPhrase(climbing, "첫 문장");
        String second = createPhrase(climbing, "둘째 문장");

        mockMvc.perform(put("/api/phrases/" + second + "/favorite").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"favorite\":true}"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/galpis/" + climbing + "/phrases"))
                .andExpect(jsonPath("$[0].id").value(second))
                .andExpect(jsonPath("$[0].favorite").value(true))
                .andExpect(jsonPath("$[1].sources[0]").value("수업"));

        String third = createPhrase(climbing, "셋째 문장");
        mockMvc.perform(put("/api/galpis/" + climbing + "/phrase-sort").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phraseSort\":\"NEWEST\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/galpis/" + climbing + "/phrases"))
                .andExpect(jsonPath("$[*].content").value(org.hamcrest.Matchers.contains("둘째 문장", "셋째 문장", "첫 문장")));

        mockMvc.perform(put("/api/phrases/" + first).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"옮긴 문장\",\"sources\":[],\"galpiId\":\"" + study + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.galpiId").value(study));
        mockMvc.perform(get("/api/galpis/" + study + "/phrases")).andExpect(jsonPath("$", hasSize(1)));
        mockMvc.perform(get("/api/galpis/" + climbing)).andExpect(jsonPath("$.phraseCount").value(2));

        mockMvc.perform(delete("/api/phrases/" + third)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/phrases/" + third)).andExpect(status().isNotFound());
    }

    @Test
    void titleRoundTripsAndBlankBecomesNull() throws Exception {
        String climbing = createGalpi("클라이밍");
        String id = postJson("/api/galpis/" + climbing + "/phrases",
                "{\"title\":\"다리로 밀기\",\"content\":\"팔보다 다리\",\"sources\":[]}");

        mockMvc.perform(get("/api/galpis/" + climbing + "/phrases"))
                .andExpect(jsonPath("$[0].title").value("다리로 밀기"));
        mockMvc.perform(put("/api/phrases/" + id).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\" \",\"content\":\"팔보다 다리\",\"sources\":[]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").isEmpty());
    }

    @Test
    void movingToUnknownGalpiReturnsNotFound() throws Exception {
        String climbing = createGalpi("클라이밍");
        String phrase = createPhrase(climbing, "문장");

        mockMvc.perform(put("/api/phrases/" + phrase).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"문장\",\"sources\":[],\"galpiId\":\"" + UUID.randomUUID() + "\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("갈피를 찾을 수 없습니다"));
        mockMvc.perform(get("/api/galpis/" + climbing + "/phrases"))
                .andExpect(jsonPath("$[0].id").value(phrase));
    }

    @Test
    void rejectsTooManySourcesWithFieldError() throws Exception {
        String climbing = createGalpi("클라이밍");
        StringBuilder sources = new StringBuilder();
        for (int index = 0; index < 11; index++) {
            sources.append(index == 0 ? "" : ",").append("\"출처 ").append(index).append('"');
        }

        mockMvc.perform(post("/api/galpis/" + climbing + "/phrases").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"문장\",\"sources\":[" + sources + "]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("sources"));
    }
}
