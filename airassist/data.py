"""Data access: geocoding + hourly air quality via Open-Meteo (no API key needed)."""
from __future__ import annotations
import requests
from .aqi import compute_aqi

GEO = "https://geocoding-api.open-meteo.com/v1/search"
AIR = "https://air-quality-api.open-meteo.com/v1/air-quality"
TIMEOUT = 8

_SAMPLE_PM = [(60, 110), (55, 100), (48, 90), (40, 80), (35, 70), (30, 65), (38, 75), (55, 100),
              (70, 130), (65, 120), (50, 95), (38, 80), (30, 65), (24, 55), (20, 50), (22, 52),
              (28, 60), (42, 85), (58, 105), (66, 120), (62, 115), (58, 108), (55, 102), (52, 98)]
SAMPLE = {  # offline fallback so the demo never breaks
    "place": "Sample city (offline demo data)",
    "hours": [(f"{h:02d}:00", compute_aqi(p, q)) for h, (p, q) in enumerate(_SAMPLE_PM)],
}


def _clean_query(q: str) -> str:
    q = " ".join(q.split())
    if not (2 <= len(q) <= 80) or not all(c.isalnum() or c in " .,'-" for c in q):
        raise ValueError("Enter a city name (2-80 letters, numbers, spaces, . , ' -).")
    return q


def fetch_city(query: str) -> dict:
    """Return {'place': str, 'hours': [(label, aqi)]} for the next 48 hours."""
    q = _clean_query(query)
    g = requests.get(GEO, params={"name": q, "count": 1}, timeout=TIMEOUT)
    g.raise_for_status()
    results = g.json().get("results") or []
    if not results:
        raise LookupError(f"No place found for '{q}'.")
    r = results[0]
    a = requests.get(AIR, params={
        "latitude": r["latitude"], "longitude": r["longitude"],
        "hourly": "pm2_5,pm10", "forecast_days": 2, "timezone": "auto"}, timeout=TIMEOUT)
    a.raise_for_status()
    h = a.json()["hourly"]
    hours = []
    for t, p25, p10 in zip(h["time"], h["pm2_5"], h["pm10"]):
        if p25 is None:
            continue
        hours.append((t[5:16].replace("T", " "), compute_aqi(p25, p10)))
    if not hours:
        raise LookupError("No air quality data available for this place.")
    return {"place": f"{r['name']}, {r.get('country', '')}".strip(", "), "hours": hours[:48]}
