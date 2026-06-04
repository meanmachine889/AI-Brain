"""Parse a natural-language time window out of a question.

Used by RAG retrieval: when a question is scoped to a period ("what did we
discuss last week", "anything in March", "the last 3 days"), we filter the
retrieved chunks to that window by `source_timestamp` instead of relying on
pure vector similarity — which otherwise can't tell "March" from "May".

`parse_timeframe(question, now)` returns a `Timeframe` (inclusive [start, end])
or `None` when the question has no time scope. The parser is deterministic and
stdlib-only (plus dateutil for explicit dates), so it's predictable and tested.
"""

from __future__ import annotations

import calendar
import re
from dataclasses import dataclass
from datetime import datetime, timedelta

from dateutil import parser as date_parser
from dateutil.relativedelta import relativedelta

__all__ = ["Timeframe", "parse_timeframe"]


@dataclass(frozen=True)
class Timeframe:
    start: datetime
    end: datetime
    label: str  # human description, e.g. "last week (May 26–Jun 1)"


_MONTHS = {
    m.lower(): i
    for i, m in enumerate(calendar.month_name)
    if m
} | {
    m.lower(): i
    for i, m in enumerate(calendar.month_abbr)
    if m
}
_WEEKDAYS = {
    "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
    "friday": 4, "saturday": 5, "sunday": 6,
    "mon": 0, "tue": 1, "tues": 1, "wed": 2, "thu": 3, "thur": 3,
    "thurs": 3, "fri": 4, "sat": 5, "sun": 6,
}
_NUM_WORDS = {
    "a": 1, "an": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10, "couple": 2,
    "couple of": 2, "few": 3,
}
_MONTH_RE = "|".join(sorted(_MONTHS, key=len, reverse=True))
_WD_RE = "|".join(sorted(_WEEKDAYS, key=len, reverse=True))


def _sod(d: datetime) -> datetime:
    return d.replace(hour=0, minute=0, second=0, microsecond=0)


def _eod(d: datetime) -> datetime:
    return d.replace(hour=23, minute=59, second=59, microsecond=999999)


def _fmt(start: datetime, end: datetime) -> str:
    if start.year == end.year:
        return f"{start:%b %-d}–{end:%b %-d, %Y}"
    return f"{start:%b %-d, %Y}–{end:%b %-d, %Y}"


def _count(token: str) -> int:
    token = token.strip().lower()
    if token.isdigit():
        return int(token)
    return _NUM_WORDS.get(token, 1)


def _month_window(year: int, month: int) -> tuple[datetime, datetime]:
    last_day = calendar.monthrange(year, month)[1]
    start = datetime(year, month, 1)
    end = _eod(datetime(year, month, last_day))
    return start, end


def _week_containing(d: datetime) -> tuple[datetime, datetime]:
    monday = _sod(d - timedelta(days=d.weekday()))
    sunday = _eod(monday + timedelta(days=6))
    return monday, sunday


