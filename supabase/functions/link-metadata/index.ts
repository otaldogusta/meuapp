const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const extractMeta = (html: string, key: string) => {
  const metaTag = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  const match = html.match(metaTag);
  return match ? match[1].trim() : "";
};

const extractTitle = (html: string) => {
  const ogTitle =
    extractMeta(html, "og:title") || extractMeta(html, "twitter:title");
  if (ogTitle) return ogTitle;
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : "";
};

const extractAuthor = (html: string) => {
  const author =
    extractMeta(html, "author") ||
    extractMeta(html, "article:author") ||
    extractMeta(html, "twitter:creator");
  return author || "";
};

const extractDescription = (html: string) => {
  return (
    extractMeta(html, "og:description") ||
    extractMeta(html, "twitter:description") ||
    extractMeta(html, "description") ||
    ""
  );
};

const extractPublished = (html: string) => {
  const published =
    extractMeta(html, "article:published_time") ||
    extractMeta(html, "og:published_time") ||
    "";
  return published || "";
};

const extractImage = (html: string) => {
  return (
    extractMeta(html, "og:image") ||
    extractMeta(html, "twitter:image") ||
    ""
  );
};

const safeUrl = (value: string) => {
  try {
    return new URL(value).toString();
  } catch {
    return "";
  }
};

const isYouTube = (value: string) =>
  value.includes("youtube.com") || value.includes("youtu.be");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    const normalized = safeUrl(String(url ?? ""));
    if (!normalized) {
      return new Response(
        JSON.stringify({ error: "URL invalida." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let title = "";
    let author = "";
    let image = "";
    let description = "";
    let publishedAt = "";
    const host = new URL(normalized).host;

    if (isYouTube(normalized)) {
      const oembed = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(
          normalized
        )}&format=json`,
        { headers: { "User-Agent": "Mozilla/5.0" } }
      );
      if (oembed.ok) {
        const data = (await oembed.json()) as {
          title?: string;
          author_name?: string;
          thumbnail_url?: string;
        };
        title = data.title ?? "";
        author = data.author_name ?? "";
        image = data.thumbnail_url ?? "";
      }
    }

    if (!title || !author || !image || !description || !publishedAt) {
      const response = await fetch(normalized, {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      });
      const html = await response.text();
      title = title || extractTitle(html);
      author = author || extractAuthor(html);
      image = image || extractImage(html);
      description = description || extractDescription(html);
      publishedAt = publishedAt || extractPublished(html);
      if (isYouTube(normalized)) {
        const shortMatch = html.match(/"shortDescription":"(.*?)"/);
        if (shortMatch && !description) {
          try {
            description = JSON.parse(`"${shortMatch[1]}"`);
          } catch {
            description = shortMatch[1];
          }
        }
        const dateMatch = html.match(/"publishDate":"(\d{4}-\d{2}-\d{2})"/);
        if (dateMatch && !publishedAt) {
          publishedAt = dateMatch[1];
        }
        const channelMatch = html.match(/"ownerChannelName":"(.*?)"/);
        if (channelMatch && !author) {
          try {
            author = JSON.parse(`"${channelMatch[1]}"`);
          } catch {
            author = channelMatch[1];
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        title,
        author,
        image,
        description,
        publishedAt,
        host,
        url: normalized,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido.";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
