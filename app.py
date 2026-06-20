import os
import re
import threading
import torch
from flask import Flask, request, jsonify, render_template
from transformers import pipeline

app = Flask(__name__)

# Model for emotion classification (7 classes: anger, disgust, fear, joy, neutral, sadness, surprise)
DEFAULT_MODEL = "j-hartmann/emotion-english-distilroberta-base"

class EmotionModelManager:
    def __init__(self):
        self.lock = threading.Lock()
        self.current_model_name = ""
        self.classifier = None
        self.status = "idle"  # idle, loading, ready, error
        self.error_message = ""
        
        # Detect device
        if torch.cuda.is_available():
            self.device = "cuda"
        elif torch.backends.mps.is_available():
            self.device = "mps"
        else:
            self.device = "cpu"
        print(f"[ModelManager] Detected hardware acceleration: {self.device}")

    def get_status(self):
        with self.lock:
            return {
                "status": self.status,
                "model_name": self.current_model_name,
                "device": self.device,
                "error": self.error_message
            }

    def set_status(self, status, model_name, error=""):
        with self.lock:
            self.status = status
            self.current_model_name = model_name
            self.error_message = error

    def load_model_thread(self, model_name):
        try:
            self.set_status("loading", model_name)
            print(f"[ModelManager] Loading model '{model_name}' on device '{self.device}'...")
            
            # Load text classification pipeline for emotion
            # return_all_results=True yields scores for all 7 classes
            classifier = pipeline(
                "text-classification",
                model=model_name,
                top_k=None,
                device=0 if self.device == "cuda" else (-1 if self.device == "cpu" else "mps")
            )
            
            with self.lock:
                self.classifier = classifier
                self.status = "ready"
                self.current_model_name = model_name
                
            print(f"[ModelManager] Model '{model_name}' successfully loaded and ready.")
        except Exception as e:
            print(f"[ModelManager] Error loading model '{model_name}': {e}")
            self.set_status("error", model_name, error=str(e))

    def load_model(self, model_name):
        with self.lock:
            if self.current_model_name == model_name and self.status == "ready":
                return
            if self.status == "loading" and self.current_model_name == model_name:
                return

        thread = threading.Thread(target=self.load_model_thread, args=(model_name,))
        thread.daemon = True
        thread.start()

    def analyze_text(self, text):
        with self.lock:
            if self.status != "ready" or self.classifier is None:
                raise ValueError("Model is not loaded and ready.")
            classifier = self.classifier
        
        # Run classification
        results = classifier(text)
        
        # Results format: [[{'label': 'joy', 'score': 0.95}, {'label': 'neutral', 'score': 0.02}, ...]]
        # We sort by score descending or return as key-value mapping
        raw_scores = results[0]
        scores_dict = {item['label']: round(float(item['score']), 4) for item in raw_scores}
        
        # Determine dominant emotion
        dominant_emotion = max(raw_scores, key=lambda x: x['score'])['label']
        
        return {
            "dominant": dominant_emotion,
            "scores": scores_dict
        }

manager = EmotionModelManager()

def split_into_sentences(text):
    """
    Split text into sentences using simple regex.
    Handles abbreviations and standard punctuation boundaries.
    """
    if not text:
        return []
    # Split on periods, exclamation marks, or question marks followed by spaces
    sentences = re.split(r'(?<=[.!?])\s+', text)
    # Filter empty items and strip spaces
    return [s.strip() for s in sentences if s.strip()]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/status', methods=['GET'])
def get_status():
    return jsonify(manager.get_status())

@app.route('/load-model', methods=['POST'])
def load_model():
    data = request.get_json() or {}
    model_name = data.get('model_name', DEFAULT_MODEL)
    manager.load_model(model_name)
    return jsonify({"message": f"Started loading model {model_name} in background."})

@app.route('/analyze', methods=['POST'])
def analyze():
    status_info = manager.get_status()
    if status_info['status'] != 'ready':
        return jsonify({"error": f"Model is not ready. Current status: {status_info['status']}"}), 503
        
    data = request.get_json() or {}
    text = data.get('text', '').strip()
    
    if not text:
        return jsonify({"error": "Input text cannot be empty."}), 400
        
    try:
        # 1. Overall analysis
        overall_result = manager.analyze_text(text)
        
        # 2. Sentence breakdown analysis
        sentences = split_into_sentences(text)
        sentence_analyses = []
        
        # Limit sentences analyzed individually to avoid long execution times for huge texts
        max_sentences_to_analyze = 50
        for i, sentence in enumerate(sentences[:max_sentences_to_analyze]):
            if len(sentence.split()) >= 2:  # Skip single words or punctuation marks
                res = manager.analyze_text(sentence)
                sentence_analyses.append({
                    "text": sentence,
                    "dominant": res["dominant"],
                    "scores": res["scores"]
                })
            else:
                sentence_analyses.append({
                    "text": sentence,
                    "dominant": "neutral",
                    "scores": {k: 0.0 for k in overall_result["scores"].keys()}
                })
                sentence_analyses[-1]["scores"]["neutral"] = 1.0
                
        return jsonify({
            "success": True,
            "overall": overall_result,
            "sentences": sentence_analyses,
            "total_sentences": len(sentences),
            "word_count": len(text.split()),
            "char_count": len(text)
        })
    except Exception as e:
        print(f"[API Error] Analysis failed: {e}")
        return jsonify({"error": f"Analysis failed: {str(e)}"}), 500

# Pre-load default model on startup
with app.app_context():
    manager.load_model(DEFAULT_MODEL)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8888))
    app.run(host='0.0.0.0', port=port, debug=False)
