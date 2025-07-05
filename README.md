
# SROI Calculator – Strive: Sustainable Tourism Initiative

An interactive Streamlit-based app to calculate and project **Social Return on Investment (SROI)**

Developed for:  
**Strive – Sustainable Tourism Initiative**  

---

## 🚀 Features

✅ Custom stakeholder & outcome inputs  
✅ Automatic net outcome & SROI calculation  
✅ Projection for 3 years using multiple growth models:  
   - Linear Growth  
   - Exponential Growth  
   - Logistic Growth  
✅ Drop-off and attribution controls  
✅ Investment slider & dynamic SROI charting

---

## 📦 Repository Structure

```
sroi-calculator-strive/
│
├── app.py      # Main Streamlit app
├── README.md                    # You're here
└──requirements.txt             # Python dependencies
```

---

## 🛠️ Installation & Running

### 1. Clone this repository

```bash
git clone https://github.com/fiqgant/sroi-calculator-strive.git
cd sroi-calculator-strive
```

### 2. Create virtual environment (optional)

```bash
python -m venv venv
source venv/bin/activate  # For Windows: venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the app

```bash
streamlit run app.py
```

---

## 📈 Growth Models Explained

| Model       | Description                                                  |
|-------------|--------------------------------------------------------------|
| Linear      | Assumes steady yearly growth with fixed drop-off             |
| Exponential | Assumes compounding growth, good for viral or network effects|
| Logistic    | Growth accelerates early but plateaus as capacity is reached |

---

## 📃 License

MIT License © 2025 Strive - Sustainable Tourism Initiative

---

## 🤝 Contact

Made with 💚 by the Strive Impact Team  
📩 Email: [your-email@example.com]  
🌍 Website: [optional]
