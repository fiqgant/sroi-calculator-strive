import streamlit as st
st.set_page_config(page_title="SROI Calculator - STRIVE", layout="wide")  # HARUS DI ATAS

import streamlit_authenticator as stauth
import yaml
from yaml.loader import SafeLoader
import pandas as pd
import numpy as np
import math
import matplotlib.pyplot as plt

# === Load login config ===
with open('config.yaml') as file:
    config = yaml.load(file, Loader=SafeLoader)

authenticator = stauth.Authenticate(
    config['credentials'],
    config['cookie']['name'],
    config['cookie']['key'],
    config['cookie']['expiry_days']
)

authenticator.login()

# === Handle Login Status ===
if st.session_state.get("authentication_status") is False:
    st.error("Username/password salah.")
elif st.session_state.get("authentication_status") is None:
    st.warning("Silakan login terlebih dahulu.")
elif st.session_state.get("authentication_status"):
    authenticator.logout('Logout', 'sidebar')
    st.sidebar.success(f"Login sebagai {st.session_state.get('name')}")

    # === APLIKASI SROI DIMULAI ===

    st.markdown("""
    <style>
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    </style>
    """, unsafe_allow_html=True)

    st.markdown("""
    <h1 style='text-align: center; color: #2C6E49;'>📊 Social Return on Investment (SROI) Calculator</h1>
    <h4 style='text-align: center; color: gray;'>A Tool for Multi-Year Social Impact & Value Forecasting</h4>
    """, unsafe_allow_html=True)

    rows = st.number_input("Jumlah Stakeholder / Outcome", min_value=1, max_value=20, value=9)

    data = []
    st.markdown("### 🧾 Input Data Outcome per Stakeholder")
    for i in range(rows):
        with st.expander(f"Stakeholder #{i+1}", expanded=(i < 3)):
            col1, col2 = st.columns(2)
            with col1:
                stakeholder = st.text_input(f"Nama Stakeholder & Outcome #{i+1}", key=f"nama_{i}")
                quantity = st.number_input("Jumlah Unit", value=1, step=1, key=f"qty_{i}")
                proxy = st.number_input("Proksi Finansial (Rp/unit)", value=1_000_000, step=100_000, key=f"proxy_{i}")
            with col2:
                dw = st.slider("Deadweight (%)", 0, 100, 20, key=f"dw_{i}")
                att = st.slider("Attribution (%)", 0, 100, 30, key=f"att_{i}")
                drop = st.slider("Drop-off (%)", 0, 100, 0, key=f"drop_{i}")

            gross = quantity * proxy
            net = gross * (1 - dw/100) * (1 - att/100) * (1 - drop/100)
            data.append({
                "Stakeholder & Outcome": stakeholder,
                "Quantity": quantity,
                "Proxy (Rp)": proxy,
                "Gross Outcome (Rp)": gross,
                "Deadweight (%)": dw,
                "Attribution (%)": att,
                "Drop-off (%)": drop,
                "Net Outcome (Rp)": net
            })

    df = pd.DataFrame(data)

    st.markdown("### 📊 Perhitungan Tahun Pertama")
    st.dataframe(df.style.format({
        "Proxy (Rp)": "Rp {:,.0f}",
        "Gross Outcome (Rp)": "Rp {:,.0f}",
        "Net Outcome (Rp)": "Rp {:,.0f}"
    }))

    total_net = df["Net Outcome (Rp)"].sum()
    total_gross = df["Gross Outcome (Rp)"].sum()
    investasi = st.number_input("💰 Total Investasi Tahun Pertama (Rp)", value=112_250_000, step=1_000_000)
    sroi1 = total_net / investasi if investasi > 0 else 0

    st.write(f"**Total Net Outcome Tahun 1**: Rp{total_net:,.0f}")
    st.write(f"**SROI Tahun 1** = Rp{total_net:,.0f} / Rp{investasi:,.0f} = **{sroi1:.2f}**")

    st.markdown("## 🔮 Proyeksi 3 Tahun")
    colA, colB, colC = st.columns(3)
    with colA:
        growth = st.slider("📈 Pertumbuhan Tahunan (%)", 0, 50, 10)
    with colB:
        dropoff = st.slider("📉 Drop-off Dampak Tahunan (%)", 0, 50, 20)
    with colC:
        investasi_tahunan = st.number_input("💸 Investasi Tahunan (Rp)", value=investasi, step=1_000_000)

    st.markdown("### 🌱 Parameter Logistic Growth")
    col1, col2, col3 = st.columns(3)
    with col1:
        L = st.number_input("Kapasitas Maksimum (L)", value=1_000_000_000)
    with col2:
        k = st.slider("Laju Pertumbuhan (k)", 0.1, 3.0, 1.2)
    with col3:
        x0 = st.slider("Titik Tengah (x₀)", 1, 5, 2)

    g = 1 + (growth / 100)
    d = 1 - (dropoff / 100)

    linear = [total_net]
    exp = [total_net]
    logistic = [total_net]

    def logistic_formula(t):
        return L / (1 + math.exp(-k * (t - x0)))

    for i in range(1, 3):
        linear.append(linear[-1] * g * d)
        exp.append(exp[-1] * math.exp(growth / 100) * d)
        logistic.append(logistic_formula(i + 1))

    df_proj = pd.DataFrame({
        "Tahun": [1, 2, 3],
        "Linear Outcome": linear,
        "SROI Linear": [v / investasi_tahunan for v in linear],
        "Exponential Outcome": exp,
        "SROI Exponential": [v / investasi_tahunan for v in exp],
        "Logistic Outcome": logistic,
        "SROI Logistic": [v / investasi_tahunan for v in logistic]
    })

    st.markdown("### 📈 Hasil Proyeksi SROI")
    st.dataframe(df_proj.style.format({
        "Linear Outcome": "Rp {:,.0f}",
        "Exponential Outcome": "Rp {:,.0f}",
        "Logistic Outcome": "Rp {:,.0f}",
        "SROI Linear": "{:.2f}",
        "SROI Exponential": "{:.2f}",
        "SROI Logistic": "{:.2f}"
    }))

    st.markdown("### 📊 Grafik Perbandingan SROI per Tahun")
    fig, ax = plt.subplots()
    ax.plot(df_proj["Tahun"], df_proj["SROI Linear"], label="Linear", marker="o")
    ax.plot(df_proj["Tahun"], df_proj["SROI Exponential"], label="Exponential", marker="o")
    ax.plot(df_proj["Tahun"], df_proj["SROI Logistic"], label="Logistic", marker="o")
    ax.set_xlabel("Tahun")
    ax.set_ylabel("SROI")
    ax.set_title("Proyeksi SROI 3 Tahun")
    ax.legend()
    st.pyplot(fig)
