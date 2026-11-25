import pytest
from airassist.aqi import compute_aqi, category
from airassist.advice import advise, best_window
from airassist.data import _clean_query


def test_aqi_known_points():
    assert compute_aqi(0) == 0
    assert compute_aqi(9.0) == 50
    assert compute_aqi(35.4) == 100
    assert compute_aqi(1000) == 500


def test_takes_max_of_pollutants():
    assert compute_aqi(5, 300) > compute_aqi(5, 10)


def test_negative_rejected():
    with pytest.raises(ValueError):
        compute_aqi(-1)


def test_category():
    assert category(40) == "Good" and category(160) == "Unhealthy"


def test_persona_sensitivity():
    assert advise(90, "General adult", "Resting / indoors").level == "Go"
    assert advise(90, "Asthma / heart / lung condition", "Resting / indoors").level == "Take care"


def test_activity_raises_risk():
    assert advise(80, "General adult", "Resting / indoors").level == "Go"
    assert advise(80, "General adult", "Exercise outdoors").level == "Take care"


def test_avoid_has_mask_advice():
    a = advise(250, "General adult", "Commute / walking")
    assert a.level == "Avoid" and any("N95" in x for x in a.actions)


def test_invalid_inputs():
    with pytest.raises(ValueError):
        advise(50, "nobody", "Resting / indoors")


def test_best_window():
    hrs = [("a", 100), ("b", 40), ("c", 50), ("d", 120)]
    assert best_window(hrs, 2) == ("b", 45)
    assert best_window(hrs, 9) is None


def test_query_validation():
    assert _clean_query("  New   Delhi ") == "New Delhi"
    for bad in ["", "a", "x;DROP", "<script>"]:
        with pytest.raises(ValueError):
            _clean_query(bad)
