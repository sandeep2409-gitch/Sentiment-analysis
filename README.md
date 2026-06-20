# Day 28: Sentiment & Emotion Analysis

An advanced, feature-rich Natural Language Processing (NLP) web application built using Python (Flask) and Hugging Face Transformers. The application decodes the emotional "aura" of text, categorizing it into 7 distinct emotions (anger, disgust, fear, joy, neutral, sadness, and surprise), mapping it onto a sentiment spectrum, and providing a granular sentence-by-sentence analysis.

## 🚀 Features

- **Multi-Emotion Profiling**: Classifies text using the `j-hartmann/emotion-english-distilroberta-base` model.
- **Sentiment Spectrum Calculation**: Dynamically maps fine-grained emotion probabilities into Positive, Neutral, and Negative coordinates.
- **Interactive Sentence Inspector**: Splits input text into individual sentences. Click on any sentence to isolate and view its specific emotion weights and mini-bar breakdowns.
- **Dynamic Emoji Particles**: Triggers a floating emoji particle rain corresponding to the dominant emotion (e.g., sparkles for Joy, fire for Anger, rain for Sadness).
- **Glassmorphic Cyberpunk UI**: Sleek, immersive dark mode designed using custom vanilla CSS, featuring emotion-specific color theme transitions and transitions.
- **Print & Export Report**: Print-friendly CSS styles that cleanly format a PDF analysis report, removing text inputs and console elements.
- **Hardware Acceleration**: Automatically detects and leverages Apple Silicon GPU (`mps`) or CUDA GPU for faster inference, falling back to CPU.

## 🛠️ Tech Stack

- **Backend**: Flask (Python 3.14+)
- **NLP Engine**: PyTorch + Hugging Face `transformers` pipeline
- **Model**: `j-hartmann/emotion-english-distilroberta-base` (DistilRoBERTa model, ~300MB)
- **Frontend**: HTML5, CSS3 (Vanilla design, no external utility frameworks), Javascript (Vanilla ES6)

## 📁 Directory Structure

```
DAY28 --SENTIMENT ANALYSIS/
├── app.py                   # Flask server and asynchronous NLP model manager
├── requirements.txt         # Project dependencies (Flask, torch, transformers)
├── README.md                # Project documentation (this file)
├── templates/
│   └── index.html           # Glassmorphic semantic HTML structure
└── static/
    ├── css/
    │   └── styles.css       # Premium style system, layout, and print rules
    └── js/
        └── main.js          # DOM control, preset injections, and particle animations
```

## 💻 How to Run

1. **Navigate to the Day 28 folder:**
   ```bash
   cd "DAY28 --SENTIMENT ANALYSIS"
   ```

2. **Activate the virtual environment:**
   ```bash
   source venv/bin/activate
   ```

3. **Start the Flask server:**
   ```bash
   python3 app.py
   ```
   *Alternatively, you can run directly without activating via:*
   ```bash
   ./venv/bin/python3 app.py
   ```

4. **Access the application:**
   Open [http://localhost:8888](http://localhost:8888) in your web browser.

> [!NOTE]
> On the very first run, the server will download the 300MB NLP model from Hugging Face in the background. During this time, the top-right badge will show **"DOWNLOADING MODEL..."**. Once complete, it will change to **"MODEL READY"** (pulsing green) and enable the text inputs. Subsequent runs are instantaneous as the model is cached locally.
# Sentiment-analysis