def parse_timeframe(question: str, now: datetime) -> Timeframe | None:
    """Return the time window a question refers to, or None.

    Matchers run most-specific first. `now` is injected so the result is
    deterministic and testable.
    """
    q = question.lower()

    # --- explicit ranges: "between X and Y", "from X to Y" ---
    m = re.search(r"\b(?:between|from)\s+(.+?)\s+(?:and|to|until|till)\s+(.+?)[?.!]*$", q)
    if m:
        d1 = _try_date(m.group(1), now)
        d2 = _try_date(m.group(2), now)
        if d1 and d2:
            start, end = sorted([d1, d2])
            return Timeframe(_sod(start), _eod(end), f"{_fmt(start, end)}")

    # --- "since X" → [X, now] ---
    m = re.search(r"\bsince\s+(.+?)[?.!]*$", q)
    if m:
        start = _resolve_point(m.group(1).strip(), now)
        if start:
            return Timeframe(_sod(start), now, f"since {start:%b %-d, %Y}")

    # --- single named days ---
    if re.search(r"\btoday\b", q):
        return Timeframe(_sod(now), now, "today")
    if re.search(r"\byesterday\b", q):
        y = now - timedelta(days=1)
        return Timeframe(_sod(y), _eod(y), "yesterday")

    # --- this/last week & month & year ---
    if re.search(r"\b(this|current)\s+week\b", q):
        monday, _ = _week_containing(now)
        return Timeframe(monday, now, "this week")
    if re.search(r"\b(last|previous|past)\s+week\b", q):
        monday, sunday = _week_containing(now - timedelta(days=7))
        return Timeframe(monday, sunday, f"last week ({_fmt(monday, sunday)})")
    if re.search(r"\b(this|current)\s+month\b", q):
        start, _ = _month_window(now.year, now.month)
        return Timeframe(start, now, f"this month ({now:%B %Y})")
    if re.search(r"\b(last|previous|past)\s+month\b", q):
        prev = now - relativedelta(months=1)
        start, end = _month_window(prev.year, prev.month)
        return Timeframe(start, end, f"last month ({prev:%B %Y})")
    if re.search(r"\b(this|current)\s+year\b", q):
        return Timeframe(datetime(now.year, 1, 1), now, f"this year ({now.year})")
    if re.search(r"\b(last|previous)\s+year\b", q):
        y = now.year - 1
        return Timeframe(datetime(y, 1, 1), _eod(datetime(y, 12, 31)), f"last year ({y})")

    # --- "last/past N <unit>" → [now - N units, now] ---
    m = re.search(
        rf"\b(?:last|past|previous)\s+(\d+|{'|'.join(_NUM_WORDS)})\s+(day|days|week|weeks|month|months)\b",
        q,
    )
    if m:
        n = _count(m.group(1))
        unit = m.group(2)
        if unit.startswith("day"):
            start = _sod(now - timedelta(days=n))
        elif unit.startswith("week"):
            start = _sod(now - timedelta(weeks=n))
        else:
            start = _sod(now - relativedelta(months=n))
        return Timeframe(start, now, f"the last {n} {unit.rstrip('s')}{'s' if n != 1 else ''}")

    # --- "N <unit> ago" → the day/week/month at that point ---
    m = re.search(
        rf"\b(\d+|{'|'.join(_NUM_WORDS)})\s+(day|days|week|weeks|month|months)\s+ago\b",
        q,
    )
    if m:
        n = _count(m.group(1))
        unit = m.group(2)
        if unit.startswith("day"):
            target = now - timedelta(days=n)
            return Timeframe(_sod(target), _eod(target), f"{n} day{'s' if n != 1 else ''} ago ({target:%b %-d, %Y})")
        if unit.startswith("week"):
            monday, sunday = _week_containing(now - timedelta(weeks=n))
            return Timeframe(monday, sunday, f"~{n} week{'s' if n != 1 else ''} ago ({_fmt(monday, sunday)})")
        target = now - relativedelta(months=n)
        start, end = _month_window(target.year, target.month)
        return Timeframe(start, end, f"~{n} month{'s' if n != 1 else ''} ago ({target:%B %Y})")

    # --- month name: "in March", "during March 2025", "from December" ---
    # negative lookahead: don't swallow a day ("from May 30" -> that day, below),
    # but still allow a 4-digit year ("in March 2026").
    m = re.search(
        rf"\b(?:in|during|for|from|month of)\s+({_MONTH_RE})\b(?!\s+\d{{1,2}}\b)(?:\s+(\d{{4}}))?",
        q,
    )
    if m:
        month = _MONTHS[m.group(1)]
        year = int(m.group(2)) if m.group(2) else now.year
        # bare month name with no year that lands in the future -> assume last year
        if not m.group(2) and (year, month) > (now.year, now.month):
            year -= 1
        start, end = _month_window(year, month)
        return Timeframe(start, end, f"{start:%B %Y}")

    # --- weekday: "last Monday", "on Tuesday" ---
    m = re.search(rf"\b(last|this|past)?\s*({_WD_RE})\b", q)
    if m:
        target = _resolve_weekday(m.group(2), m.group(1), now)
        if target:
            return Timeframe(_sod(target), _eod(target), f"{target:%A, %b %-d, %Y}")

    # --- a bare explicit date: "on May 30", "2026-05-30" ---
    d = _explicit_date(q, now)
    if d:
        return Timeframe(_sod(d), _eod(d), f"{d:%b %-d, %Y}")

    return None


def _resolve_weekday(name: str, qualifier: str | None, now: datetime) -> datetime | None:
    target_wd = _WEEKDAYS.get(name)
    if target_wd is None:
        return None
    delta = (now.weekday() - target_wd) % 7
    if qualifier in ("last", "past"):
        delta = delta or 7  # always a previous occurrence
        if delta < 7 and now.weekday() == target_wd:
            delta = 7
    elif qualifier == "this":
        # this week's occurrence (may be future within the week)
        return _sod(now - timedelta(days=now.weekday()) + timedelta(days=target_wd))
    else:
        delta = delta or 0  # most recent (today if it's that day)
    return now - timedelta(days=delta)


def _resolve_point(text: str, now: datetime) -> datetime | None:
    """Resolve 'since X' anchors: yesterday / weekday / month / explicit date."""
    text = text.strip()
    if "yesterday" in text:
        return now - timedelta(days=1)
    if "today" in text:
        return now
    m = re.search(rf"\b({_WD_RE})\b", text)
    if m:
        return _resolve_weekday(m.group(1), "last", now)
    m = re.fullmatch(rf"({_MONTH_RE})(?:\s+(\d{{4}}))?", text)
    if m:
        month = _MONTHS[m.group(1)]
        year = int(m.group(2)) if m.group(2) else now.year
        return datetime(year, month, 1)
    return _try_date(text, now)


def _explicit_date(q: str, now: datetime) -> datetime | None:
    # ISO
    m = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", q)
    if m:
        return _try_date(m.group(1), now)
    # "Month D" / "Month D, YYYY" / "D Month"
    m = re.search(rf"\b({_MONTH_RE})\s+(\d{{1,2}})(?:,?\s+(\d{{4}}))?\b", q)
    if not m:
        m = re.search(rf"\b(\d{{1,2}})\s+({_MONTH_RE})(?:,?\s+(\d{{4}}))?\b", q)
        if m:
            return _try_date(f"{m.group(1)} {m.group(2)} {m.group(3) or now.year}", now)
        return None
    return _try_date(f"{m.group(1)} {m.group(2)} {m.group(3) or now.year}", now)


def _try_date(text: str, now: datetime) -> datetime | None:
    """Parse an explicit date fragment; never fuzzy (avoids false positives)."""
    text = text.strip().rstrip("?.!")
    try:
        return date_parser.parse(text, default=datetime(now.year, 1, 1))
    except (ValueError, OverflowError):
        return None
