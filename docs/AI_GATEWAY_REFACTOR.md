# PetEye AI Gateway — Refactor Architecture Document

> **Role:** Senior AI Architect + Senior Spring Boot Engineer + Senior React Engineer
> **Scope:** Refactor 3 AI systems từ Frontend-direct-Gemini sang Spring Boot AI Gateway
> **Stack:** Spring Boot 3.5 (Java 21) + React 19 + TypeScript + Google Gemini API

---

## Mục lục

1. [Architecture Overview](#1-architecture-overview)
2. [Backend Structure](#2-backend-structure)
3. [AI Gateway Design](#3-ai-gateway-design)
4. [Function Calling Refactor](#4-function-calling-refactor)
5. [Conversation Memory](#5-conversation-memory)
6. [Prompt Engineering Strategy](#6-prompt-engineering-strategy)
7. [Frontend Refactor](#7-frontend-refactor)
8. [Security Improvements](#8-security-improvements)
9. [Scalability Improvements](#9-scalability-improvements)
10. [Migration Plan](#10-migration-plan)
11. [Database Design](#11-database-design)
12. [Production Recommendations](#12-production-recommendations)
13. [Future Roadmap](#13-future-roadmap)

---

## 1. Architecture Overview

### 1.1 Vấn đề của kiến trúc hiện tại

```
HIỆN TẠI (BAD):
┌─────────────────────────────────────────────────────────┐
│  React Frontend                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Chatbot.tsx  │  │ShopAIAsst.tsx│  │AdminAIAsst.  │  │
│  │              │  │              │  │tsx           │  │
│  │ GEMINI_KEY   │  │ GEMINI_KEY   │  │ GEMINI_KEY   │  │
│  │ in .env ⚠️   │  │ in .env ⚠️   │  │ in .env ⚠️   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼─────────────────┼─────────────────┼──────────┘
          │                 │                 │
          └─────────────────┴─────────────────┘
                            │
                            ▼ HTTPS (API key exposed in browser!)
                    ┌───────────────┐
                    │  Gemini API   │
                    └───────────────┘
```

**Vấn đề cụ thể:**
- API key nằm trong `.env` → bundle vào JS → bất kỳ ai inspect network tab đều thấy
- Không có rate limiting → user có thể spam → hết quota
- Không có logging → không biết ai hỏi gì, tốn bao nhiêu token
- Không có fallback provider → nếu Gemini down thì toàn bộ AI chết
- Tool execution (function calling) chạy ở frontend → business logic lộ ra client
- Không có prompt injection protection
- Không có tenant isolation → shop A có thể query data shop B nếu bypass

### 1.2 Kiến trúc mới

```
MỚI (PRODUCTION-READY):
┌─────────────────────────────────────────────────────────────┐
│  React Frontend (THIN CLIENT)                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Chatbot.tsx  │  │ShopAIAsst.tsx│  │AdminAIAsst.tsx   │  │
│  │              │  │              │  │                  │  │
│  │ NO AI LOGIC  │  │ NO AI LOGIC  │  │ NO AI LOGIC      │  │
│  │ NO API KEY   │  │ NO API KEY   │  │ NO API KEY       │  │
│  │              │  │              │  │                  │  │
│  │ useAIChat()  │  │ useAIChat()  │  │ useAIChat()      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────────┘  │
└─────────┼─────────────────┼─────────────────┼──────────────┘
          │  POST /ai/chat  │                 │
          │  {agentType,    │                 │
          │   message,      │                 │
          │   sessionId}    │                 │
          └─────────────────┴─────────────────┘
                            │ JWT Bearer Token
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Spring Boot AI Gateway                                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  AIController  /ai/chat  /ai/history  /ai/clear     │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │  AIOrchestrationService                             │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │   │
│  │  │PromptBuilder│  │ConversationMem│  │SafetyFilter│  │   │
│  │  └─────────────┘  └──────────────┘  └───────────┘  │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │  ModelRouter                                        │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │ GeminiProvider (primary)                     │   │   │
│  │  │  key rotation: KEY_1 → KEY_2 → KEY_3         │   │   │
│  │  │  model fallback: 2.5-flash → 2.5-lite → ...  │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │  ToolExecutor (User AI only)                        │   │
│  │  search_shops │ get_shop_detail │ prepare_booking   │   │
│  │  get_my_pets  │ create_booking                      │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │  TokenLogger + AuditLog                             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ Server-side HTTPS (key never leaves server)
                    ┌───────────────┐
                    │  Gemini API   │
                    └───────────────┘
```

### 1.3 Vai trò từng layer

| Layer | Trách nhiệm | File |
|-------|-------------|------|
| **AIController** | Nhận request, validate JWT, route đến service | `controller/ai/AIController.java` |
| **AIOrchestrationService** | Điều phối toàn bộ flow: build prompt → call model → execute tools → save history | `service/ai/AIOrchestrationService.java` |
| **PromptBuilder** | Xây dựng system prompt + context động theo agentType và userId | `service/ai/PromptBuilderService.java` |
| **ConversationMemory** | Quản lý lịch sử hội thoại, sliding window, token budget | `service/ai/ConversationMemoryService.java` |
| **ModelRouter** | Chọn provider + model, retry logic, key rotation | `service/ai/ModelRouterService.java` |
| **GeminiProvider** | Gọi Gemini REST API, parse response, handle function calls | `service/ai/provider/GeminiProvider.java` |
| **ToolExecutor** | Thực thi function calls (search_shops, booking, v.v.) | `service/ai/tools/ToolExecutorService.java` |
| **SafetyFilter** | Detect prompt injection, filter nội dung độc hại | `service/ai/SafetyFilterService.java` |
| **TokenLogger** | Ghi log token usage, cost tracking | `service/ai/TokenLoggerService.java` |

### 1.4 Vì sao kiến trúc mới tốt hơn

| Tiêu chí | Cũ | Mới |
|----------|-----|-----|
| API key security | ❌ Exposed in browser | ✅ Server-side only |
| Rate limiting | ❌ Không có | ✅ Per-user, per-role |
| Logging | ❌ Không có | ✅ Full audit trail |
| Multi-provider | ❌ Chỉ Gemini | ✅ Pluggable providers |
| Tool execution | ❌ Frontend (logic lộ) | ✅ Backend (secure) |
| Prompt injection | ❌ Không có | ✅ SafetyFilter |
| Tenant isolation | ❌ Yếu | ✅ JWT-enforced |
| Cost tracking | ❌ Không có | ✅ Token logging |
| Testability | ❌ Khó test | ✅ Unit testable |
| Streaming | ❌ Không có | ✅ SSE support |


---

## 2. Backend Structure

### 2.1 Source tree hoàn chỉnh cho AI Gateway

```
com/sang/sourcepattern/
├── controller/
│   ├── ai/
│   │   └── AIController.java              ← Endpoint duy nhất cho tất cả AI
│   ├── AdminAIController.java             ← GIỮ NGUYÊN (history only)
│   ├── ShopAIController.java              ← GIỮ NGUYÊN (history only)
│   └── ChatbotController.java             ← GIỮ NGUYÊN (history only)
│
├── service/
│   ├── ai/
│   │   ├── AIOrchestrationService.java    ← Điều phối chính
│   │   ├── PromptBuilderService.java      ← Xây dựng prompt theo agent
│   │   ├── ConversationMemoryService.java ← Quản lý lịch sử hội thoại
│   │   ├── ModelRouterService.java        ← Chọn model + retry
│   │   ├── SafetyFilterService.java       ← Prompt injection detection
│   │   ├── TokenLoggerService.java        ← Token usage tracking
│   │   ├── ContextBuilderService.java     ← Fetch + format business data
│   │   │
│   │   ├── provider/
│   │   │   ├── AIProvider.java            ← Interface
│   │   │   ├── GeminiProvider.java        ← Google Gemini implementation
│   │   │   └── dto/
│   │   │       ├── AIRequest.java         ← Internal request model
│   │   │       ├── AIResponse.java        ← Internal response model
│   │   │       ├── AIMessage.java         ← Conversation turn
│   │   │       └── FunctionCall.java      ← Tool call model
│   │   │
│   │   └── tools/
│   │       ├── AITool.java                ← Interface
│   │       ├── ToolExecutorService.java   ← Dispatcher
│   │       ├── ToolRegistry.java          ← Đăng ký tools
│   │       ├── impl/
│   │       │   ├── SearchShopsTool.java
│   │       │   ├── SearchByServiceTool.java
│   │       │   ├── GetShopDetailTool.java
│   │       │   ├── PrepareBookingTool.java
│   │       │   ├── CreateBookingTool.java
│   │       │   └── GetMyPetsTool.java
│   │       └── schema/
│   │           └── ToolSchemaBuilder.java ← Build JSON schema cho Gemini
│   │
│   ├── impl/                              ← GIỮ NGUYÊN các service hiện có
│   │   ├── BookingServiceImpl.java
│   │   ├── ShopServiceImpl.java
│   │   └── ...
│   └── ...
│
├── dto/
│   ├── request/
│   │   └── ai/
│   │       ├── AIChatRequest.java         ← Frontend gửi lên
│   │       └── AIToolResultRequest.java   ← Tool result từ execution
│   └── response/
│       └── ai/
│           ├── AIChatResponse.java        ← Backend trả về
│           ├── AIToolResultResponse.java  ← Kết quả tool (shop cards, v.v.)
│           └── AIStreamChunk.java         ← SSE streaming chunk
│
├── entity/
│   └── ai/
│       ├── AIConversation.java            ← Session/conversation
│       ├── AIMessage.java                 ← Từng tin nhắn
│       ├── AIToolCall.java                ← Log tool calls
│       └── AITokenUsage.java              ← Token tracking
│
├── repository/
│   └── ai/
│       ├── AIConversationRepository.java
│       ├── AIMessageRepository.java
│       ├── AIToolCallRepository.java
│       └── AITokenUsageRepository.java
│
└── config/
    └── ai/
        ├── AIGatewayConfig.java           ← Bean config, API keys
        └── AIRateLimitConfig.java         ← Rate limit rules
```

### 2.2 Dependencies cần thêm vào pom.xml

```xml
<!-- Bucket4j — Rate limiting -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j-core</artifactId>
    <version>8.10.1</version>
</dependency>

<!-- Spring Retry — Retry logic -->
<dependency>
    <groupId>org.springframework.retry</groupId>
    <artifactId>spring-retry</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework</groupId>
    <artifactId>spring-aspects</artifactId>
</dependency>

<!-- Jackson — JSON parsing Gemini response -->
<!-- Đã có qua spring-boot-starter-web -->

<!-- Caffeine Cache — In-memory cache -->
<dependency>
    <groupId>com.github.ben-manes.caffeine</groupId>
    <artifactId>caffeine</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-cache</artifactId>
</dependency>
```

---

## 3. AI Gateway Design

### 3.1 AIController

```java
// controller/ai/AIController.java
@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
@Tag(name = "AI Gateway", description = "Unified AI endpoint cho User/Shop/Admin AI")
public class AIController {

    private final AIOrchestrationService orchestrationService;

    /**
     * Endpoint duy nhất cho tất cả AI agents.
     * agentType: USER_CHAT | SHOP_ASSISTANT | ADMIN_ASSISTANT
     */
    @PostMapping("/chat")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AIChatResponse> chat(
            @RequestBody @Valid AIChatRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        // Validate agentType vs role
        validateAgentAccess(request.getAgentType(), jwt);

        AIChatResponse response = orchestrationService.processMessage(request, jwt);
        return ResponseEntity.ok(response);
    }

    /**
     * SSE Streaming endpoint — trả về từng chunk text khi Gemini generate
     */
    @GetMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("isAuthenticated()")
    public SseEmitter chatStream(
            @RequestParam String message,
            @RequestParam String agentType,
            @RequestParam(required = false) String sessionId,
            @AuthenticationPrincipal Jwt jwt) {

        SseEmitter emitter = new SseEmitter(60_000L);
        orchestrationService.processMessageStream(message, agentType, sessionId, jwt, emitter);
        return emitter;
    }

    /**
     * Lấy lịch sử conversation của session hiện tại
     */
    @GetMapping("/history")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<AIChatHistoryItem>> getHistory(
            @RequestParam String agentType,
            @AuthenticationPrincipal Jwt jwt) {

        return ResponseEntity.ok(orchestrationService.getHistory(agentType, jwt));
    }

    /**
     * Xóa lịch sử
     */
    @DeleteMapping("/history")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> clearHistory(
            @RequestParam String agentType,
            @AuthenticationPrincipal Jwt jwt) {

        orchestrationService.clearHistory(agentType, jwt);
        return ResponseEntity.noContent().build();
    }

    private void validateAgentAccess(String agentType, Jwt jwt) {
        List<String> roles = jwt.getClaimAsStringList("roles");
        switch (agentType) {
            case "SHOP_ASSISTANT" -> {
                if (!roles.contains("SHOP_OWNER"))
                    throw new AppException(ErrorCode.UNAUTHORIZED);
            }
            case "ADMIN_ASSISTANT" -> {
                if (!roles.contains("ADMIN"))
                    throw new AppException(ErrorCode.UNAUTHORIZED);
            }
            case "USER_CHAT" -> {
                if (!roles.contains("USER"))
                    throw new AppException(ErrorCode.UNAUTHORIZED);
            }
            default -> throw new AppException(ErrorCode.INVALID_REQUEST);
        }
    }
}
```

### 3.2 AIOrchestrationService

```java
// service/ai/AIOrchestrationService.java
@Service
@RequiredArgsConstructor
@Slf4j
public class AIOrchestrationService {

    private final PromptBuilderService promptBuilder;
    private final ConversationMemoryService memoryService;
    private final ModelRouterService modelRouter;
    private final ToolExecutorService toolExecutor;
    private final SafetyFilterService safetyFilter;
    private final TokenLoggerService tokenLogger;
    private final ContextBuilderService contextBuilder;

    /**
     * Main flow:
     * 1. Safety check input
     * 2. Load conversation memory
     * 3. Build context (business data)
     * 4. Build prompt
     * 5. Call model (with retry + fallback)
     * 6. Execute tools if needed (User AI only)
     * 7. Call model again with tool results
     * 8. Save to memory
     * 9. Log tokens
     * 10. Return response
     */
    public AIChatResponse processMessage(AIChatRequest request, Jwt jwt) {
        String userEmail = jwt.getClaim("email");
        String agentType = request.getAgentType();

        // 1. Safety check
        safetyFilter.validate(request.getMessage());

        // 2. Load conversation memory (last N turns)
        List<AIMessage> history = memoryService.loadHistory(
            agentType, userEmail, request.getSessionId()
        );

        // 3. Build business context (data từ DB)
        String businessContext = contextBuilder.buildContext(agentType, jwt);

        // 4. Build full prompt
        AIRequest aiRequest = promptBuilder.build(
            agentType, request.getMessage(), history, businessContext, jwt
        );

        // 5. Call model (ModelRouter handles retry + fallback)
        AIResponse aiResponse = modelRouter.route(aiRequest);

        // 6. Tool execution loop (User AI only)
        ToolResult toolResult = null;
        if (aiResponse.hasFunctionCall() && "USER_CHAT".equals(agentType)) {
            FunctionCall fc = aiResponse.getFunctionCall();
            toolResult = toolExecutor.execute(fc, jwt);

            // 7. Call model again with tool result
            aiRequest = promptBuilder.buildWithToolResult(aiRequest, fc, toolResult);
            aiResponse = modelRouter.route(aiRequest);
        }

        // 8. Save to memory
        memoryService.saveMessage(agentType, userEmail, request.getSessionId(),
            request.getMessage(), aiResponse.getText(), toolResult);

        // 9. Log tokens
        tokenLogger.log(agentType, userEmail, aiResponse.getUsageMetadata());

        // 10. Return
        return AIChatResponse.builder()
            .text(aiResponse.getText())
            .toolResult(toolResult != null ? toolResult.toJson() : null)
            .sessionId(request.getSessionId())
            .model(aiResponse.getModelUsed())
            .build();
    }
}
```

### 3.3 AIProvider Interface + GeminiProvider

```java
// service/ai/provider/AIProvider.java
public interface AIProvider {
    String getName();
    AIResponse generate(AIRequest request);
    boolean isAvailable();
}

// service/ai/provider/GeminiProvider.java
@Component
@Slf4j
public class GeminiProvider implements AIProvider {

    private static final String BASE_URL =
        "https://generativelanguage.googleapis.com/v1beta/models";

    private static final List<String> MODELS = List.of(
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-flash-latest",
        "gemini-2.0-flash"
    );

    @Value("${ai.gemini.keys}")
    private List<String> apiKeys;  // Từ application.properties

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final AtomicInteger keyIndex = new AtomicInteger(0);

    @Override
    public AIResponse generate(AIRequest request) {
        List<String> errors = new ArrayList<>();

        for (String model : MODELS) {
            for (int attempt = 0; attempt < apiKeys.size(); attempt++) {
                String key = getNextKey();
                try {
                    return callGemini(model, key, request);
                } catch (GeminiRateLimitException e) {
                    log.warn("[Gemini] Rate limit on model={} key={}..., rotating", model, key.substring(0, 8));
                    errors.add(model + "/" + key.substring(0, 8) + ": 429");
                } catch (GeminiUnavailableException e) {
                    log.warn("[Gemini] Unavailable model={}, trying next", model);
                    errors.add(model + ": 503");
                    break; // Try next model
                } catch (Exception e) {
                    log.error("[Gemini] Unexpected error model={}: {}", model, e.getMessage());
                    throw new AIProviderException("Gemini error: " + e.getMessage());
                }
            }
        }

        throw new AIProviderException("All Gemini models exhausted. Errors: " + errors);
    }

    private AIResponse callGemini(String model, String key, AIRequest request) {
        String url = BASE_URL + "/" + model + ":generateContent?key=" + key;

        Map<String, Object> body = buildRequestBody(request);
        ResponseEntity<Map> response = restTemplate.postForEntity(url, body, Map.class);

        if (response.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
            throw new GeminiRateLimitException();
        }
        if (response.getStatusCode() == HttpStatus.SERVICE_UNAVAILABLE) {
            throw new GeminiUnavailableException();
        }

        return parseResponse(response.getBody(), model);
    }

    private String getNextKey() {
        int idx = keyIndex.getAndIncrement() % apiKeys.size();
        return apiKeys.get(idx);
    }

    private Map<String, Object> buildRequestBody(AIRequest request) {
        // Build Gemini-format request:
        // { system_instruction, contents, tools, generationConfig }
        Map<String, Object> body = new LinkedHashMap<>();

        if (request.getSystemPrompt() != null) {
            body.put("system_instruction", Map.of(
                "parts", List.of(Map.of("text", request.getSystemPrompt()))
            ));
        }

        List<Map<String, Object>> contents = request.getMessages().stream()
            .map(msg -> Map.of(
                "role", msg.getRole().equals("assistant") ? "model" : "user",
                "parts", List.of(Map.of("text", msg.getContent()))
            ))
            .collect(Collectors.toList());
        body.put("contents", contents);

        if (request.getTools() != null && !request.getTools().isEmpty()) {
            body.put("tools", List.of(
                Map.of("function_declarations", request.getTools())
            ));
        }

        body.put("generationConfig", Map.of(
            "temperature", 0.6,
            "maxOutputTokens", 2048
        ));

        return body;
    }

    private AIResponse parseResponse(Map<?, ?> body, String model) {
        // Parse candidates[0].content.parts[0]
        // Check for functionCall or text
        try {
            var candidates = (List<?>) body.get("candidates");
            var candidate = (Map<?, ?>) candidates.get(0);
            var content = (Map<?, ?>) candidate.get("content");
            var parts = (List<?>) content.get("parts");
            var part = (Map<?, ?>) parts.get(0);

            var usageMetadata = (Map<?, ?>) body.get("usageMetadata");
            int promptTokens = usageMetadata != null ?
                ((Number) usageMetadata.get("promptTokenCount")).intValue() : 0;
            int outputTokens = usageMetadata != null ?
                ((Number) usageMetadata.get("candidatesTokenCount")).intValue() : 0;

            if (part.containsKey("functionCall")) {
                var fc = (Map<?, ?>) part.get("functionCall");
                return AIResponse.builder()
                    .functionCall(FunctionCall.builder()
                        .name((String) fc.get("name"))
                        .args((Map<String, Object>) fc.get("args"))
                        .build())
                    .modelUsed(model)
                    .promptTokens(promptTokens)
                    .outputTokens(outputTokens)
                    .build();
            }

            return AIResponse.builder()
                .text((String) part.get("text"))
                .modelUsed(model)
                .promptTokens(promptTokens)
                .outputTokens(outputTokens)
                .build();

        } catch (Exception e) {
            throw new AIProviderException("Failed to parse Gemini response: " + e.getMessage());
        }
    }

    @Override
    public String getName() { return "gemini"; }

    @Override
    public boolean isAvailable() { return !apiKeys.isEmpty(); }
}
```

### 3.4 ModelRouter

```java
// service/ai/ModelRouterService.java
@Service
@RequiredArgsConstructor
@Slf4j
public class ModelRouterService {

    private final List<AIProvider> providers;  // Spring inject tất cả AIProvider beans

    /**
     * Route request đến provider phù hợp.
     * Hiện tại chỉ có Gemini, nhưng dễ thêm OpenAI/Claude sau.
     */
    public AIResponse route(AIRequest request) {
        // Strategy: primary provider first, fallback to others
        String preferredProvider = request.getPreferredProvider() != null
            ? request.getPreferredProvider()
            : "gemini";

        // Try preferred first
        AIProvider primary = findProvider(preferredProvider);
        if (primary != null && primary.isAvailable()) {
            try {
                return primary.generate(request);
            } catch (AIProviderException e) {
                log.warn("[ModelRouter] Primary provider {} failed: {}", preferredProvider, e.getMessage());
            }
        }

        // Fallback to other providers
        for (AIProvider provider : providers) {
            if (!provider.getName().equals(preferredProvider) && provider.isAvailable()) {
                try {
                    log.info("[ModelRouter] Falling back to provider: {}", provider.getName());
                    return provider.generate(request);
                } catch (AIProviderException e) {
                    log.warn("[ModelRouter] Fallback provider {} failed: {}", provider.getName(), e.getMessage());
                }
            }
        }

        throw new AIProviderException("All AI providers exhausted");
    }

    private AIProvider findProvider(String name) {
        return providers.stream()
            .filter(p -> p.getName().equals(name))
            .findFirst().orElse(null);
    }
}
```

### 3.5 application.properties — AI config

```properties
# AI Gateway Configuration
ai.gemini.keys=AIzaSyAODRYVOUKfn3Ex0sW_a0-YhqWsZ_43GCE,AIzaSyAQKr_MIQLhi7PogYvxmJGheppf-Zfw3e4
ai.gemini.models=gemini-2.5-flash,gemini-2.5-flash-lite,gemini-flash-latest,gemini-2.0-flash
ai.gemini.temperature=0.6
ai.gemini.max-output-tokens=2048
ai.gemini.timeout-ms=30000

# Rate limiting
ai.rate-limit.user.requests-per-minute=20
ai.rate-limit.shop.requests-per-minute=30
ai.rate-limit.admin.requests-per-minute=50

# Conversation memory
ai.memory.max-turns=10
ai.memory.max-tokens=8000

# Safety
ai.safety.enabled=true
ai.safety.max-input-length=2000
```


---

## 4. Function Calling Refactor

### 4.1 Flow mới — Tool execution ở Backend

```
FLOW CŨ (Frontend):
User → Chatbot.tsx → Gemini → functionCall → Chatbot.tsx executes tool
                                              (shopService, petService, bookingService)
                                              → functionResponse → Gemini → text → UI

FLOW MỚI (Backend):
User → React → POST /ai/chat → AIController → AIOrchestrationService
                                               → GeminiProvider → functionCall
                                               → ToolExecutorService
                                                 → SearchShopsTool (calls ShopService)
                                                 → PrepareBookingTool (calls BookingService)
                                                 → GetMyPetsTool (calls PetService)
                                               → functionResponse → GeminiProvider
                                               → text + toolResult JSON
                               ← AIChatResponse {text, toolResultJson}
React renders UI cards from toolResultJson
```

### 4.2 ToolRegistry — Đăng ký tools

```java
// service/ai/tools/ToolRegistry.java
@Component
@RequiredArgsConstructor
public class ToolRegistry {

    private final List<AITool> tools;  // Spring inject tất cả AITool beans

    /**
     * Trả về JSON schema definitions cho Gemini function_declarations
     */
    public List<Map<String, Object>> getSchemas(String agentType) {
        return tools.stream()
            .filter(t -> t.getSupportedAgents().contains(agentType))
            .map(AITool::getSchema)
            .collect(Collectors.toList());
    }

    public AITool findTool(String name) {
        return tools.stream()
            .filter(t -> t.getName().equals(name))
            .findFirst()
            .orElseThrow(() -> new AppException(ErrorCode.TOOL_NOT_FOUND));
    }
}

// service/ai/tools/AITool.java
public interface AITool {
    String getName();
    Set<String> getSupportedAgents();  // {"USER_CHAT"}
    Map<String, Object> getSchema();   // JSON schema cho Gemini
    ToolResult execute(Map<String, Object> args, Jwt jwt);
}
```

### 4.3 Tool implementations

```java
// service/ai/tools/impl/SearchShopsTool.java
@Component
@RequiredArgsConstructor
public class SearchShopsTool implements AITool {

    private final ShopService shopService;

    @Override
    public String getName() { return "search_shops"; }

    @Override
    public Set<String> getSupportedAgents() { return Set.of("USER_CHAT"); }

    @Override
    public Map<String, Object> getSchema() {
        return Map.of(
            "name", "search_shops",
            "description", "Tìm kiếm các shop thú cưng theo tên, thành phố, loại shop",
            "parameters", Map.of(
                "type", "object",
                "properties", Map.of(
                    "keyword", Map.of("type", "string", "description", "Từ khóa tên shop"),
                    "city", Map.of("type", "string", "description", "Thành phố"),
                    "shopType", Map.of("type", "string",
                        "description", "Loại: GROOMING, CLINIC, BOARDING, SPA"),
                    "sortByRating", Map.of("type", "boolean",
                        "description", "Sắp xếp theo đánh giá")
                )
            )
        );
    }

    @Override
    public ToolResult execute(Map<String, Object> args, Jwt jwt) {
        String keyword = (String) args.get("keyword");
        String city = (String) args.get("city");
        String shopType = (String) args.get("shopType");
        boolean sortByRating = Boolean.TRUE.equals(args.get("sortByRating"));

        List<ShopPublicResponse> shops = shopService.searchPublic(keyword, city, shopType);
        if (sortByRating) {
            shops.sort((a, b) -> Double.compare(
                b.getRatingAvg() != null ? b.getRatingAvg() : 0,
                a.getRatingAvg() != null ? a.getRatingAvg() : 0
            ));
        }

        List<ShopWithServicesDto> result = shops.stream()
            .limit(5)
            .map(shop -> {
                List<ServiceResponse> services = shopService.getShopServices(shop.getId());
                return new ShopWithServicesDto(shop, services);
            })
            .collect(Collectors.toList());

        return ToolResult.builder()
            .type("shop_list")
            .data(Map.of("shops", result))
            .geminiSummary(Map.of(
                "count", result.size(),
                "shops", result.stream().map(s -> Map.of(
                    "id", s.getShop().getId(),
                    "name", s.getShop().getShopName(),
                    "rating", s.getShop().getRatingAvg(),
                    "city", s.getShop().getCity()
                )).collect(Collectors.toList())
            ))
            .build();
    }
}

// service/ai/tools/impl/PrepareBookingTool.java
@Component
@RequiredArgsConstructor
public class PrepareBookingTool implements AITool {

    private final ShopService shopService;
    private final PetService petService;
    private final UserRepository userRepository;

    @Override
    public String getName() { return "prepare_booking"; }

    @Override
    public Set<String> getSupportedAgents() { return Set.of("USER_CHAT"); }

    @Override
    public ToolResult execute(Map<String, Object> args, Jwt jwt) {
        String userEmail = jwt.getClaim("email");
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        String shopName = (String) args.get("shopName");
        String serviceKeyword = ((String) args.get("serviceKeyword")).toLowerCase();
        String petName = (String) args.getOrDefault("petName", "");

        // 1. Find shop
        List<ShopPublicResponse> shops = shopService.searchPublic(shopName, null, null);
        ShopPublicResponse matchedShop = shops.stream()
            .filter(s -> shopName == null ||
                s.getShopName().toLowerCase().contains(shopName.toLowerCase()))
            .findFirst()
            .orElse(shops.isEmpty() ? null : shops.get(0));

        if (matchedShop == null) {
            return ToolResult.error("Không tìm thấy shop: " + shopName);
        }

        // 2. Find service
        List<ServiceResponse> services = shopService.getShopServices(matchedShop.getId());
        ServiceResponse matchedService = services.stream()
            .filter(s -> s.getServiceName().toLowerCase().contains(serviceKeyword) ||
                s.getCategory().toLowerCase().contains(serviceKeyword))
            .findFirst().orElse(null);

        if (matchedService == null) {
            return ToolResult.error("Shop không có dịch vụ: " + serviceKeyword);
        }

        // 3. Find pet
        List<PetResponse> pets = petService.getByOwner(user.getId());
        PetResponse matchedPet = pets.stream()
            .filter(p -> p.isActive() && (petName.isEmpty() ||
                p.getName().toLowerCase().contains(petName.toLowerCase()) ||
                p.getSpecies().toLowerCase().contains(petName.toLowerCase())))
            .findFirst().orElse(null);

        if (matchedPet == null) {
            return ToolResult.error("Không tìm thấy thú cưng. Vui lòng thêm thú cưng trong hồ sơ.");
        }

        // 4. Return booking_picker data
        Map<String, Object> pickerData = Map.of(
            "shopId", matchedShop.getId(),
            "shopName", matchedShop.getShopName(),
            "serviceId", matchedService.getId(),
            "serviceName", matchedService.getServiceName(),
            "servicePrice", matchedService.getPrice(),
            "petId", matchedPet.getId(),
            "petName", matchedPet.getName()
        );

        return ToolResult.builder()
            .type("booking_picker")
            .data(pickerData)
            .geminiSummary(Map.of(
                "ready", true,
                "shopName", matchedShop.getShopName(),
                "serviceName", matchedService.getServiceName(),
                "petName", matchedPet.getName(),
                "message", "Đã tìm thấy đầy đủ thông tin, hiển thị form chọn ngày giờ"
            ))
            .build();
    }

    @Override
    public Map<String, Object> getSchema() {
        return Map.of(
            "name", "prepare_booking",
            "description", "Tự động tìm shop, dịch vụ, thú cưng rồi hiển thị form đặt lịch",
            "parameters", Map.of(
                "type", "object",
                "properties", Map.of(
                    "shopName", Map.of("type", "string"),
                    "serviceKeyword", Map.of("type", "string"),
                    "petName", Map.of("type", "string")
                ),
                "required", List.of("serviceKeyword")
            )
        );
    }
}
```

### 4.4 ToolExecutorService — Dispatcher

```java
// service/ai/tools/ToolExecutorService.java
@Service
@RequiredArgsConstructor
@Slf4j
public class ToolExecutorService {

    private final ToolRegistry toolRegistry;

    public ToolResult execute(FunctionCall functionCall, Jwt jwt) {
        String toolName = functionCall.getName();
        Map<String, Object> args = functionCall.getArgs();

        log.info("[ToolExecutor] Executing tool: {} with args: {}", toolName, args.keySet());

        try {
            AITool tool = toolRegistry.findTool(toolName);
            ToolResult result = tool.execute(args, jwt);
            log.info("[ToolExecutor] Tool {} completed, type: {}", toolName, result.getType());
            return result;
        } catch (AppException e) {
            log.warn("[ToolExecutor] Tool {} failed with AppException: {}", toolName, e.getMessage());
            return ToolResult.error(e.getMessage());
        } catch (Exception e) {
            log.error("[ToolExecutor] Tool {} unexpected error: {}", toolName, e.getMessage(), e);
            return ToolResult.error("Lỗi thực thi tool: " + e.getMessage());
        }
    }
}
```


---

## 5. Conversation Memory

### 5.1 ConversationMemoryService

```java
// service/ai/ConversationMemoryService.java
@Service
@RequiredArgsConstructor
@Slf4j
public class ConversationMemoryService {

    private final AIMessageRepository messageRepository;
    private final AIConversationRepository conversationRepository;

    @Value("${ai.memory.max-turns:10}")
    private int maxTurns;

    @Value("${ai.memory.max-tokens:8000}")
    private int maxTokens;

    /**
     * Load lịch sử hội thoại cho một session.
     * Áp dụng sliding window: chỉ lấy maxTurns gần nhất.
     * Đảm bảo không vượt quá maxTokens (ước tính 4 chars = 1 token).
     */
    public List<AIMessage> loadHistory(String agentType, String userEmail, String sessionId) {
        String resolvedSessionId = resolveSessionId(agentType, userEmail, sessionId);

        List<AIMessage> allMessages = messageRepository
            .findBySessionIdOrderByCreatedAtAsc(resolvedSessionId);

        // Sliding window: lấy maxTurns * 2 messages (user + assistant pairs)
        int startIdx = Math.max(0, allMessages.size() - (maxTurns * 2));
        List<AIMessage> window = allMessages.subList(startIdx, allMessages.size());

        // Token budget: ước tính và cắt nếu cần
        return applyTokenBudget(window);
    }

    /**
     * Lưu cặp user message + assistant response vào memory
     */
    public void saveMessage(String agentType, String userEmail, String sessionId,
                            String userMessage, String assistantResponse,
                            ToolResult toolResult) {
        String resolvedSessionId = resolveSessionId(agentType, userEmail, sessionId);

        // Save user message
        messageRepository.save(AIMessage.builder()
            .sessionId(resolvedSessionId)
            .role("user")
            .content(userMessage)
            .agentType(agentType)
            .build());

        // Save assistant response
        messageRepository.save(AIMessage.builder()
            .sessionId(resolvedSessionId)
            .role("assistant")
            .content(assistantResponse)
            .toolResultJson(toolResult != null ? toolResult.toJson() : null)
            .agentType(agentType)
            .build());
    }

    /**
     * Session ID strategy:
     * - USER_CHAT: "user_chat_{userId}" — 1 session per user
     * - SHOP_ASSISTANT: "shop_{shopId}" — 1 session per shop
     * - ADMIN_ASSISTANT: "admin_{userId}" — 1 session per admin
     * - Custom sessionId nếu muốn multi-session trong tương lai
     */
    private String resolveSessionId(String agentType, String userEmail, String sessionId) {
        if (sessionId != null && !sessionId.isBlank()) return sessionId;
        return agentType.toLowerCase() + "_" + userEmail.replace("@", "_at_");
    }

    private List<AIMessage> applyTokenBudget(List<AIMessage> messages) {
        int totalChars = 0;
        List<AIMessage> result = new ArrayList<>();

        // Duyệt từ cuối lên để ưu tiên messages gần nhất
        for (int i = messages.size() - 1; i >= 0; i--) {
            int chars = messages.get(i).getContent().length();
            if (totalChars + chars > maxTokens * 4) break;
            totalChars += chars;
            result.add(0, messages.get(i));
        }

        return result;
    }
}
```

### 5.2 Summarization Strategy (tương lai)

```
Khi conversation quá dài (> maxTurns):
1. Lấy các messages cũ (ngoài sliding window)
2. Gọi Gemini với prompt: "Tóm tắt cuộc hội thoại sau trong 3-5 câu"
3. Lưu summary vào AIConversation.summary
4. Xóa các messages cũ đã được tóm tắt
5. Inject summary vào system prompt: "Tóm tắt hội thoại trước: {summary}"

Ví dụ system prompt với summary:
---
[SYSTEM]
Bạn là PetEye Assistant.
[CONVERSATION SUMMARY]
User đã hỏi về shop grooming ở HCM. Đã tìm thấy PetCareSG với dịch vụ tắm 150k.
User có thú cưng tên Mèo, giống Munchkin, 3 tuổi.
[END SUMMARY]
---
```

---

## 6. Prompt Engineering Strategy

### 6.1 PromptBuilderService

```java
// service/ai/PromptBuilderService.java
@Service
@RequiredArgsConstructor
public class PromptBuilderService {

    private final ToolRegistry toolRegistry;

    public AIRequest build(String agentType, String userMessage,
                           List<AIMessage> history, String businessContext, Jwt jwt) {
        String systemPrompt = buildSystemPrompt(agentType, businessContext, jwt);
        List<Map<String, String>> messages = buildMessages(history, userMessage);
        List<Map<String, Object>> tools = agentType.equals("USER_CHAT")
            ? toolRegistry.getSchemas("USER_CHAT")
            : List.of();  // Shop/Admin AI không dùng function calling

        return AIRequest.builder()
            .systemPrompt(systemPrompt)
            .messages(messages)
            .tools(tools)
            .agentType(agentType)
            .build();
    }

    private String buildSystemPrompt(String agentType, String businessContext, Jwt jwt) {
        return switch (agentType) {
            case "USER_CHAT" -> buildUserChatPrompt(jwt);
            case "SHOP_ASSISTANT" -> buildShopPrompt(businessContext);
            case "ADMIN_ASSISTANT" -> buildAdminPrompt(businessContext);
            default -> throw new AppException(ErrorCode.INVALID_REQUEST);
        };
    }

    private String buildUserChatPrompt(Jwt jwt) {
        String userName = jwt.getClaim("name");
        String userId = jwt.getClaim("sub");
        boolean isLoggedIn = userId != null;

        return """
            Bạn là PetEye Assistant — trợ lý AI thông minh của ứng dụng PetEye.
            Chuyên hỗ trợ chủ thú cưng tìm kiếm và đặt lịch dịch vụ chăm sóc thú cưng.

            NHIỆM VỤ:
            1. Gợi ý shop phù hợp dựa trên yêu cầu (dịch vụ, vị trí, ngân sách)
            2. Ưu tiên shop có đánh giá cao (ratingAvg) khi gợi ý
            3. Hỗ trợ đặt lịch tự động khi user đồng ý
            4. Tư vấn chăm sóc thú cưng dựa trên thông tin pet

            QUY TẮC CHỌN TOOL:
            - Muốn ĐẶT LỊCH với tên shop + dịch vụ + tên thú cưng → dùng NGAY prepare_booking
            - Hỏi về thú cưng → dùng get_my_pets
            - Hỏi về dịch vụ cụ thể → dùng search_by_service
            - Hỏi về shop → dùng search_shops
            - Xem chi tiết 1 shop → dùng get_shop_detail

            GUARDRAILS:
            - Không bịa thông tin về shop hay pet, chỉ dùng dữ liệu từ tool
            - Không thực hiện hành động ngoài phạm vi (không xóa dữ liệu, không thay đổi tài khoản)
            - Nếu user hỏi về chủ đề không liên quan thú cưng, lịch sự từ chối và hướng về chủ đề chính
            - Trả lời bằng tiếng Việt, thân thiện, ngắn gọn

            THÔNG TIN USER:
            %s
            """.formatted(isLoggedIn
                ? "Tên: " + userName + ", ID: " + userId + " (đã đăng nhập)"
                : "Chưa đăng nhập — nhắc user đăng nhập để đặt lịch");
    }

    private String buildShopPrompt(String businessContext) {
        return """
            Bạn là PetEye Business AI — trợ lý phân tích kinh doanh cho chủ shop thú cưng.

            NHIỆM VỤ:
            - Phân tích dữ liệu kinh doanh thực tế của shop
            - Đưa ra nhận xét cụ thể dựa trên số liệu
            - Đề xuất hành động có thể thực hiện ngay
            - Phát hiện rủi ro và cơ hội tăng trưởng

            GUARDRAILS:
            - Chỉ phân tích dữ liệu được cung cấp, không bịa số liệu
            - Không đề xuất hành động vi phạm pháp luật
            - Không tiết lộ thông tin của shop khác
            - Trả lời bằng tiếng Việt, có cấu trúc rõ ràng, dùng emoji phù hợp

            DỮ LIỆU SHOP HIỆN TẠI:
            %s
            """.formatted(businessContext);
    }

    private String buildAdminPrompt(String businessContext) {
        return """
            Bạn là PetEye Admin AI — trợ lý quản trị hệ thống thông minh.

            NHIỆM VỤ:
            - Phân tích dữ liệu toàn nền tảng PetEye
            - Phát hiện rủi ro, bất thường, vi phạm
            - Đề xuất chính sách và chiến lược tăng trưởng
            - Hỗ trợ ra quyết định quản trị

            GUARDRAILS:
            - Chỉ phân tích dữ liệu được cung cấp
            - Không tiết lộ thông tin cá nhân của user cụ thể
            - Không đề xuất hành động vi phạm quyền riêng tư
            - Ưu tiên xử lý vấn đề khẩn cấp trước
            - Trả lời bằng tiếng Việt, có cấu trúc rõ ràng

            DỮ LIỆU HỆ THỐNG:
            %s
            """.formatted(businessContext);
    }
}
```

### 6.2 ContextBuilderService — Fetch business data

```java
// service/ai/ContextBuilderService.java
@Service
@RequiredArgsConstructor
public class ContextBuilderService {

    private final ShopService shopService;
    private final BookingService bookingService;
    private final StaffService staffService;
    private final ServiceService serviceService;
    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    // Admin services
    private final AdminDashboardService adminDashboardService;

    /**
     * Build context string theo agentType.
     * USER_CHAT: không cần context (dùng tools)
     * SHOP_ASSISTANT: data của shop hiện tại
     * ADMIN_ASSISTANT: data toàn hệ thống
     */
    public String buildContext(String agentType, Jwt jwt) {
        return switch (agentType) {
            case "USER_CHAT" -> "";  // User AI dùng tools, không cần context
            case "SHOP_ASSISTANT" -> buildShopContext(jwt);
            case "ADMIN_ASSISTANT" -> buildAdminContext(jwt);
            default -> "";
        };
    }

    private String buildShopContext(Jwt jwt) {
        String email = jwt.getClaim("email");
        User user = userRepository.findByEmail(email).orElseThrow();
        Shop shop = shopRepository.findByOwnerId(user.getId()).orElseThrow();

        ShopDashboardResponse dashboard = shopService.getDashboard(shop.getId());
        List<BookingResponse> bookings = bookingService.getShopBookings(shop.getId());
        List<StaffResponse> staff = staffService.getByShopId(shop.getId());
        List<ServiceResponse> services = serviceService.getByShopId(shop.getId());

        // Tính toán stats
        Map<String, Long> statusCount = bookings.stream()
            .collect(Collectors.groupingBy(BookingResponse::getStatus, Collectors.counting()));

        Map<String, Long> serviceUsage = bookings.stream()
            .collect(Collectors.groupingBy(BookingResponse::getServiceName, Collectors.counting()));

        List<String> topServices = serviceUsage.entrySet().stream()
            .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
            .limit(5)
            .map(e -> e.getKey() + "(" + e.getValue() + " lần)")
            .collect(Collectors.toList());

        return """
            === DỮ LIỆU SHOP (cập nhật: %s) ===
            SHOP: %s | Loại: %s | Rating: %.1f/5 | %s
            Địa chỉ: %s, %s

            DOANH THU:
            - Tổng: %sđ | Tháng này: %sđ

            LỊCH HẸN:
            - Tổng: %d | Theo trạng thái: %s

            DỊCH VỤ HOT: %s

            NHÂN VIÊN: %d tổng (%d active)
            === HẾT DỮ LIỆU ===
            """.formatted(
                LocalDate.now(),
                shop.getShopName(), shop.getShopType(),
                shop.getRatingAvg() != null ? shop.getRatingAvg() : 0.0,
                shop.isVerified() ? "✅ Đã xác minh" : "⚠️ Chưa xác minh",
                shop.getAddress(), shop.getCity(),
                formatNumber(dashboard.getTotalRevenue()),
                formatNumber(dashboard.getRevenueThisMonth()),
                bookings.size(),
                statusCount.entrySet().stream()
                    .map(e -> e.getKey() + ":" + e.getValue())
                    .collect(Collectors.joining(", ")),
                String.join(", ", topServices),
                staff.size(),
                staff.stream().filter(StaffResponse::isActive).count()
            );
    }

    private String buildAdminContext(Jwt jwt) {
        AdminDashboardStats stats = adminDashboardService.getStats();
        List<ShopResponse> allShops = shopService.getAllShops();
        List<UserResponse> allUsers = userRepository.findAll().stream()
            .map(this::toUserResponse).collect(Collectors.toList());

        long verifiedShops = allShops.stream().filter(ShopResponse::isVerified).count();
        long pendingShops = allShops.stream().filter(s -> !s.isVerified()).count();

        Map<String, Long> roleCount = allUsers.stream()
            .collect(Collectors.groupingBy(
                u -> u.getRoles().isEmpty() ? "UNKNOWN" : u.getRoles().get(0).getName(),
                Collectors.counting()
            ));

        return """
            === DỮ LIỆU HỆ THỐNG PETEYE (cập nhật: %s) ===
            TỔNG QUAN:
            - Doanh thu: %sđ | Users: %d | Shops: %d | Bookings: %d
            - Tin nhắn chưa đọc: %d

            SHOP:
            - Đã duyệt: %d | Chờ duyệt: %d
            - Phân loại: %s

            MEMBER:
            - Tổng: %d | Theo role: %s
            === HẾT DỮ LIỆU ===
            """.formatted(
                LocalDate.now(),
                formatNumber(stats.getTotalRevenue()),
                stats.getTotalUsers(), stats.getTotalShops(), stats.getTotalBookings(),
                stats.getUnreadMessages(),
                verifiedShops, pendingShops,
                allShops.stream()
                    .collect(Collectors.groupingBy(ShopResponse::getShopType, Collectors.counting()))
                    .entrySet().stream().map(e -> e.getKey() + ":" + e.getValue())
                    .collect(Collectors.joining(", ")),
                allUsers.size(),
                roleCount.entrySet().stream()
                    .map(e -> e.getKey() + ":" + e.getValue())
                    .collect(Collectors.joining(", "))
            );
    }

    private String formatNumber(Long n) {
        return n != null ? String.format("%,d", n).replace(",", ".") : "0";
    }
}
```

---

## 7. Frontend Refactor

### 7.1 API layer mới — aiChat.service.ts

```typescript
// services/ai/aiGateway.service.ts
import apiClient from '../apiClient';

export type AgentType = 'USER_CHAT' | 'SHOP_ASSISTANT' | 'ADMIN_ASSISTANT';

export interface AIChatRequest {
  agentType: AgentType;
  message: string;
  sessionId?: string;
}

export interface AIChatResponse {
  text: string;
  toolResultJson?: string;  // JSON string của ToolResult
  sessionId: string;
  model: string;            // Model đã dùng (để debug)
}

export interface AIHistoryItem {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  toolResultJson?: string;
  createdAt: string;
}

export const aiGatewayService = {
  /**
   * Gửi message đến AI Gateway backend.
   * Backend xử lý toàn bộ: prompt building, Gemini call, tool execution.
   */
  sendMessage: async (request: AIChatRequest): Promise<AIChatResponse> => {
    const res = await apiClient.post<{ result: AIChatResponse }>('/ai/chat', request);
    return res.data.result;
  },

  /**
   * Lấy lịch sử chat
   */
  getHistory: async (agentType: AgentType): Promise<AIHistoryItem[]> => {
    const res = await apiClient.get<{ result: AIHistoryItem[] }>('/ai/history', {
      params: { agentType }
    });
    return res.data.result ?? [];
  },

  /**
   * Xóa lịch sử
   */
  clearHistory: async (agentType: AgentType): Promise<void> => {
    await apiClient.delete('/ai/history', { params: { agentType } });
  },
};
```

### 7.2 Custom hook — useAIChat

```typescript
// hooks/useAIChat.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { aiGatewayService, AgentType, AIHistoryItem } from '../services/ai/aiGateway.service';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolResult?: unknown;  // Parsed từ toolResultJson
  isLoading?: boolean;
}

function uid() { return Math.random().toString(36).slice(2); }

export function useAIChat(agentType: AgentType, welcomeMessage: string) {
  const WELCOME: ChatMessage = {
    id: 'welcome', role: 'assistant',
    content: welcomeMessage, timestamp: new Date(),
  };

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const sessionId = useRef<string>(agentType + '_' + Date.now());

  // Load history on mount
  useEffect(() => {
    if (historyLoaded) return;
    aiGatewayService.getHistory(agentType)
      .then(records => {
        if (records.length > 0) {
          const loaded: ChatMessage[] = records.map(r => ({
            id: String(r.id),
            role: r.role,
            content: r.content,
            timestamp: new Date(r.createdAt),
            toolResult: r.toolResultJson ? JSON.parse(r.toolResultJson) : undefined,
          }));
          setMessages(prev => [prev[0], ...loaded]);
        }
        setHistoryLoaded(true);
      })
      .catch(() => setHistoryLoaded(true));
  }, [agentType, historyLoaded]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: uid(), role: 'user', content: text, timestamp: new Date()
    };
    const loadingMsg: ChatMessage = {
      id: uid(), role: 'assistant', content: '', timestamp: new Date(), isLoading: true
    };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setIsLoading(true);

    try {
      // Frontend chỉ gửi message — backend xử lý tất cả
      const response = await aiGatewayService.sendMessage({
        agentType,
        message: text,
        sessionId: sessionId.current,
      });

      const assistantMsg: ChatMessage = {
        id: uid(),
        role: 'assistant',
        content: response.text,
        timestamp: new Date(),
        toolResult: response.toolResultJson
          ? JSON.parse(response.toolResultJson)
          : undefined,
      };

      setMessages(prev => prev.map(m =>
        m.isLoading ? assistantMsg : m
      ));
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.isLoading
          ? { ...m, content: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.', isLoading: false }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  }, [agentType, isLoading]);

  const clearHistory = useCallback(async () => {
    await aiGatewayService.clearHistory(agentType);
    setMessages([WELCOME]);
    setHistoryLoaded(false);
  }, [agentType]);

  return { messages, isLoading, sendMessage, clearHistory };
}
```

### 7.3 Refactored Chatbot.tsx (thin client)

```typescript
// components/Chatbot.tsx — SAU REFACTOR
// Không còn: GEMINI_API_KEY, callGemini(), tool execution, chatbot.service.ts
// Chỉ còn: UI rendering + useAIChat hook

export default function Chatbot() {
  const { user } = useAuth();
  const { messages, isLoading, sendMessage, clearHistory } = useAIChat(
    'USER_CHAT',
    `Xin chào${user?.name ? ` **${user.name}**` : ''}! 👋 Tôi là **PetEye Assistant**...`
  );

  // ... UI code giữ nguyên hoàn toàn
  // Chỉ thay: handleSend() → sendMessage()
  // Chỉ thay: handleClearHistory() → clearHistory()
}
```

### 7.4 Refactored ShopAIAssistant.tsx (thin client)

```typescript
// pages/shop/ShopAIAssistant.tsx — SAU REFACTOR
// Xóa: GEMINI_KEYS, callGeminiText(), buildContext(), shopService/bookingService imports
// Giữ: UI layout, StatCard, RichText, QuickActions

export default function ShopAIAssistant() {
  const { messages, isLoading, sendMessage, clearHistory } = useAIChat(
    'SHOP_ASSISTANT',
    `# Xin chào! Tôi là PetEye Business AI 🤖\n\n...`
  );

  // Stats vẫn fetch ở frontend để hiển thị StatBar
  const { data: dashboard } = useQuery({ queryKey: ['shopDashboard'], queryFn: shopService.getDashboard });

  // ... UI code giữ nguyên
  // Chỉ thay: handleSend() → sendMessage()
}
```

### 7.5 Xóa khỏi frontend sau refactor

```
Files cần xóa/sửa:
- src/services/chatbot.service.ts     → XÓA (toàn bộ Gemini logic)
- src/services/aiChat.service.ts      → THAY bằng aiGateway.service.ts
- src/services/chatHistory.service.ts → THAY bằng aiGateway.service.ts

Env vars cần xóa:
- VITE_GEMINI_API_KEY     → XÓA khỏi .env
- VITE_GEMINI_API_KEY_2   → XÓA khỏi .env
- VITE_GEMINI_API_KEY_3   → XÓA khỏi .env
```


---

## 8. Security Improvements

### 8.1 API Key Protection

```
TRƯỚC: VITE_GEMINI_API_KEY trong .env → bundle vào JS → lộ trong browser
SAU:   Keys chỉ trong application.properties → không bao giờ rời server

application.properties:
ai.gemini.keys=${GEMINI_KEY_1},${GEMINI_KEY_2},${GEMINI_KEY_3}

Docker/K8s secret:
GEMINI_KEY_1=AIzaSy...
GEMINI_KEY_2=AIzaSy...
```

### 8.2 SafetyFilterService — Prompt Injection Prevention

```java
// service/ai/SafetyFilterService.java
@Service
@Slf4j
public class SafetyFilterService {

    // Patterns phổ biến của prompt injection
    private static final List<Pattern> INJECTION_PATTERNS = List.of(
        Pattern.compile("ignore (previous|all|above) instructions", Pattern.CASE_INSENSITIVE),
        Pattern.compile("you are now", Pattern.CASE_INSENSITIVE),
        Pattern.compile("forget (everything|all|your instructions)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("act as (a|an|if)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\[SYSTEM\\]", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\[INST\\]", Pattern.CASE_INSENSITIVE),
        Pattern.compile("jailbreak", Pattern.CASE_INSENSITIVE),
        Pattern.compile("DAN mode", Pattern.CASE_INSENSITIVE)
    );

    @Value("${ai.safety.max-input-length:2000}")
    private int maxInputLength;

    public void validate(String input) {
        if (input == null || input.isBlank()) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Message không được để trống");
        }

        if (input.length() > maxInputLength) {
            throw new AppException(ErrorCode.INVALID_REQUEST,
                "Message quá dài (tối đa " + maxInputLength + " ký tự)");
        }

        for (Pattern pattern : INJECTION_PATTERNS) {
            if (pattern.matcher(input).find()) {
                log.warn("[SafetyFilter] Potential prompt injection detected: {}",
                    input.substring(0, Math.min(100, input.length())));
                throw new AppException(ErrorCode.PROMPT_INJECTION_DETECTED,
                    "Nội dung không hợp lệ");
            }
        }
    }
}
```

### 8.3 Rate Limiting — Bucket4j

```java
// config/ai/AIRateLimitConfig.java
@Configuration
public class AIRateLimitConfig {

    // Mỗi user có 1 bucket riêng, lưu trong ConcurrentHashMap
    private final Map<String, Bucket> userBuckets = new ConcurrentHashMap<>();

    public Bucket getBucketForUser(String userEmail, String role) {
        String key = role + "_" + userEmail;
        return userBuckets.computeIfAbsent(key, k -> createBucket(role));
    }

    private Bucket createBucket(String role) {
        int requestsPerMinute = switch (role) {
            case "USER" -> 20;
            case "SHOP_OWNER" -> 30;
            case "ADMIN" -> 50;
            default -> 10;
        };

        return Bucket.builder()
            .addLimit(Bandwidth.classic(requestsPerMinute,
                Refill.greedy(requestsPerMinute, Duration.ofMinutes(1))))
            .build();
    }
}

// Trong AIController:
@PostMapping("/chat")
public ResponseEntity<AIChatResponse> chat(@RequestBody AIChatRequest request, @AuthenticationPrincipal Jwt jwt) {
    String email = jwt.getClaim("email");
    String role = ((List<String>) jwt.getClaim("roles")).get(0);

    Bucket bucket = rateLimitConfig.getBucketForUser(email, role);
    if (!bucket.tryConsume(1)) {
        throw new AppException(ErrorCode.RATE_LIMIT_EXCEEDED,
            "Bạn đã gửi quá nhiều tin nhắn. Vui lòng chờ 1 phút.");
    }

    // ... process
}
```

### 8.4 Tenant Isolation

```java
// Trong ContextBuilderService — SHOP_ASSISTANT:
// Luôn lấy shopId từ JWT, không bao giờ từ request body
private String buildShopContext(Jwt jwt) {
    String email = jwt.getClaim("email");
    User user = userRepository.findByEmail(email).orElseThrow();
    // shopId được resolve từ JWT → không thể giả mạo
    Shop shop = shopRepository.findByOwnerId(user.getId()).orElseThrow();
    // Chỉ fetch data của shop này
    ...
}

// Trong ToolExecutorService — USER_CHAT:
// Luôn lấy userId từ JWT khi fetch pets/bookings
public ToolResult execute(FunctionCall fc, Jwt jwt) {
    // jwt được inject từ Spring Security context
    // Không bao giờ trust userId từ args của Gemini
    ...
}
```

---

## 9. Scalability Improvements

### 9.1 Caching — Context Builder

```java
// Dùng Spring Cache + Caffeine để cache business context
// Context thay đổi không thường xuyên → cache 5 phút

@Service
public class ContextBuilderService {

    @Cacheable(value = "shopContext", key = "#shopId", unless = "#result == null")
    public String buildShopContextById(int shopId) {
        // Fetch data và build context string
        // Cache 5 phút, invalidate khi có booking mới
    }

    @CacheEvict(value = "shopContext", key = "#shopId")
    public void invalidateShopContext(int shopId) {
        // Gọi khi có booking mới, staff thay đổi, v.v.
    }
}

// application.properties:
spring.cache.type=caffeine
spring.cache.caffeine.spec=maximumSize=500,expireAfterWrite=5m
```

### 9.2 Async Processing

```java
// Lưu history và log tokens bất đồng bộ — không block response
@Service
public class AIOrchestrationService {

    @Async
    public void saveHistoryAsync(String agentType, String email,
                                  String sessionId, String userMsg,
                                  String assistantMsg, ToolResult toolResult) {
        memoryService.saveMessage(agentType, email, sessionId,
            userMsg, assistantMsg, toolResult);
    }

    @Async
    public void logTokensAsync(String agentType, String email,
                                UsageMetadata usage) {
        tokenLogger.log(agentType, email, usage);
    }
}
```

### 9.3 Future: Redis + Queue Architecture

```
Khi scale lên nhiều instance:

┌──────────┐    ┌──────────┐    ┌──────────┐
│ Instance │    │ Instance │    │ Instance │
│    1     │    │    2     │    │    3     │
└────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │
     └───────────────┴───────────────┘
                     │
              ┌──────▼──────┐
              │  Redis      │
              │  - Rate limit buckets (shared)
              │  - Session cache
              │  - Context cache
              └─────────────┘

Cho AI requests nặng (Admin context build):
┌──────────┐    ┌──────────────┐    ┌──────────────┐
│ Frontend │───▶│ AI Controller│───▶│ Message Queue│
└──────────┘    └──────────────┘    │ (RabbitMQ/   │
                                    │  Kafka)       │
                                    └──────┬───────┘
                                           │
                                    ┌──────▼───────┐
                                    │ AI Worker    │
                                    │ (async)      │
                                    └──────────────┘
```

---

## 10. Migration Plan

### Phase 1 — Backend AI Gateway (Tuần 1-2)

**Mục tiêu:** Tạo backend AI Gateway mà không break production hiện tại.

```
Bước 1.1: Thêm dependencies vào pom.xml
  + bucket4j-core
  + spring-retry
  + caffeine

Bước 1.2: Tạo package structure
  + controller/ai/AIController.java
  + service/ai/ (tất cả services)
  + service/ai/provider/GeminiProvider.java
  + service/ai/tools/ (tất cả tools)

Bước 1.3: Config
  + config/ai/AIGatewayConfig.java
  + Thêm ai.gemini.keys vào application.properties
  + Thêm ai.rate-limit.* vào application.properties

Bước 1.4: Test backend
  + Unit test GeminiProvider với mock HTTP
  + Unit test từng Tool
  + Integration test AIController với Postman
  + Verify: POST /ai/chat với JWT → nhận response đúng

Rollback: Xóa package ai/ — không ảnh hưởng code cũ
```

### Phase 2 — Migrate Admin AI (Tuần 3)

**Lý do chọn Admin AI trước:** Ít user nhất, dễ test, ít rủi ro nhất.

```
Bước 2.1: Tạo aiGateway.service.ts ở frontend
  + Giữ nguyên aiChat.service.ts (chưa xóa)
  + Tạo mới services/ai/aiGateway.service.ts

Bước 2.2: Tạo useAIChat hook
  + hooks/useAIChat.ts

Bước 2.3: Refactor AdminAIAssistant.tsx
  + Thay callGeminiText() → useAIChat('ADMIN_ASSISTANT')
  + Xóa GEMINI_KEYS, buildContext() khỏi file
  + Giữ nguyên toàn bộ UI

Bước 2.4: Test
  + Login với ADMIN account
  + Test tất cả 8 quick actions
  + Verify history load/save/clear

Rollback: Revert AdminAIAssistant.tsx về commit trước
```

### Phase 3 — Migrate Shop AI (Tuần 4)

```
Bước 3.1: Refactor ShopAIAssistant.tsx
  + Thay callGeminiText() → useAIChat('SHOP_ASSISTANT')
  + Xóa GEMINI_KEYS, buildContext() khỏi file
  + Giữ nguyên StatBar (vẫn fetch data ở FE để hiển thị)

Bước 3.2: Test
  + Login với SHOP_OWNER account
  + Test tất cả 8 quick actions
  + Verify context data đúng (doanh thu, booking, v.v.)

Rollback: Revert ShopAIAssistant.tsx
```

### Phase 4 — Migrate User AI Chatbot (Tuần 5-6)

**Phức tạp nhất** vì có function calling và booking flow.

```
Bước 4.1: Verify tất cả tools hoạt động ở backend
  + Test search_shops
  + Test search_by_service
  + Test prepare_booking (quan trọng nhất)
  + Test create_booking (CASH + PayOS)
  + Test get_my_pets

Bước 4.2: Refactor Chatbot.tsx
  + Thay sendChatMessage() → useAIChat('USER_CHAT')
  + Xóa chatbot.service.ts imports
  + Giữ nguyên toàn bộ UI cards (ShopCard, PetCard, BookingPicker)
  + ToolResult vẫn parse từ response.toolResultJson

Bước 4.3: Test booking flow end-to-end
  + "đặt lịch tắm cho Mèo ở PetCareSG" → BookingPickerCard hiện ra
  + Chọn ngày giờ → CASH booking tạo thành công
  + Chọn ngày giờ → PayOS redirect đúng

Bước 4.4: Cleanup
  + Xóa VITE_GEMINI_API_KEY* khỏi .env
  + Xóa src/services/chatbot.service.ts
  + Xóa src/services/chatHistory.service.ts (thay bằng aiGateway)
  + Xóa src/services/aiChat.service.ts (thay bằng aiGateway)

Rollback: Revert Chatbot.tsx + restore .env keys
```

### Phase 5 — Cleanup & Hardening (Tuần 7)

```
Bước 5.1: Remove legacy history endpoints (tùy chọn)
  Hoặc giữ lại /chatbot/history, /shop-ai/history, /admin-ai/history
  để backward compatibility

Bước 5.2: Add monitoring
  + Log AI request/response time
  + Alert khi error rate > 5%
  + Dashboard token usage

Bước 5.3: Load test
  + Simulate 100 concurrent users
  + Verify rate limiting hoạt động
  + Verify key rotation hoạt động khi 1 key hết quota
```

---

## 11. Database Design

### 11.1 Entity Design

```sql
-- AI Conversations (session management)
CREATE TABLE ai_conversations (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    session_id  VARCHAR(255) NOT NULL UNIQUE,
    agent_type  VARCHAR(50) NOT NULL,  -- USER_CHAT, SHOP_ASSISTANT, ADMIN_ASSISTANT
    user_email  VARCHAR(255) NOT NULL,
    summary     TEXT,                  -- Tóm tắt khi conversation quá dài
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_agent (user_email, agent_type),
    INDEX idx_session (session_id)
);

-- AI Messages (conversation turns)
CREATE TABLE ai_messages (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    session_id      VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL,   -- user, assistant
    content         TEXT NOT NULL,
    tool_result_json TEXT,                  -- JSON của ToolResult (User AI only)
    agent_type      VARCHAR(50) NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session_created (session_id, created_at),
    FOREIGN KEY (session_id) REFERENCES ai_conversations(session_id)
);

-- AI Tool Calls (audit log cho function calling)
CREATE TABLE ai_tool_calls (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    session_id      VARCHAR(255) NOT NULL,
    message_id      BIGINT,
    tool_name       VARCHAR(100) NOT NULL,  -- search_shops, prepare_booking, v.v.
    args_json       TEXT,                   -- Input args
    result_json     TEXT,                   -- Output result
    success         BOOLEAN DEFAULT TRUE,
    error_message   VARCHAR(500),
    duration_ms     INT,                    -- Thời gian thực thi
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session (session_id),
    INDEX idx_tool_name (tool_name),
    INDEX idx_created (created_at)
);

-- AI Token Usage (cost tracking)
CREATE TABLE ai_token_usage (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_email      VARCHAR(255) NOT NULL,
    agent_type      VARCHAR(50) NOT NULL,
    model_used      VARCHAR(100) NOT NULL,  -- gemini-2.5-flash, v.v.
    prompt_tokens   INT NOT NULL DEFAULT 0,
    output_tokens   INT NOT NULL DEFAULT 0,
    total_tokens    INT NOT NULL DEFAULT 0,
    estimated_cost  DECIMAL(10, 6),         -- USD (tính theo Gemini pricing)
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_date (user_email, created_at),
    INDEX idx_agent_date (agent_type, created_at)
);
```

### 11.2 JPA Entities

```java
// entity/ai/AIConversation.java
@Entity
@Table(name = "ai_conversations")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AIConversation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String sessionId;

    @Column(nullable = false)
    private String agentType;

    @Column(nullable = false)
    private String userEmail;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}

// entity/ai/AIMessage.java
@Entity
@Table(name = "ai_messages")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AIMessage {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String sessionId;

    @Column(nullable = false)
    private String role;  // user | assistant

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(columnDefinition = "TEXT")
    private String toolResultJson;

    @Column(nullable = false)
    private String agentType;

    @CreationTimestamp
    private LocalDateTime createdAt;
}

// entity/ai/AITokenUsage.java
@Entity
@Table(name = "ai_token_usage")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AITokenUsage {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String userEmail;
    private String agentType;
    private String modelUsed;
    private int promptTokens;
    private int outputTokens;
    private int totalTokens;
    private BigDecimal estimatedCost;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
```

### 11.3 Indexing Strategy

```
ai_messages:
  - (session_id, created_at) — load conversation history
  - (agent_type, created_at) — analytics per agent

ai_token_usage:
  - (user_email, created_at) — per-user cost tracking
  - (agent_type, created_at) — per-agent cost analytics
  - (model_used, created_at) — per-model usage stats

ai_tool_calls:
  - (tool_name, created_at) — tool usage analytics
  - (success, created_at) — error rate monitoring
```

---

## 12. Production Recommendations

### 12.1 Monitoring & Observability

```java
// TokenLoggerService.java — Log mọi AI call
@Service
@Slf4j
public class TokenLoggerService {

    private final AITokenUsageRepository tokenUsageRepo;

    public void log(String agentType, String userEmail, UsageMetadata usage) {
        if (usage == null) return;

        int total = usage.getPromptTokens() + usage.getOutputTokens();

        // Gemini 2.5 Flash pricing (May 2026):
        // Input: $0.075/1M tokens, Output: $0.30/1M tokens
        BigDecimal cost = BigDecimal.valueOf(usage.getPromptTokens())
            .multiply(BigDecimal.valueOf(0.075 / 1_000_000))
            .add(BigDecimal.valueOf(usage.getOutputTokens())
                .multiply(BigDecimal.valueOf(0.30 / 1_000_000)));

        tokenUsageRepo.save(AITokenUsage.builder()
            .userEmail(userEmail)
            .agentType(agentType)
            .modelUsed(usage.getModelUsed())
            .promptTokens(usage.getPromptTokens())
            .outputTokens(usage.getOutputTokens())
            .totalTokens(total)
            .estimatedCost(cost)
            .build());

        log.info("[TokenLogger] agent={} user={} model={} tokens={} cost=${}",
            agentType, userEmail, usage.getModelUsed(), total, cost);
    }
}
```

### 12.2 Dockerfile

```dockerfile
# PET_EYE_BE/Dockerfile
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app
COPY target/PET_EYE_BE-*.jar app.jar

# AI keys từ environment variables (không hardcode)
ENV GEMINI_KEY_1=""
ENV GEMINI_KEY_2=""
ENV GEMINI_KEY_3=""

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### 12.3 Docker Compose

```yaml
# docker-compose.yml
services:
  backend:
    build: ./PET_EYE_BE
    environment:
      - GEMINI_KEY_1=${GEMINI_KEY_1}
      - GEMINI_KEY_2=${GEMINI_KEY_2}
      - SPRING_DATASOURCE_URL=${DB_URL}
    ports:
      - "8080:8080"

  frontend:
    build: ./PET_EYE_FE
    environment:
      # KHÔNG CÒN VITE_GEMINI_API_KEY
      - VITE_API_BASE_URL=http://backend:8080
    ports:
      - "3000:80"
```

### 12.4 CI/CD — GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy AI Gateway

on:
  push:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { java-version: '21' }
      - run: cd PET_EYE_BE && mvn test
        env:
          GEMINI_KEY_1: ${{ secrets.GEMINI_KEY_1 }}

  deploy:
    needs: test-backend
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        run: |
          # Deploy backend với secrets từ GitHub Secrets
          # KHÔNG BAO GIỜ commit API keys vào repo
```

---

## 13. Future Roadmap

### 13.1 RAG — Retrieval Augmented Generation

```
Mục tiêu: AI trả lời dựa trên knowledge base của PetEye
(FAQ, chính sách, hướng dẫn chăm sóc thú cưng)

Architecture:
┌─────────────────────────────────────────────────────┐
│  Knowledge Base                                     │
│  - FAQ PetEye                                       │
│  - Hướng dẫn chăm sóc theo loài/giống              │
│  - Chính sách platform                              │
└──────────────────────┬──────────────────────────────┘
                       │ Embedding (text → vector)
                       ▼
              ┌────────────────┐
              │ Vector DB      │
              │ (pgvector hoặc │
              │  Qdrant)       │
              └───────┬────────┘
                      │ Semantic search
                      ▼
              ┌────────────────┐
              │ RAGService     │
              │ query → top-K  │
              │ relevant docs  │
              └───────┬────────┘
                      │ Inject vào context
                      ▼
              ┌────────────────┐
              │ PromptBuilder  │
              │ + RAG context  │
              └────────────────┘

Implementation:
1. Thêm pgvector extension vào MySQL/PostgreSQL
2. Tạo EmbeddingService (gọi Gemini text-embedding-004)
3. Tạo RAGService (semantic search)
4. Inject RAG results vào PromptBuilderService
```

### 13.2 Structured Outputs — Analytics Cards

```
Thay vì AI trả về text markdown, trả về JSON có cấu trúc:

{
  "type": "analytics_card",
  "title": "Phân tích doanh thu tháng 5",
  "metrics": [
    {"label": "Tổng doanh thu", "value": "15.2M", "trend": "+12%", "color": "green"},
    {"label": "Booking mới", "value": "47", "trend": "+5%", "color": "blue"}
  ],
  "chart": {
    "type": "bar",
    "data": [{"date": "01/05", "value": 500000}, ...]
  },
  "insights": ["Doanh thu tăng 12% so với tháng trước", ...],
  "actions": [{"label": "Xem chi tiết", "link": "/shop/bookings"}]
}

Frontend render thành card đẹp thay vì text thuần.
```

### 13.3 AI Agents — Multi-step Planning

```
Cho Admin AI: Thay vì chỉ trả lời câu hỏi, AI có thể:
1. Phân tích vấn đề
2. Lập kế hoạch hành động
3. Thực thi từng bước (approve shop, send notification, v.v.)
4. Báo cáo kết quả

Ví dụ: "Duyệt tất cả shop đang chờ và gửi email thông báo"
→ AI lập plan:
  Step 1: Lấy danh sách shop chờ duyệt
  Step 2: Duyệt từng shop
  Step 3: Gửi notification cho từng shop owner
  Step 4: Báo cáo: "Đã duyệt 5 shop, gửi 5 email"
```

### 13.4 Semantic Memory

```
Thay vì chỉ lưu raw messages, lưu thêm:
- User preferences (thích shop nào, thú cưng nào)
- Booking patterns (hay đặt vào thứ 7, hay dùng dịch vụ tắm)
- Pet health context (dị ứng, bệnh mãn tính)

Inject vào system prompt:
"User thường đặt lịch vào cuối tuần.
Thú cưng Mèo bị dị ứng với một số loại dầu gội.
Shop yêu thích: PetCareSG."
```

---

*Tài liệu được tạo: tháng 5/2026 | Stack: Spring Boot 3.5 (Java 21) + React 19 + Gemini API*
