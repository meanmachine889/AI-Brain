import asyncio
import re
from datetime import datetime

from google import genai
from google.genai import types
from google.genai import errors as genai_errors

from core.config import settings
from ai.prompts import SUMMARIZE_CLIENT_PROMPT, ASK_CLIENT_PROMPT

client = genai.Client(api_key=settings.google_api_key)

# Neutralize delimiter-injection: ingested content must not be able to forge the
# <context>/<activity> fences that separate untrusted data from our instructions.
# We defang the tag (insert a zero-width-ish marker) rather than drop text, so the
# message still reads naturally to the model but can't break out of the fence.
_FENCE_RE = re.compile(r"</?\s*(context|activity)\s*>", re.IGNORECASE)


def _sanitize_chunk(text: str) -> str:
    return _FENCE_RE.sub(lambda m: m.group(0).replace("<", "‹").replace(">", "›"), text)


def _join_chunks(chunks: list[str]) -> str:
    return "\n---\n".join(_sanitize_chunk(c) for c in chunks)

# thinking_budget=0 disables Gemini 2.5 Flash's "thinking" so the token budget
# goes to the actual answer (faster, cheaper, and avoids empty replies on short
# max_output_tokens). NOTE: if you switch chat_model to gemini-2.5-pro, remove
# this (pro requires a thinking budget) or set it to -1 for dynamic thinking.
_THINKING_OFF = types.ThinkingConfig(thinking_budget=0)

# Gemini intermittently returns 503 UNAVAILABLE ("high demand") or 429
# (rate limit). These are transient, so retry with exponential backoff before
# giving up — one upstream hiccup shouldn't 500 the user's request.
_RETRY_STATUSES = {429, 503}
_MAX_ATTEMPTS = 3


async def _generate(prompt: str, *, max_output_tokens: int, temperature: float) -> str:
    config = types.GenerateContentConfig(
        max_output_tokens=max_output_tokens,
        temperature=temperature,
        thinking_config=_THINKING_OFF,
    )
    last_exc: Exception | None = None
    for attempt in range(_MAX_ATTEMPTS):
        try:
            response = await client.aio.models.generate_content(
                model=settings.chat_model,
                contents=prompt,
                config=config,
            )
            return (response.text or "").strip()
        except genai_errors.APIError as exc:
            if exc.code not in _RETRY_STATUSES or attempt == _MAX_ATTEMPTS - 1:
                raise
            last_exc = exc
            await asyncio.sleep(1.5 * (2 ** attempt))  # 1.5s, 3s
    raise last_exc  # unreachable, but keeps the type checker happy


async def summarize(client_name: str, chunks: list[str]) -> str:
    prompt = SUMMARIZE_CLIENT_PROMPT.format(
        client_name=client_name,
        chunks=_join_chunks(chunks),
    )
    return await _generate(prompt, max_output_tokens=500, temperature=0.3)


async def answer(
    client_name: str,
    question: str,
    chunks: list[str],
    timeframe_note: str = "",
) -> str:
    prompt = ASK_CLIENT_PROMPT.format(
        today=datetime.now().strftime("%A, %Y-%m-%d"),
        client_name=client_name,
        question=question,
        chunks=_join_chunks(chunks),
        timeframe_note=f"\n{timeframe_note}\n" if timeframe_note else "",
    )
    return await _generate(prompt, max_output_tokens=900, temperature=0.2)
