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
        this.videoContainer = document.getElementById('videoContainer');
        
        // Selection canvas for zone selection
        this.selectionCanvas = document.getElementById('selectionCanvas');
        this.selectionCtx = this.selectionCanvas.getContext('2d');
        
        this.startButton = document.getElementById('startCapture');
        this.stopButton = document.getElementById('stopCapture');
        this.resetZoneButton = document.getElementById('resetZone');
        
        this.scopes = new VideoScopes();
        this.mediaStream = null;
        this.animationFrameId = null;
        this.isCapturing = false;
        
        // Zone selection state
        this.selectedZone = null; // { x, y, width, height } in normalized coordinates (0-1)
        this.isSelecting = false;
        this.selectionStart = null;
        
        // Scope visibility toggles
        this.scopeContainers = {
            waveform: document.getElementById('waveformContainer'),
            parade: document.getElementById('paradeContainer'),
            vectorscope: document.getElementById('vectorscopeContainer'),
            histogram: document.getElementById('histogramContainer')
        };
        
        this.initEventListeners();
        this.initScopeToggles();
        this.initZoneSelection();
    }
    
    /**
     * Initialize event listeners
     */
    initEventListeners() {
        this.startButton.addEventListener('click', () => this.startCapture());
        this.stopButton.addEventListener('click', () => this.stopCapture());
        this.resetZoneButton.addEventListener('click', () => this.resetZone());
        
        // Handle video metadata loaded
        this.video.addEventListener('loadedmetadata', () => {
            this.captureCanvas.width = this.video.videoWidth;
            this.captureCanvas.height = this.video.videoHeight;
            this.updateSelectionCanvasSize();
        });
        
        // Handle stream ended (user closed share dialog or stopped sharing)
        this.video.addEventListener('ended', () => this.stopCapture());
        
        // Handle window resize
        window.addEventListener('resize', () => {
            if (this.isCapturing) {
                this.updateSelectionCanvasSize();
                this.drawSelectionOverlay();
            }
        });
    }
    
    /**
     * Initialize zone selection functionality
     */
    initZoneSelection() {
        this.selectionCanvas.addEventListener('mousedown', (e) => this.onSelectionStart(e));
        this.selectionCanvas.addEventListener('mousemove', (e) => this.onSelectionMove(e));
        this.selectionCanvas.addEventListener('mouseup', (e) => this.onSelectionEnd(e));
        this.selectionCanvas.addEventListener('mouseleave', (e) => this.onSelectionEnd(e));
        
        // Touch support
        this.selectionCanvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.onSelectionStart(touch);
        });
        this.selectionCanvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.onSelectionMove(touch);
        });
        this.selectionCanvas.addEventListener('touchend', (e) => this.onSelectionEnd(e));
    }
    
    /**
     * Update selection canvas size to match video display size
     */
    updateSelectionCanvasSize() {
        const rect = this.video.getBoundingClientRect();
        this.selectionCanvas.width = rect.width;
        this.selectionCanvas.height = rect.height;
    }
    
    /**
     * Get mouse/touch position relative to the video content
     */
    getRelativePosition(e) {
        const rect = this.selectionCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
    }
    
    /**
     * Handle selection start
     */
    onSelectionStart(e) {
        if (!this.isCapturing) return;
        
        this.isSelecting = true;
        this.selectionStart = this.getRelativePosition(e);
        this.selectedZone = null;
        this.resetZoneButton.disabled = true;
    }
    
    /**
     * Handle selection move
     */
    onSelectionMove(e) {
        if (!this.isSelecting || !this.selectionStart) return;
        
        const current = this.getRelativePosition(e);
        
        // Calculate selection rectangle
        const x = Math.min(this.selectionStart.x, current.x);
        const y = Math.min(this.selectionStart.y, current.y);
        const width = Math.abs(current.x - this.selectionStart.x);
        const height = Math.abs(current.y - this.selectionStart.y);
        
        this.selectedZone = { x, y, width, height };
        this.drawSelectionOverlay();
    }
    
    /**
     * Handle selection end
     */
    onSelectionEnd(e) {
        if (!this.isSelecting) return;
        
        this.isSelecting = false;
        
        // If the selection is too small, reset it
        if (this.selectedZone && (this.selectedZone.width < 0.02 || this.selectedZone.height < 0.02)) {
            this.selectedZone = null;
        }
        
        this.resetZoneButton.disabled = this.selectedZone === null;
        this.drawSelectionOverlay();
    }
    
    /**
     * Reset zone selection
     */
    resetZone() {
        this.selectedZone = null;
        this.resetZoneButton.disabled = true;
        this.drawSelectionOverlay();
    }
    
    /**
     * Draw selection overlay on the video
     */
    drawSelectionOverlay() {
        const ctx = this.selectionCtx;
        const width = this.selectionCanvas.width;
        const height = this.selectionCanvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        if (!this.selectedZone) return;
        
        // Draw darkened overlay outside selection
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, width, height);
        
        // Calculate selection rectangle in canvas coordinates
        const selX = this.selectedZone.x * width;
        const selY = this.selectedZone.y * height;
        const selW = this.selectedZone.width * width;
        const selH = this.selectedZone.height * height;
        
        // Clear the selected area
        ctx.clearRect(selX, selY, selW, selH);
        
        // Draw selection border
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(selX, selY, selW, selH);
        
        // Draw corner handles
        ctx.setLineDash([]);
        ctx.fillStyle = '#00d4ff';
        const handleSize = 8;
        
        // Top-left
        ctx.fillRect(selX - handleSize/2, selY - handleSize/2, handleSize, handleSize);
        // Top-right
        ctx.fillRect(selX + selW - handleSize/2, selY - handleSize/2, handleSize, handleSize);
        // Bottom-left
        ctx.fillRect(selX - handleSize/2, selY + selH - handleSize/2, handleSize, handleSize);
        // Bottom-right
        ctx.fillRect(selX + selW - handleSize/2, selY + selH - handleSize/2, handleSize, handleSize);
        
        // Draw zone label
        ctx.fillStyle = '#00d4ff';
        ctx.font = '12px sans-serif';
        const label = `Zone: ${Math.round(this.selectedZone.width * 100)}% × ${Math.round(this.selectedZone.height * 100)}%`;
        ctx.fillText(label, selX + 5, selY - 5);
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
            
            // Update selection canvas size
            this.updateSelectionCanvasSize();
            
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
        
        // Reset zone selection
        this.selectedZone = null;
        this.resetZoneButton.disabled = true;
        this.selectionCtx.clearRect(0, 0, this.selectionCanvas.width, this.selectionCanvas.height);
        
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
                // Get source dimensions
                const srcWidth = this.video.videoWidth;
                const srcHeight = this.video.videoHeight;
                
                // Calculate zone to analyze
                let zoneX = 0;
                let zoneY = 0;
                let zoneW = srcWidth;
                let zoneH = srcHeight;
                
                if (this.selectedZone) {
                    zoneX = Math.floor(this.selectedZone.x * srcWidth);
                    zoneY = Math.floor(this.selectedZone.y * srcHeight);
                    zoneW = Math.floor(this.selectedZone.width * srcWidth);
                    zoneH = Math.floor(this.selectedZone.height * srcHeight);
                    
                    // Ensure minimum size
                    zoneW = Math.max(zoneW, 10);
                    zoneH = Math.max(zoneH, 10);
                }
                
                // Scale down for performance (analyze at lower resolution)
                const maxAnalysisWidth = 320;
                const scale = Math.min(1, maxAnalysisWidth / zoneW);
                const analysisWidth = Math.floor(zoneW * scale);
                const analysisHeight = Math.floor(zoneH * scale);
                
                this.captureCanvas.width = analysisWidth;
                this.captureCanvas.height = analysisHeight;
                
                // Draw only the selected zone (or full frame if no zone selected)
                this.captureCtx.drawImage(
                    this.video,
                    zoneX, zoneY, zoneW, zoneH,    // Source rectangle
                    0, 0, analysisWidth, analysisHeight // Destination rectangle
                );
                
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
