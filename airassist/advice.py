"""Context-aware decision logic: persona + activity + AQI -> recommendation."""
from __future__ import annotations
from dataclasses import dataclass

# Lower threshold = more cautious. Effective AQI >= caution -> reduce, >= avoid -> avoid.
PERSONAS = {
    "General adult": {"caution": 100, "avoid": 200},
    "Child / older adult": {"caution": 75, "avoid": 150},
    "Asthma / heart / lung condition": {"caution": 50, "avoid": 125},
    "Outdoor worker / commuter": {"caution": 100, "avoid": 175},
}
ACTIVITIES = {"Resting / indoors": 1.0, "Commute / walking": 1.15, "Exercise outdoors": 1.4}


@dataclass(frozen=True)
class Advice:
    level: str          # "Go", "Take care", "Avoid"
    headline: str
    actions: list[str]


def effective_aqi(aqi: int, activity: str) -> float:
    """Exertion increases inhaled dose, so scale the AQI by activity."""
    return aqi * ACTIVITIES[activity]


def advise(aqi: int, persona: str, activity: str) -> Advice:
    if persona not in PERSONAS or activity not in ACTIVITIES:
        raise ValueError("unknown persona or activity")
    t = PERSONAS[persona]
    eff = effective_aqi(aqi, activity)
    if eff >= t["avoid"]:
        return Advice("Avoid", "Avoid outdoor exposure right now.", [
            "Move activity indoors or postpone it.",
            "Keep windows closed; use an air purifier if you have one.",
            "If you must go out, wear a well-fitted N95/FFP2 mask.",
            "Seek medical advice if you have breathing difficulty or chest tightness."])
    if eff >= t["caution"]:
        return Advice("Take care", "Reduce prolonged or intense outdoor activity.", [
            "Shorten outdoor time and keep exertion light.",
            "Prefer parks or side streets away from heavy traffic.",
            "Consider an N95/FFP2 mask for commutes.",
            "Carry any prescribed medication."])
    return Advice("Go", "Air quality is acceptable for your plan.", [
        "Normal outdoor activity is fine.",
        "Re-check later if conditions change."])


def best_window(hours: list[tuple[str, int]], hours_needed: int = 1):
    """Return (start_label, avg_aqi) of the cleanest contiguous window, or None."""
    if hours_needed < 1 or len(hours) < hours_needed:
        return None
    best = None
    for i in range(len(hours) - hours_needed + 1):
        avg = sum(a for _, a in hours[i:i + hours_needed]) / hours_needed
        if best is None or avg < best[1]:
            best = (hours[i][0], round(avg))
    return best
