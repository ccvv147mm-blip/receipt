import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callLovableAI } from "./ai-gateway.server";

/**
 * يولّد أخبار وترند حسب البلد عبر الذكاء الاصطناعي.
 */
export const getCountryNews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ country: z.string().min(2).max(60) }).parse(input),
  )
  .handler(async ({ data }) => {
    const prompt = `أعطني أهم 5 عناوين أخبار وترند رائجة الآن في ${data.country} (سياسة، رياضة، تقنية، ثقافة، اقتصاد).
أعد JSON فقط بهذا الشكل:
{"items":[{"title":"...","category":"سياسة|رياضة|تقنية|ثقافة|اقتصاد|ترفيه","summary":"جملة قصيرة"}]}`;

    try {
      const raw = await callLovableAI({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "أنت محرّر أخبار عربي. أعد JSON صالحاً فقط دون أي نص إضافي." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
      });
      const parsed = JSON.parse(raw) as { items: Array<{ title: string; category: string; summary: string }> };
      return { items: (parsed.items ?? []).slice(0, 5), country: data.country };
    } catch (e) {
      console.error("getCountryNews:", e);
      return { items: [], country: data.country };
    }
  });
