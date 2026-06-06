"""Time-decay hybrid re-ranking for retrieval.

A plain semantic top-k breaks as a client's history grows: a chatty source
(e.g. dozens of Slack messages) out-scores and evicts high-signal items like
open tickets, and old chunks never age out. This re-ranker fixes both:

  score = w_sim · similarity  +  w_rec · recency_decay(age)

over a bounded candidate pool (the vector index gives us the nearest N), then a
per-source cap so no single source can dominate the final slots. Cost stays flat
as history grows — the pool size and final-k are fixed; recency keeps the set
anchored to what's *current*.

`select_indices` is pure (no DB, no embeddings) so it is unit-tested directly.
"""

from __future__ import annotations

import math
from datetime import datetime

# Tunables (kept here so they're easy to find and test).
POOL_LIMIT = 60          # candidates pulled from the vector index (bounded)
FINAL_K = 16             # chunks actually fed to the model
PER_SOURCE_CAP = 8       # max chunks from any single source in the final set
RECENCY_TAU_DAYS = 10.0  # recency half-life-ish; larger = recency matters less
W_SIM = 0.6              # weight on semantic similarity
W_REC = 0.4              # weight on recency

_FAR_FUTURE_AGE = 1e9    # treat a missing timestamp as infinitely old


def score(distance: float, age_days: float, *, tau: float = RECENCY_TAU_DAYS,
          w_sim: float = W_SIM, w_rec: float = W_REC) -> float:
    """Blend cosine similarity with an exponential recency decay.

    `distance` is pgvector cosine distance (~[0, 2]; ~0 = identical). Gemini
    embeddings are unit-normalized, so similarity = 1 - distance lands in ~[0, 1].
    `age_days` is how old the chunk is; recency = exp(-age / tau) in (0, 1].
    """
    similarity = 1.0 - distance
    recency = math.exp(-max(age_days, 0.0) / tau)
    return w_sim * similarity + w_rec * recency


def select_indices(
    items: list[tuple[str, datetime | None, float]],
    now: datetime,
    *,
    final_k: int = FINAL_K,
    per_source_cap: int = PER_SOURCE_CAP,
    tau: float = RECENCY_TAU_DAYS,
    w_sim: float = W_SIM,
    w_rec: float = W_REC,
) -> list[int]:
    """Pick the best chunks from a candidate pool.

    `items` is `(source, source_timestamp, cosine_distance)` per candidate.
    Returns the chosen indices, best-first, respecting the per-source cap and
    the final-k budget. Ties break toward the earlier (closer) candidate.
    """
    scored: list[tuple[float, int, str]] = []
    for i, (source, ts, distance) in enumerate(items):
        age = (now - ts).total_seconds() / 86_400 if ts is not None else _FAR_FUTURE_AGE
        scored.append((score(distance, age, tau=tau, w_sim=w_sim, w_rec=w_rec), i, source))

    # highest score first; stable on the original (distance) order for ties
    scored.sort(key=lambda t: (-t[0], t[1]))

    picked: list[int] = []
    per_source: dict[str, int] = {}
    for _, idx, source in scored:
        if len(picked) >= final_k:
            break
        if per_source.get(source, 0) >= per_source_cap:
            continue
        picked.append(idx)
        per_source[source] = per_source.get(source, 0) + 1
    return picked
