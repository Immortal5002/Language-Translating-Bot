import React, { useState, useRef } from 'react';
import axios from 'axios';
import './App.css';

// SVG Icon Components for a cleaner look
const TextIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 6.1H3"/><path d="M21 12.1H3"/><path d="M15.1 18.1H3"/></svg>
);
const ImageIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
);
const PdfIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
);
const SpeechIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
);

function App() {
  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState('text');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [sourceLanguage, setSourceLanguage] = useState('ml-IN'); 
  
  // States for Text Translation
  const [inputText, setInputText] = useState('');
  const [textTranslation, setTextTranslation] = useState('');

  // States for Image Translation
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageResult, setImageResult] = useState(null);

  // States for PDF Translation
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfResult, setPdfResult] = useState(null);

  // MODIFIED: States for Speech Translation are now split
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState(''); // Stores the result of speech recognition
  const [speechTranslation, setSpeechTranslation] = useState(''); // Stores the final translation
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  
  // Universal Loading and Error States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // --- API HANDLERS ---
  const handleTextTranslate = async (textToTranslate, language) => {
    if (!textToTranslate) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await axios.post('http://127.0.0.1:5000/translate', {
        text: textToTranslate,
        target_language: language,
      });
      // This function will now be used by both Text and Speech tabs
      if (activeTab === 'text') {
        setTextTranslation(res.data.translated_text);
      } else if (activeTab === 'speech') {
        setSpeechTranslation(res.data.translated_text);
      }
    } catch (err) {
      setError('Translation failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageTranslate = async () => {
    if (!imageFile) return;
    setIsLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('target_language', targetLanguage);
    try {
      const res = await axios.post('http://127.0.0.1:5000/ocr-translate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImageResult(res.data);
    } catch (err) {
      setError('Image translation failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePdfTranslate = async () => {
    if (!pdfFile) return;
    setIsLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    formData.append('target_language', targetLanguage);
    try {
        const res = await axios.post('http://127.0.0.1:5000/pdf-translate', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        setPdfResult(res.data);
    } catch (err) {
        setError('PDF translation failed. Please try again.');
    } finally {
        setIsLoading(false);
    }
  };
  
  // MODIFIED: This function now only handles the initial recognition and first translation
  const handleSpeechRecognition = async (audioBlob) => {
    setIsLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('target_language', targetLanguage);
    formData.append('source_language', sourceLanguage);
    try {
        const res = await axios.post('http://127.0.0.1:5000/speech-translate', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        // NEW: Set both recognized text and the first translation
        setRecognizedText(res.data.recognized_text);
        setSpeechTranslation(res.data.translated_text);
    } catch (err) {
        setError('Speech recognition failed. Please try again.');
    } finally {
        setIsLoading(false);
    }
  };

  // --- EVENT HANDLERS ---
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setImageResult(null);
    }
  };
  
  const handlePdfChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPdfFile(file);
      setPdfResult(null);
    }
  };
  
  const handleStartRecording = async () => {
    // NEW: Clear previous results when starting a new recording
    setRecognizedText('');
    setSpeechTranslation('');
    setError('');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder.current = new MediaRecorder(stream);
        mediaRecorder.current.ondataavailable = (event) => {
            audioChunks.current.push(event.data);
        };
        mediaRecorder.current.onstop = () => {
            const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
            handleSpeechRecognition(audioBlob); // Call the recognition handler
            audioChunks.current = [];
            stream.getTracks().forEach(track => track.stop());
        };
        mediaRecorder.current.start();
        setIsRecording(true);
    } catch (err) {
        setError('Microphone access denied. Please allow microphone access in your browser settings.');
    }
  };
  
  const handleStopRecording = () => {
    if (mediaRecorder.current) {
        mediaRecorder.current.stop();
        setIsRecording(false);
    }
  };
  
  // --- UI RENDERING ---
  const renderContent = () => {
    switch (activeTab) {
      case 'text':
        return (
          <div className="tab-content">
            <h2>Text Translation</h2>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter text here..."
            />
            <button onClick={() => handleTextTranslate(inputText, targetLanguage)} disabled={isLoading || !inputText}>
              {isLoading ? <div className="loader"></div> : 'Translate'}
            </button>
            {textTranslation && (
              <div className="output-container">
                <h3>Translation:</h3>
                <p>{textTranslation}</p>
              </div>
            )}
          </div>
        );
      case 'image':
        return (
          <div className="tab-content">
            <h2>Image Translation</h2>
            <div className="file-input-wrapper">
              <input type="file" accept="image/*" onChange={handleImageChange} id="image-upload"/>
              <label htmlFor="image-upload" className="btn-file">
                <ImageIcon /> {imageFile ? imageFile.name : 'Choose an Image'}
              </label>
            </div>
            {imagePreview && <div className="image-preview"><img src={imagePreview} alt="Preview"/></div>}
            <button onClick={handleImageTranslate} disabled={isLoading || !imageFile}>
              {isLoading ? <div className="loader"></div> : 'Translate from Image'}
            </button>
            {imageResult && (
              <div className="output-container">
                <h3>Extracted Text:</h3>
                <p className="extracted">{imageResult.extracted_text}</p>
                <h3>Translation:</h3>
                <p>{imageResult.translated_text}</p>
              </div>
            )}
          </div>
        );
      case 'pdf':
        return (
            <div className="tab-content">
                <h2>PDF Document Translation</h2>
                <div className="file-input-wrapper">
                  <input type="file" accept=".pdf" onChange={handlePdfChange} id="pdf-upload"/>
                  <label htmlFor="pdf-upload" className="btn-file">
                    <PdfIcon /> {pdfFile ? pdfFile.name : 'Choose a PDF'}
                  </label>
                </div>
                <button onClick={handlePdfTranslate} disabled={isLoading || !pdfFile}>
                  {isLoading ? <div className="loader"></div> : 'Translate from PDF'}
                </button>
                {pdfResult && (
                    <div className="output-container">
                        <h3>Extracted Text:</h3>
                        <textarea className="extracted" readOnly value={pdfResult.extracted_text} />
                        <h3>Translation:</h3>
                        <textarea readOnly value={pdfResult.translated_text} />
                    </div>
                )}
            </div>
        );
      case 'speech':
        return (
            <div className="tab-content">
                <h2>Speech-to-Text Translation</h2>
                <div className="source-language-selector">
                    <label htmlFor="source-language">Spoken Language:</label>
                    <select id="source-language" value={sourceLanguage} onChange={(e) => setSourceLanguage(e.target.value)}>
                        <option value="ml-IN">Malayalam</option>
                        <option value="en-IN">English (India)</option>
                        <option value="en-US">English (US)</option>
                        <option value="hi-IN">Hindi</option>
                        <option value="ta-IN">Tamil</option>
                        <option value="te-IN">Telugu</option>
                        <option value="kn-IN">Kannada</option>
                        <option value="es-ES">Spanish</option>
                        <option value="fr-FR">French</option>
                    </select>
                </div>
                {!isRecording ? (
                    <button onClick={handleStartRecording} disabled={isLoading}>
                        Start Recording
                    </button>
                ) : (
                    <button onClick={handleStopRecording} className="recording-btn">
                        Stop Recording
                    </button>
                )}
                {/* NEW: Display recognized text and a re-translate button */}
                {isLoading && !recognizedText && <div className="loader-inline">Recognizing...</div>}
                
                {recognizedText && (
                  <>
                    <div className="output-container">
                      <h3>Recognized Text:</h3>
                      <p className="extracted">{recognizedText}</p>
                    </div>
                    <button onClick={() => handleTextTranslate(recognizedText, targetLanguage)} disabled={isLoading}>
                      {isLoading ? <div className="loader"></div> : 'Translate Again'}
                    </button>
                  </>
                )}

                {speechTranslation && (
                    <div className="output-container">
                        <h3>Translation:</h3>
                        <p>{speechTranslation}</p>
                    </div>
                )}
            </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="App">
      <div className="translator-container">
        <header>
          <h1>LinguaBot AI</h1>
          <p>Your All-in-One Translation Assistant</p>
        </header>

        <div className="language-selector">
          <label htmlFor="language">Translate to:</label>
          <select id="language" value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)}>
            <option value="en">English</option>
            <option value="ml">Malayalam</option>
            <option value="hi">Hindi</option>
            <option value="ta">Tamil</option>
            <option value="te">Telugu</option>
            <option value="kn">Kannada</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="ja">Japanese</option>
            <option value="ru">Russian</option>
            <option value="ar">Arabic</option>
            <option value="pt">Portuguese</option>
            <option value="it">Italian</option>
            <option value="ko">Korean</option>
            <option value="zh-CN">Chinese (Simplified)</option>
          </select>
        </div>

        <div className="tabs">
            <button className={`tab-btn ${activeTab === 'text' ? 'active' : ''}`} onClick={() => setActiveTab('text')}><TextIcon /> Text</button>
            <button className={`tab-btn ${activeTab === 'image' ? 'active' : ''}`} onClick={() => setActiveTab('image')}><ImageIcon /> Image</button>
            <button className={`tab-btn ${activeTab === 'pdf' ? 'active' : ''}`} onClick={() => setActiveTab('pdf')}><PdfIcon /> PDF</button>
            <button className={`tab-btn ${activeTab === 'speech' ? 'active' : ''}`} onClick={() => setActiveTab('speech')}><SpeechIcon /> Speech</button>
        </div>
        
        <main>
            {error && <div className="error">{error}</div>}
            {renderContent()}
        </main>

      </div>
    </div>
  );
}

export default App;

