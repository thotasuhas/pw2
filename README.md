# Urban Air Quality Assistant

## Chosen vertical
**Urban air quality & personal health guidance.** Raw AQI numbers are hard to act on; this assistant turns live air quality into a clear *go / take care / avoid* decision for the person and activity in question.

## Approach and logic
1. **Data**: hourly PM2.5 and PM10 for any city from the free [Open-Meteo](https://open-meteo.com/) geocoding and air-quality APIs (no API key, so no secrets in the repo).
2. **AQI**: computed with US EPA 2024 breakpoints; overall AQI is the max of the PM2.5 and PM10 sub-indices (`airassist/aqi.py`).
3. **Context-aware decisions** (`airassist/advice.py`):
   - *Persona* sets thresholds (general adult, child/older adult, respiratory/heart condition, outdoor worker).
   - *Activity* scales the AQI by exertion (rest 1.0x, commute 1.15x, exercise 1.4x), since breathing harder inhales more pollutant.
   - Output is a level, a headline, and concrete actions (mask, indoor alternative, when to seek care).
   - A sliding-window search finds the cleanest time to go out in the next 24 hours.
4. **UI** (`app.py`, Streamlit): city, persona, activity, duration → advice, trend chart, and a data table.

## Live demo
https://thotasuhas.github.io/pw2/ (static HTML/JS port of the same logic, hosted on GitHub Pages)

## How to run
```bash
# Web version: open index.html or visit the live demo above
# Python/Streamlit version:
pip install -r requirements.txt
streamlit run app.py
pytest
```

## Quality notes
- **Security**: strict input validation on city names, request timeouts, no API keys or secrets, no `eval`/shell use.
- **Efficiency**: API results cached for 15 minutes; only needed fields requested.
- **Accessibility**: advice conveyed by text and icon (never colour alone), plain language, data table alternative to the chart, semantic headings.
- **Testing**: unit tests for AQI maths, persona/activity logic, window search, and input validation.
- **Resilience**: falls back to bundled sample data if the API is unreachable.

## Assumptions
- PM2.5/PM10 are used as the dominant urban pollutants; O3/NO2 are not included.
- Thresholds are conservative general guidance, **not medical advice**.
- Open-Meteo values are modelled estimates, not regulatory monitor readings.
