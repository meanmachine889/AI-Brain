"""Tests for ai.timeframe.parse_timeframe.

`NOW` is fixed to Tuesday, 2026-06-02 12:00 so every relative expression has a
deterministic expected window.
"""

from datetime import datetime

import pytest

from ai.timeframe import parse_timeframe

NOW = datetime(2026, 6, 2, 12, 0)  # a Tuesday


def tf(question):
    return parse_timeframe(question, NOW)


# ---- no time scope -> None ----
@pytest.mark.parametrize("q", [
    "what's blocking progress?",
    "which tickets are unassigned?",
    "who owns the footer work?",
    "make the hero logo 20% bigger",   # number must not be read as a date
    "what is KAN-2 about?",
])
def test_no_timeframe(q):
    assert tf(q) is None


# ---- single days ----
def test_today():
    r = tf("what happened today?")
    assert r.start == datetime(2026, 6, 2, 0, 0)
    assert r.end == NOW
    assert r.label == "today"


def test_yesterday():
    r = tf("what did we discuss yesterday?")
    assert r.start == datetime(2026, 6, 1, 0, 0)
    assert r.end == datetime(2026, 6, 1, 23, 59, 59, 999999)


# ---- weeks ----
def test_this_week():
    r = tf("what did we talk about this week?")
    assert r.start == datetime(2026, 6, 1, 0, 0)  # Monday
    assert r.end == NOW


def test_last_week():
    r = tf("what did we discuss last week?")
    assert r.start == datetime(2026, 5, 25, 0, 0)   # prev Monday
    assert r.end == datetime(2026, 5, 31, 23, 59, 59, 999999)  # prev Sunday


# ---- months ----
def test_this_month():
    r = tf("anything notable this month?")
    assert r.start == datetime(2026, 6, 1, 0, 0)
    assert r.end == NOW


def test_last_month():
    r = tf("what happened last month?")
    assert r.start == datetime(2026, 5, 1, 0, 0)
    assert r.end == datetime(2026, 5, 31, 23, 59, 59, 999999)


def test_named_month_past():
    r = tf("what did we discuss in March?")
    assert r.start == datetime(2026, 3, 1, 0, 0)
    assert r.end == datetime(2026, 3, 31, 23, 59, 59, 999999)


def test_named_month_future_assumes_last_year():
    # December hasn't happened in 2026 yet -> assume Dec 2025
    r = tf("anything from December?")
    assert r.start == datetime(2025, 12, 1, 0, 0)


def test_named_month_with_year():
    r = tf("what came up in January 2025?")
    assert r.start == datetime(2025, 1, 1, 0, 0)
    assert r.end == datetime(2025, 1, 31, 23, 59, 59, 999999)


# ---- "last N units" ----
def test_last_n_days():
    r = tf("what did we discuss in the last 3 days?")
    assert r.start == datetime(2026, 5, 30, 0, 0)
    assert r.end == NOW


def test_last_n_weeks_word_number():
    r = tf("summarize the last two weeks")
    assert r.start == datetime(2026, 5, 19, 0, 0)
    assert r.end == NOW


def test_past_n_months():
    r = tf("what happened in the past 2 months?")
    assert r.start == datetime(2026, 4, 2, 0, 0)
    assert r.end == NOW


# ---- "N units ago" ----
def test_days_ago():
    r = tf("what did we say 3 days ago?")
    assert r.start == datetime(2026, 5, 30, 0, 0)
    assert r.end == datetime(2026, 5, 30, 23, 59, 59, 999999)


def test_weeks_ago_is_a_week_window():
    r = tf("what did we discuss 2 weeks ago?")
    # 2 weeks before Jun 2 = May 19 (Tue) -> that ISO week Mon May 18 .. Sun May 24
    assert r.start == datetime(2026, 5, 18, 0, 0)
    assert r.end == datetime(2026, 5, 24, 23, 59, 59, 999999)


def test_a_week_ago():
    r = tf("what happened a week ago?")
    assert r.start == datetime(2026, 5, 25, 0, 0)   # week of May 26 -> Mon May 25
    assert r.end == datetime(2026, 5, 31, 23, 59, 59, 999999)


def test_months_ago():
    r = tf("what did the client want 3 months ago?")
    assert r.start == datetime(2026, 3, 1, 0, 0)
    assert r.end == datetime(2026, 3, 31, 23, 59, 59, 999999)


# ---- explicit dates & ranges ----
def test_iso_date():
    r = tf("what was said on 2026-05-30?")
    assert r.start == datetime(2026, 5, 30, 0, 0)
    assert r.end == datetime(2026, 5, 30, 23, 59, 59, 999999)


def test_month_day():
    r = tf("what happened on May 30?")
    assert r.start == datetime(2026, 5, 30, 0, 0)


def test_between_range():
    r = tf("what did we discuss between May 1 and May 15?")
    assert r.start == datetime(2026, 5, 1, 0, 0)
    assert r.end == datetime(2026, 5, 15, 23, 59, 59, 999999)


def test_since():
    r = tf("what's happened since yesterday?")
    assert r.start == datetime(2026, 6, 1, 0, 0)
    assert r.end == NOW
