import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

const client = apiKey ? new GoogleGenAI({ apiKey }) : null;

export interface NudgeContext {
  venueName?: string;
  recentOrders?: string[];
  budgetRemaining?: number;
}

export interface NudgeResult {
  title: string;
  description: string;
  confidence: number;
}

function extractJson(text: string): NudgeResult | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    if (typeof parsed.title === 'string' && typeof parsed.description === 'string') {
      return {
        title: parsed.title,
        description: parsed.description,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
      };
    }
  } catch {
    // fall through to null below
  }
  return null;
}

export async function generateNudge(context: NudgeContext): Promise<NudgeResult | null> {
  if (!client) return null;

  const prompt = `You are a nightlife order-and-pay app's recommendation engine. Given this
patron context, suggest one short upsell or savings nudge as strict JSON with keys
"title" (max 5 words), "description" (max 20 words), "confidence" (0-1 number).
Context: venue=${context.venueName ?? 'unknown'}, recentOrders=${(context.recentOrders ?? []).join(', ') || 'none'},
budgetRemaining=${context.budgetRemaining ?? 'unknown'}.
Respond with only the JSON object, no other text.`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });
    const text = response.text ?? '';
    return extractJson(text);
  } catch {
    return null;
  }
}
