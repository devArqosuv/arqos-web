type OpenRouterMessage = {
  role: 'system' | 'user' | 'assistant';
  content: unknown;
};

type OpenRouterOpts = {
  model: string;
  messages: OpenRouterMessage[];
  max_tokens?: number;
  maxRetries?: number; // default 3
  signal?: AbortSignal;
  response_format?: { type: string };
  extraHeaders?: Record<string, string>;
};

export type OpenRouterResponse = {
  content: string;
  usage?: unknown;
};

export async function callOpenRouter(opts: OpenRouterOpts): Promise<OpenRouterResponse> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY missing');

  const maxRetries = opts.maxRetries ?? 3;
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          ...(opts.extraHeaders ?? {}),
        },
        body: JSON.stringify({
          model: opts.model,
          messages: opts.messages,
          max_tokens: opts.max_tokens ?? 4096,
          ...(opts.response_format ? { response_format: opts.response_format } : {}),
        }),
        signal: opts.signal,
      });

      if (res.status === 429 || res.status >= 500) {
        // retry with backoff
        const retryAfter = Number(res.headers.get('retry-after')) || 0;
        const wait =
          retryAfter > 0
            ? retryAfter * 1000
            : Math.min(1000 * Math.pow(2, attempt), 10000);
        if (attempt < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }
      }

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 200)}`);
      }

      const json = await res.json();
      return {
        content: json.choices?.[0]?.message?.content ?? '',
        usage: json.usage,
      };
    } catch (err) {
      lastError = err;
      if (err instanceof Error && err.name === 'AbortError') throw err;
      if (attempt === maxRetries - 1) break;
      await new Promise((r) =>
        setTimeout(r, Math.min(1000 * Math.pow(2, attempt), 10000)),
      );
    }
  }
  throw lastError ?? new Error('OpenRouter failed after retries');
}
