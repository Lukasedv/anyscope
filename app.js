/**
 * AnyScope - Main Application
 * Desktop scope viewing application using Screen Capture API
 */

class AnyScope {
    constructor() {
        this.video = document.getElementById('sourceVideo');
        this.captureCanvas = document.getElementById('captureCanvas');
        this.captureCtx = this.captureCanvas.getContext('2d');
        this.placeholder = document.getElementById('videoPlaceholder');
        
        this.startButton = document.getElementById('startCapture');
        this.stopButton = document.getElementById('stopCapture');
        
        this.scopes = new VideoScopes();
        this.mediaStream = null;
        this.animationFrameId = null;
        this.isCapturing = false;
        
        // Scope visibility toggles
        this.scopeContainers = {
            waveform: document.getElementById('waveformContainer'),
            parade: document.getElementById('paradeContainer'),
            vectorscope: document.getElementById('vectorscopeContainer'),
            histogram: document.getElementById('histogramContainer')
        };
        
        this.initEventListeners();
        this.initScopeToggles();
    }
    
    /**
     * Initialize event listeners
     */
    initEventListeners() {
        this.startButton.addEventListener('click', () => this.startCapture());
        this.stopButton.addEventListener('click', () => this.stopCapture());
        
        // Handle video metadata loaded
        this.video.addEventListener('loadedmetadata', () => {
            this.captureCanvas.width = this.video.videoWidth;
            this.captureCanvas.height = this.video.videoHeight;
        });
        
        // Handle stream ended (user closed share dialog or stopped sharing)
        this.video.addEventListener('ended', () => this.stopCapture());
    }
    
    /**
     * Initialize scope visibility toggles
     */
    initScopeToggles() {
        const toggles = {
            showWaveform: 'waveform',
            showParade: 'parade',
            showVectorscope: 'vectorscope',
            showHistogram: 'histogram'
        };
        
        for (const [checkboxId, scopeKey] of Object.entries(toggles)) {
            const checkbox = document.getElementById(checkboxId);
            checkbox.addEventListener('change', (e) => {
                this.scopeContainers[scopeKey].classList.toggle('hidden', !e.target.checked);
            });
        }
    }
    
    /**
     * Start screen capture
     */
    async startCapture() {
        try {
            // Request screen capture with options
            const displayMediaOptions = {
                video: {
                    cursor: 'always',
                    displaySurface: 'monitor' // Hint to prefer full screen options
                },
                audio: false
            };
            
            this.mediaStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
            
            // Set up video element
            this.video.srcObject = this.mediaStream;
            
            // Handle when the user stops sharing via browser UI
            this.mediaStream.getVideoTracks()[0].addEventListener('ended', () => {
                this.stopCapture();
            });
            
            // Wait for video to be ready
            await new Promise((resolve) => {
                this.video.onloadeddata = resolve;
            });
            
            // Update UI
            this.placeholder.classList.add('hidden');
            this.startButton.disabled = true;
            this.stopButton.disabled = false;
            this.isCapturing = true;
            
            // Start the analysis loop
            this.startAnalysisLoop();
            
        } catch (error) {
            console.error('Error starting screen capture:', error);
            if (error.name === 'NotAllowedError') {
                alert('Screen capture permission was denied. Please allow screen sharing to use this application.');
            } else {
                alert('Error starting screen capture: ' + error.message);
            }
        }
    }
    
    /**
     * Stop screen capture
     */
    stopCapture() {
        // Stop analysis loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Stop media stream
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        
        // Clear video
        this.video.srcObject = null;
        
        // Update UI
        this.placeholder.classList.remove('hidden');
        this.startButton.disabled = false;
        this.stopButton.disabled = true;
        this.isCapturing = false;
        
        // Clear scopes
        this.scopes.clearAll();
    }
    
    /**
     * Start the continuous analysis loop
     */
    startAnalysisLoop() {
        const analyzeFrame = () => {
            if (!this.isCapturing) return;
            
            // Capture current frame
            if (this.video.readyState >= this.video.HAVE_CURRENT_DATA) {
                // Scale down for performance (analyze at lower resolution)
                const maxAnalysisWidth = 320;
                const scale = Math.min(1, maxAnalysisWidth / this.video.videoWidth);
                const analysisWidth = Math.floor(this.video.videoWidth * scale);
                const analysisHeight = Math.floor(this.video.videoHeight * scale);
                
                this.captureCanvas.width = analysisWidth;
                this.captureCanvas.height = analysisHeight;
                
                // Draw video frame to canvas
                this.captureCtx.drawImage(this.video, 0, 0, analysisWidth, analysisHeight);
                
                // Get image data
                const imageData = this.captureCtx.getImageData(0, 0, analysisWidth, analysisHeight);
                
                // Analyze and render scopes
                this.scopes.analyze(imageData);
            }
            
            // Schedule next frame (throttle to ~15 fps for better performance)
            this.animationFrameId = setTimeout(() => {
                requestAnimationFrame(analyzeFrame);
            }, 66); // ~15 fps
        };
        
        analyzeFrame();
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check for Screen Capture API support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #1a1a2e; color: #e0e0e0; text-align: center; padding: 20px;">
                <div>
                    <h1 style="color: #ff6b6b;">Browser Not Supported</h1>
                    <p style="margin-top: 20px;">Your browser does not support the Screen Capture API.</p>
                    <p style="margin-top: 10px;">Please use a modern browser like Chrome, Firefox, or Edge.</p>
                </div>
            </div>
        `;
        return;
    }
    
    window.anyScope = new AnyScope();
});
