"""Tests for ai.ranking — the time-decay hybrid re-ranker.

These pin the two behaviors that motivated the algorithm:
  1. recency breaks ties / lifts fresh items (current state matters),
  2. the per-source cap stops one chatty source from evicting other sources
     (the "missing tickets" bug), while the final set stays bounded.
"""

from datetime import datetime, timedelta

from ai.ranking import score, select_indices

NOW = datetime(2026, 6, 2, 12, 0)


# ---- score() ----
def test_closer_scores_higher():
    assert score(0.1, age_days=0) > score(0.5, age_days=0)


def test_more_recent_scores_higher():
    assert score(0.3, age_days=0) > score(0.3, age_days=30)


def test_recency_decays_toward_zero():
    fresh = score(0.5, age_days=0)
    old = score(0.5, age_days=1000)
    assert old < fresh
    assert old > 0  # similarity term keeps it positive


# ---- select_indices() ----
def _item(source, age_days, distance):
    return (source, NOW - timedelta(days=age_days), distance)


def test_recency_tiebreaks_equal_similarity():
    # same distance, different age -> the fresher one ranks first
    items = [_item("slack", 30, 0.2), _item("slack", 0, 0.2)]
    assert select_indices(items, NOW, per_source_cap=8) == [1, 0]


def test_per_source_cap_prevents_crowding():
    # 11 very-relevant Slack msgs + 3 less-relevant Jira tickets.
    # Without a cap the Jira tickets would be evicted; with cap=8 they survive.
    slack = [_item("slack", 1, 0.05) for _ in range(11)]
    jira = [_item("jira", 1, 0.40) for _ in range(3)]
    items = slack + jira
    picked = select_indices(items, NOW, final_k=16, per_source_cap=8)
    sources = [items[i][0] for i in picked]
    assert sources.count("slack") == 8          # capped
    assert sources.count("jira") == 3           # all tickets kept
    assert len(picked) == 11


def test_final_k_is_a_hard_budget():
    items = [_item("slack", 1, 0.1) for _ in range(40)]
    picked = select_indices(items, NOW, final_k=16, per_source_cap=99)
    assert len(picked) == 16


def test_missing_timestamp_sorts_last_but_included():
    # equal similarity, so recency is the only differentiator: the timestamped
    # item ranks first, the timestamp-less one ranks last but is still included.
    items = [("slack", None, 0.3), _item("slack", 0, 0.3)]
    picked = select_indices(items, NOW, final_k=16, per_source_cap=8)
    assert picked[0] == 1
    assert set(picked) == {0, 1}
