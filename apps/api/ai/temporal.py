"""Deterministic inline resolution of relative date phrases in ingested content.

"Launch is targeted for next Friday" means one thing on Tue Jun 2 and another
two weeks later. Asking the LLM to do this arithmetic per-mention is roulette —
the same phrase resolved to three different dates across one test battery. So
we resolve in code, at chunk-formatting time, by annotating the phrase with the
absolute date computed from the item's own timestamp:

    "targeted for next Friday [= Fri 2026-06-12]. The footer is the long pole."

The model is told to trust these annotations. Conventions (documented so they
are at least *consistent*):
  - today / tonight / EOD / end of day  -> the anchor's date
  - tomorrow                            -> anchor + 1 day
  - yesterday                           -> anchor - 1 day
  - end of (the) week / EOW             -> Friday of the anchor's week
  - this <weekday>                      -> that weekday in the anchor's week
  - next <weekday>                      -> that weekday in the following week
  - by/on/before/until <weekday>        -> next occurrence strictly after anchor
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta

_WEEKDAYS = {
    "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
    "friday": 4, "saturday": 5, "sunday": 6,
}
_WD_NAMES = "|".join(_WEEKDAYS)

# One pass, alternates ordered longest-first so e.g. "next friday" wins over
# the bare-weekday branch. Bare weekdays only count when introduced by a
# scheduling preposition — "by Friday", "on Monday" — to avoid annotating
# prose like "Friday's build was broken" twice or company names.
_REL_RE = re.compile(
    rf"""(?ix)
    \b(?:
        (?P<next>next\s+(?P<next_wd>{_WD_NAMES}))
      | (?P<this>this\s+(?P<this_wd>{_WD_NAMES}))
      | (?P<bare_prep>(?:by|on|before|until|for)\s+(?P<bare_wd>{_WD_NAMES}))
      | (?P<eow>end\s+of\s+(?:the\s+)?week|\beow\b)
      | (?P<eod>end\s+of\s+(?:the\s+)?day|\beod\b)
      | (?P<tomorrow>tomorrow)
      | (?P<yesterday>yesterday)
      | (?P<tonight>tonight)
      | (?P<today>today)
    )\b
    """
)

_ALREADY_ANNOTATED_RE = re.compile(r"\[=\s*\w{3}\s+\d{4}-\d{2}-\d{2}\]")


def _fmt(d: datetime) -> str:
    return d.strftime("%a %Y-%m-%d")


def _week_monday(anchor: datetime) -> datetime:
    return anchor - timedelta(days=anchor.weekday())


def _resolve(m: re.Match, anchor: datetime) -> datetime | None:
    if m.group("next"):
        wd = _WEEKDAYS[m.group("next_wd").lower()]
        return _week_monday(anchor) + timedelta(days=7 + wd)
    if m.group("this"):
        wd = _WEEKDAYS[m.group("this_wd").lower()]
        return _week_monday(anchor) + timedelta(days=wd)
    if m.group("bare_prep"):
        wd = _WEEKDAYS[m.group("bare_wd").lower()]
        delta = (wd - anchor.weekday()) % 7
        return anchor + timedelta(days=delta or 7)
    if m.group("eow"):
        return _week_monday(anchor) + timedelta(days=4)  # Friday
    if m.group("eod") or m.group("tonight") or m.group("today"):
        return anchor
    if m.group("tomorrow"):
        return anchor + timedelta(days=1)
    if m.group("yesterday"):
        return anchor - timedelta(days=1)
    return None


def annotate_relative_dates(text: str, anchor: datetime | None) -> str:
    """Append `[= Fri 2026-06-05]` after each relative date phrase in `text`,
    resolved against `anchor` (the item's own timestamp). No-op without an
    anchor, or if the text already carries annotations (re-ingestion)."""
    if anchor is None or _ALREADY_ANNOTATED_RE.search(text):
        return text

    def _sub(m: re.Match) -> str:
        resolved = _resolve(m, anchor)
        if resolved is None:
            return m.group(0)
        return f"{m.group(0)} [= {_fmt(resolved)}]"

    return _REL_RE.sub(_sub, text)
