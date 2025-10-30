import speech_recognition as sr
from flask import Flask, request, jsonify
from flask_cors import CORS
from deep_translator import GoogleTranslator
from PIL import Image
import pytesseract
import io
import fitz  # PyMuPDF
from pydub import AudioSegment
import os

# --- CONFIGURATION ---
# For Windows Users: If Tesseract is not in your PATH, uncomment and set the path.
# Make sure this path is correct for your installation from https://github.com/UB-Mannheim/tesseract/wiki
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# --- FLASK APP INITIALIZATION ---
app = Flask(__name__)
CORS(app)

# --- TRANSLATION ENDPOINTS ---

@app.route('/translate', methods=['POST'])
def translate_text():
    """Endpoint for plain text translation."""
    data = request.get_json()
    if not data or 'text' not in data or 'target_language' not in data:
        return jsonify({'error': 'Missing required data'}), 400

    text_to_translate = data['text']
    target_lang = data['target_language']

    try:
        translated_text = GoogleTranslator(source='auto', target=target_lang).translate(text_to_translate)
        return jsonify({'translated_text': translated_text})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/ocr-translate', methods=['POST'])
def ocr_translate():
    """Endpoint for image OCR and translation."""
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    file = request.files['image']
    target_lang = request.form.get('target_language', 'es')

    try:
        image_stream = io.BytesIO(file.read())
        image = Image.open(image_stream)
        
        extracted_text = pytesseract.image_to_string(image)

        if not extracted_text or extracted_text.strip() == "":
            return jsonify({
                'extracted_text': '(No text found in the image)',
                'translated_text': ''
            })

        translated_text = GoogleTranslator(source='auto', target=target_lang).translate(extracted_text)
        
        return jsonify({
            'extracted_text': extracted_text,
            'translated_text': translated_text
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/pdf-translate', methods=['POST'])
def pdf_translate():
    """Endpoint for PDF text extraction and translation."""
    if 'pdf' not in request.files:
        return jsonify({'error': 'No PDF file provided'}), 400

    file = request.files['pdf']
    target_lang = request.form.get('target_language', 'es')

    try:
        pdf_document = fitz.open(stream=file.read(), filetype="pdf")
        extracted_text = ""
        for page in pdf_document:
            extracted_text += page.get_text()
        
        pdf_document.close()

        if not extracted_text or extracted_text.strip() == "":
            return jsonify({
                'extracted_text': '(No text found in the PDF)',
                'translated_text': ''
            })

        translated_text = GoogleTranslator(source='auto', target=target_lang).translate(extracted_text)
        
        return jsonify({
            'extracted_text': extracted_text,
            'translated_text': translated_text
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/speech-translate', methods=['POST'])
def speech_translate():
    """Endpoint for speech recognition and translation."""
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400

    audio_file = request.files['audio']
    target_lang = request.form.get('target_language', 'es')
    # **NEW**: Get the source language for recognition
    source_lang = request.form.get('source_language', 'en-IN') 

    try:
        # Convert webm/ogg to wav for recognition
        audio = AudioSegment.from_file(io.BytesIO(audio_file.read()))
        wav_audio_stream = io.BytesIO()
        audio.export(wav_audio_stream, format="wav")
        wav_audio_stream.seek(0)

        r = sr.Recognizer()
        with sr.AudioFile(wav_audio_stream) as source:
            audio_data = r.record(source)
        
        # **MODIFIED**: Use the source language in the recognition call
        recognized_text = r.recognize_google(audio_data, language=source_lang)

        translated_text = GoogleTranslator(source='auto', target=target_lang).translate(recognized_text)
        
        return jsonify({
            'recognized_text': recognized_text,
            'translated_text': translated_text
        })
    except sr.UnknownValueError:
        return jsonify({'error': "Could not understand audio"}), 500
    except sr.RequestError as e:
        return jsonify({'error': f"Speech recognition service error; {e}"}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# --- MAIN EXECUTION ---
if __name__ == '__main__':
    app.run(debug=True, port=5000)

