const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type DraftTraining = {
  id?: string;
  classId?: string;
  title: string;
  tags: string[];
  warmup: string[];
  main: string[];
  cooldown: string[];
  warmupTime: string;
  mainTime: string;
  cooldownTime: string;
};

type AssistantResponse = {
  reply: string;
  sources: Array<{ title: string; author: string; url: string }>;
  draftTraining?: DraftTraining | null;
};

const systemPrompt = [
  "You are a volleyball and training assistant for a coaching app.",
  "Always base answers on scientific sources or reputable coaching references.",
  "Return a JSON object only, no extra text.",
  "If suggesting drills from videos, include author and a stable URL.",
  "If unsure, say so and avoid hallucinating citations.",
  "Use simple Portuguese in the reply.",
].join(" ");

const responseSchema = {
  type: "object",
  properties: {
    reply: { type: "string" },
    sources: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          author: { type: "string" },
          url: { type: "string" },
        },
        required: ["title", "author", "url"],
        additionalProperties: false,
      },
    },
    draftTraining: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          properties: {
            title: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
            warmup: { type: "array", items: { type: "string" } },
            main: { type: "array", items: { type: "string" } },
            cooldown: { type: "array", items: { type: "string" } },
            warmupTime: { type: "string" },
            mainTime: { type: "string" },
            cooldownTime: { type: "string" },
          },
          required: [
            "title",
            "tags",
            "warmup",
            "main",
            "cooldown",
            "warmupTime",
            "mainTime",
            "cooldownTime",
          ],
          additionalProperties: false,
        },
      ],
    },
  },
  required: ["reply", "sources", "draftTraining"],
  additionalProperties: false,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("assistant: request received");
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      console.error("assistant: missing OPENAI_API_KEY");
      return new Response(
        JSON.stringify({ error: "Missing OPENAI_API_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const classId = typeof body.classId === "string" ? body.classId : "";
    const userHint = classId ? `Turma selecionada: ${classId}.` : "";
    console.log("assistant: messages", messages.length, "classId", classId);

    const payload = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "system", content: userHint },
        ...messages,
      ] as ChatMessage[],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "assistant_response",
          schema: responseSchema,
          strict: true,
        },
      },
      temperature: 0.2,
      max_tokens: 900,
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("assistant: openai error", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "OpenAI error", detail: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    let parsed: AssistantResponse;
    try {
      parsed = JSON.parse(content) as AssistantResponse;
    } catch (_error) {
      return new Response(
        JSON.stringify({ error: "Invalid assistant response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!parsed || typeof parsed.reply !== "string") {
      parsed = {
        reply: "Nao consegui gerar a resposta. Tente novamente.",
        sources: [],
        draftTraining: null,
      };
    }

    parsed.sources = Array.isArray(parsed.sources) ? parsed.sources : [];
    parsed.draftTraining = parsed.draftTraining ?? null;

    const checkedSources: AssistantSource[] = [];
    for (const source of parsed.sources) {
      if (!source.url) continue;
      try {
        const head = await fetch(source.url, { method: "HEAD", redirect: "follow" });
        if (head.ok || (head.status >= 300 && head.status < 400)) {
          checkedSources.push(source);
          continue;
        }
        const get = await fetch(source.url, { method: "GET", redirect: "follow" });
        if (get.ok || (get.status >= 300 && get.status < 400)) {
          checkedSources.push(source);
        }
      } catch (_error) {
        continue;
      }
    }
    parsed.sources = checkedSources;

    console.log("assistant: success");
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("assistant: failure", String(error));
    return new Response(
      JSON.stringify({ error: "Assistant failure", detail: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
