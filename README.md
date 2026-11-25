# Urban Air Quality Assistant

**Live demo:** https://thotasuhas.github.io/pw2/ · **Vertical:** urban air quality and personal health guidance

An AQI number like "162" does not tell anyone what to do. This assistant turns live air quality for any city into a clear **Go / Take care / Avoid** decision, tailored to *who* is asking and *what* they plan to do, and finds the cleanest time to go outside.

## How it works

```mermaid
flowchart LR
  U[User: city, person type, activity, duration] --> V[Validation]
  V --> D[data.js: Open-Meteo geocoding + hourly PM2.5/PM10]
  D --> A[aqi.js: EPA 2024 AQI]
  A --> R[report.js: view model]
  R --> C[advice.js: persona x activity decision + cleanest window]
  C --> UI[main.js: accessible DOM rendering]
```

1. **Data** (`js/data.js`): geocodes the city, then requests hourly PM2.5 and PM10 from the free [Open-Meteo](https://open-meteo.com/) APIs (no API key, so no secrets). The "current" hour is found using the *city's* UTC offset, not the browser's. Results are cached for 15 minutes.
2. **AQI** (`js/aqi.js`): US EPA 2024 breakpoints, with EPA truncation rules (PM2.5 to 0.1, PM10 to integer). Overall AQI is the maximum pollutant sub-index, capped at 500.
3. **Decision logic** (`js/advice.js`):
   - *Person type* sets thresholds: general adult, child or older adult, asthma/heart/lung condition, outdoor worker.
   - *Activity* scales the AQI to an **effective AQI** (rest x1.0, commute x1.15, exercise x1.4), because breathing harder inhales more pollutant.
   - The result is a level, a headline and concrete actions (mask, indoor alternative, when to seek care).
   - A sliding-window search finds the cleanest contiguous window of the requested length in the next 24 hours.
4. **UI** (`js/main.js`, `index.html`, `css/styles.css`): thin DOM layer; all logic lives in pure, tested modules.

## Project structure

| Path | Responsibility |
|---|---|
| `js/aqi.js` | Pure AQI maths and categories |
| `js/advice.js` | Persona/activity decision logic, cleanest-window search |
| `js/data.js` | Validation, API access, response checking, caching (injectable `fetch` and clock) |
| `js/report.js` | Combines data and choices into a display-ready report |
| `js/main.js` | Form handling and safe rendering |
| `tests/` | Unit tests for every module (Node's built-in test runner) |
| `.github/workflows/ci.yml` | Lint and tests on Node 20 and 22 for every push |

## Run, test, lint

```bash
npm install          # dev tools only (ESLint); the app itself has zero runtime dependencies
npm test             # 36 tests, no network needed
npm run coverage     # coverage report (100% line coverage of js/aqi, advice, data, report)
npm run lint         # ESLint
npm run check        # lint + tests
npx serve .          # or open index.html through any static server
```

## Evaluation focus areas

- **Code quality:** small single-purpose ES modules, pure functions, JSDoc types, frozen constants, dependency injection, custom error types, ESLint, EditorConfig, no duplicated logic.
- **Security:** strict Content-Security-Policy (`default-src 'none'`, scripts/styles only from self, network only to the two Open-Meteo hosts); input whitelist validation (Unicode-aware); all output rendered with `textContent`, never `innerHTML`; response-shape validation; request timeouts and abort; no keys, cookies or storage; no third-party scripts.
- **Efficiency:** 15-minute cache; one geocoding and one air-quality request per lookup; in-flight requests are cancelled when superseded; zero runtime dependencies and no build step.
- **Testing:** 36 tests including AQI boundary tables for every breakpoint, monotonicity property checks over the full AQI range, a full persona x activity severity matrix, mocked-network tests (success, not found, HTTP error, bad payload, offline, timeout, abort), time-zone handling and cache TTL.
- **Accessibility:** skip link and landmarks; labelled controls with hints; errors announced with `role="alert"` and `aria-invalid`; focus moves to the results heading; verdict conveyed by icon + text + border (never colour alone); chart has a text alternative and a full data table; 44px touch targets; WCAG AA contrast in light, dark and high-contrast modes; `prefers-reduced-motion` respected; works at 200% zoom and on mobile.
- **Problem alignment:** personalised, actionable air quality guidance for real urban decisions (commute, exercise, school, outdoor work).

## Assumptions and limitations

- Only PM2.5 and PM10 are used (the dominant urban pollutants); ozone and NO2 are not included.
- Open-Meteo values are **modelled estimates**, not regulatory monitor readings, and may differ from local stations.
- Thresholds are conservative general guidance, **not medical advice**. People with medical conditions should follow their clinician's advice.
- The first geocoding match is used; add a country or state for ambiguous city names.

## AI assistance

Built with Claude (Anthropic) as a coding assistant for design, implementation, tests and documentation. No generative AI runs inside the app; all advice comes from transparent rule-based logic.

## License

MIT
