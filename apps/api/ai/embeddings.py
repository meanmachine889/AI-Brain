import math

from google import genai
from google.genai import types

from core.config import settings

client = genai.Client(api_key=settings.google_api_key)


def _normalize(vec: list[float]) -> list[float]:
    """L2-normalize. Gemini pre-normalizes only the full 3072-dim output;
    truncated dims (1536) must be normalized for cosine similarity."""
    norm = math.sqrt(sum(x * x for x in vec))
    return [x / norm for x in vec] if norm else vec


async def embed_text(text: str, task_type: str = "RETRIEVAL_QUERY") -> list[float]:
    """Embed a single string. Default task_type suits the ask-bar QUESTION."""
    result = await client.aio.models.embed_content(
        model=settings.embedding_model,
        contents=text[:8000],
        config=types.EmbedContentConfig(
            output_dimensionality=settings.embedding_dim,
            task_type=task_type,
        ),
    )
    return _normalize(result.embeddings[0].values)


async def embed_batch(
    texts: list[str], task_type: str = "RETRIEVAL_DOCUMENT"
) -> list[list[float]]:
    """Embed many strings in one call. Default task_type suits stored DOCUMENTS."""
    truncated = [t[:8000] for t in texts]
    result = await client.aio.models.embed_content(
        model=settings.embedding_model,
        contents=truncated,
        config=types.EmbedContentConfig(
            output_dimensionality=settings.embedding_dim,
            task_type=task_type,
        ),
    )
    return [_normalize(e.values) for e in result.embeddings]
