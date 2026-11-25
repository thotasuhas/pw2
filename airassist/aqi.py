"""AQI computation (US EPA 2024 breakpoints) for PM2.5 and PM10."""
from __future__ import annotations

# (conc_low, conc_high, aqi_low, aqi_high)
PM25 = [(0.0, 9.0, 0, 50), (9.1, 35.4, 51, 100), (35.5, 55.4, 101, 150),
        (55.5, 125.4, 151, 200), (125.5, 225.4, 201, 300), (225.5, 325.4, 301, 500)]
PM10 = [(0, 54, 0, 50), (55, 154, 51, 100), (155, 254, 101, 150),
        (255, 354, 151, 200), (355, 424, 201, 300), (425, 604, 301, 500)]

CATEGORIES = [(50, "Good"), (100, "Moderate"), (150, "Unhealthy for Sensitive Groups"),
              (200, "Unhealthy"), (300, "Very Unhealthy"), (500, "Hazardous")]


def _subindex(conc: float, table: list[tuple]) -> int:
    if conc is None or conc != conc or conc < 0:
        raise ValueError("concentration must be a non-negative number")
    if conc > table[-1][1]:
        return 500
    for c_lo, c_hi, i_lo, i_hi in table:
        # gaps between rounded breakpoints are treated as part of the upper band
        if conc <= c_hi:
            conc = max(conc, c_lo)
            return round((i_hi - i_lo) / (c_hi - c_lo) * (conc - c_lo) + i_lo)
    return 500


def compute_aqi(pm25: float, pm10: float | None = None) -> int:
    """Overall AQI = max of pollutant sub-indices."""
    values = [_subindex(pm25, PM25)]
    if pm10 is not None:
        values.append(_subindex(pm10, PM10))
    return max(values)


def category(aqi: int) -> str:
    for limit, name in CATEGORIES:
        if aqi <= limit:
            return name
    return CATEGORIES[-1][1]
