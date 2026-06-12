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

# A small thinking budget buys back the reasoning that temporal grounding
# needs (resolving "next Friday" against a message's date, spotting passed
# deadlines) without pro-level latency. Thinking tokens count against
# max_output_tokens on Gemini 2.5, so callers' caps are sized to leave room
# for the answer after thinking. NOTE: if you switch chat_model to
# gemini-2.5-pro, this budget is still valid (pro just can't be set to 0).
_THINKING = types.ThinkingConfig(thinking_budget=512)

# Gemini intermittently returns 503 UNAVAILABLE ("high demand") or 429
# (rate limit). These are transient, so retry with exponential backoff before
# giving up — one upstream hiccup shouldn't 500 the user's request.
_RETRY_STATUSES = {429, 503}
_MAX_ATTEMPTS = 3


async def _generate(prompt: str, *, max_output_tokens: int, temperature: float) -> str:
    config = types.GenerateContentConfig(
        max_output_tokens=max_output_tokens,
        temperature=temperature,
        thinking_config=_THINKING,
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
        today=datetime.now().strftime("%A, %Y-%m-%d"),
        client_name=client_name,
        chunks=_join_chunks(chunks),
    )
    return await _generate(prompt, max_output_tokens=1200, temperature=0.3)


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
    return await _generate(prompt, max_output_tokens=1800, temperature=0.2)
