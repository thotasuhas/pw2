"""Streamlit UI: pick a city, persona and activity -> get clear, accessible advice."""
import streamlit as st
from airassist.advice import ACTIVITIES, PERSONAS, advise, best_window
from airassist.aqi import category
from airassist.data import SAMPLE, fetch_city

st.set_page_config(page_title="Urban Air Quality Assistant", page_icon="🌫️")
st.title("Urban Air Quality Assistant")
st.caption("Personalised, plain-language guidance. Not medical advice.")


@st.cache_data(ttl=900, show_spinner="Fetching air quality…")
def load(city: str):
    return fetch_city(city)


city = st.text_input("City", "Hyderabad")
persona = st.selectbox("Who is this for?", list(PERSONAS))
activity = st.selectbox("Planned activity", list(ACTIVITIES))
duration = st.slider("Duration (hours)", 1, 4, 1)

try:
    data = load(city)
except (ValueError, LookupError) as e:
    st.error(str(e))
    st.stop()
except Exception:
    st.warning("Live data unavailable; showing offline sample data.")
    data = SAMPLE

now_label, now_aqi = data["hours"][0]
adv = advise(now_aqi, persona, activity)
icon = {"Go": "✅", "Take care": "⚠️", "Avoid": "⛔"}[adv.level]

st.subheader(data["place"])
st.metric("Current AQI", now_aqi, category(now_aqi))
st.markdown(f"### {icon} {adv.level}: {adv.headline}")  # text + icon, never colour alone
for a in adv.actions:
    st.markdown(f"- {a}")

win = best_window(data["hours"][:24], duration)
if win:
    st.info(f"Cleanest {duration}-hour window in the next 24 h starts at {win[0]} (avg AQI {win[1]}).")
st.line_chart({"AQI": [a for _, a in data["hours"][:24]]})
with st.expander("Data table (screen-reader friendly)"):
    st.table({"Time": [t for t, _ in data["hours"][:24]], "AQI": [a for _, a in data["hours"][:24]]})
