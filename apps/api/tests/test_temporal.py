"""Tests for ai.temporal — deterministic inline resolution of relative date
phrases against an item's own timestamp (NOT today). Anchor for most cases:
Tue 2026-06-02, the real-world repro ("launch is targeted for next Friday"
summarized 10 days later as if still upcoming).
"""

from datetime import datetime

from ai.temporal import annotate_relative_dates

TUE_JUN_2 = datetime(2026, 6, 2, 13, 55)
SAT_MAY_30 = datetime(2026, 5, 30, 12, 29)


def test_next_friday_resolves_to_following_week():
    out = annotate_relative_dates("launch is targeted for next Friday.", TUE_JUN_2)
    assert "next Friday [= Fri 2026-06-12]" in out


def test_tomorrow_resolves_against_anchor():
    out = annotate_relative_dates("she's picking it up tomorrow.", TUE_JUN_2)
    assert "tomorrow [= Wed 2026-06-03]" in out


def test_eod_is_the_anchor_day():
    out = annotate_relative_dates("on me by EOD.", TUE_JUN_2)
    assert "EOD [= Tue 2026-06-02]" in out


def test_bare_weekday_with_preposition_is_next_occurrence():
    out = annotate_relative_dates("Can we get sign-off by Friday?", SAT_MAY_30)
    assert "by Friday [= Fri 2026-06-05]" in out


def test_this_weekday_stays_in_anchor_week():
    out = annotate_relative_dates("demo this Thursday", TUE_JUN_2)
    assert "this Thursday [= Thu 2026-06-04]" in out


def test_end_of_week_is_anchor_weeks_friday():
    out = annotate_relative_dates("wrap it by end of the week", TUE_JUN_2)
    # "by end of the week" — the EOW alternate wins over bare "by ... " branch
    assert "[= Fri 2026-06-05]" in out


def test_yesterday_and_today():
    out = annotate_relative_dates("found it yesterday, fixing today", TUE_JUN_2)
    assert "yesterday [= Mon 2026-06-01]" in out
    assert "today [= Tue 2026-06-02]" in out


def test_case_insensitive():
    out = annotate_relative_dates("Launch NEXT FRIDAY!", TUE_JUN_2)
    assert "[= Fri 2026-06-12]" in out


def test_prose_weekday_without_preposition_untouched():
    text = "Friday's build was broken"
    assert annotate_relative_dates(text, TUE_JUN_2) == text


def test_no_anchor_is_noop():
    text = "due next Friday"
    assert annotate_relative_dates(text, None) == text


def test_already_annotated_is_noop():
    text = "due next Friday [= Fri 2026-06-12] sharp"
    assert annotate_relative_dates(text, TUE_JUN_2) == text


def test_plain_text_untouched():
    text = "Decision: going with the blue CTA variant the client picked."
    assert annotate_relative_dates(text, TUE_JUN_2) == text
