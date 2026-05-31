from google import genai
from google.genai import types

from core.config import settings
from ai.prompts import SUMMARIZE_CLIENT_PROMPT, ASK_CLIENT_PROMPT

client = genai.Client(api_key=settings.google_api_key)

# thinking_budget=0 disables Gemini 2.5 Flash's "thinking" so the token budget
# goes to the actual answer (faster, cheaper, and avoids empty replies on short
# max_output_tokens). NOTE: if you switch chat_model to gemini-2.5-pro, remove
# this (pro requires a thinking budget) or set it to -1 for dynamic thinking.
_THINKING_OFF = types.ThinkingConfig(thinking_budget=0)


async def summarize(client_name: str, chunks: list[str]) -> str:
    prompt = SUMMARIZE_CLIENT_PROMPT.format(
        client_name=client_name,
        chunks="\n---\n".join(chunks),
    )
    response = await client.aio.models.generate_content(
        model=settings.chat_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            max_output_tokens=500,
            temperature=0.3,
            thinking_config=_THINKING_OFF,
        ),
    )
    return (response.text or "").strip()


async def answer(client_name: str, question: str, chunks: list[str]) -> str:
    prompt = ASK_CLIENT_PROMPT.format(
        client_name=client_name,
        question=question,
        chunks="\n---\n".join(chunks),
    )
    response = await client.aio.models.generate_content(
        model=settings.chat_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            max_output_tokens=600,
            temperature=0.2,
            thinking_config=_THINKING_OFF,
        ),
    )
    return (response.text or "").strip()
