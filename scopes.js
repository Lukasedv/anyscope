/**
 * AnyScope - Video Scope Rendering Library
 * Provides professional video scopes for analyzing video/image content
 */

class VideoScopes {
    constructor() {
        this.waveformCanvas = document.getElementById('waveformCanvas');
        this.paradeCanvas = document.getElementById('paradeCanvas');
        this.vectorscopeCanvas = document.getElementById('vectorscopeCanvas');
        this.histogramCanvas = document.getElementById('histogramCanvas');
        
        this.waveformCtx = this.waveformCanvas.getContext('2d');
        this.paradeCtx = this.paradeCanvas.getContext('2d');
        this.vectorscopeCtx = this.vectorscopeCanvas.getContext('2d');
        this.histogramCtx = this.histogramCanvas.getContext('2d');
        
        // Skin tone line angle (approximately 123 degrees in vectorscope, which is around I-line)
        this.skinToneAngle = 123 * (Math.PI / 180);
    }
    
    /**
     * Analyze image data and render all scopes
     * @param {ImageData} imageData - The image data from canvas
     */
    analyze(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // Calculate all scope data
        const analysis = this.calculateScopeData(data, width, height);
        
        // Render each scope
        this.renderWaveform(analysis.luminance, width, height);
        this.renderParade(analysis.rgbColumns, width, height);
        this.renderVectorscope(analysis.colorPoints);
        this.renderHistogram(analysis.histogram);
    }
    
    /**
     * Calculate data for all scopes from image data
     */
    calculateScopeData(data, width, height) {
        const luminanceColumns = new Array(width).fill(null).map(() => []);
        const rgbColumns = {
            r: new Array(Math.floor(width / 3)).fill(null).map(() => []),
            g: new Array(Math.floor(width / 3)).fill(null).map(() => []),
            b: new Array(Math.floor(width / 3)).fill(null).map(() => [])
        };
        const colorPoints = [];
        const histogram = {
            r: new Array(256).fill(0),
            g: new Array(256).fill(0),
            b: new Array(256).fill(0),
            lum: new Array(256).fill(0)
        };
        
        // Sample rate for vectorscope (don't need every pixel)
        const vectorSampleRate = Math.max(1, Math.floor((width * height) / 50000));
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                // Calculate luminance (Rec. 709)
                const lum = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
                
                // Waveform data (luminance per column)
                luminanceColumns[x].push(lum);
                
                // Parade data (RGB values per column, in thirds)
                const paradeWidth = Math.floor(width / 3);
                const paradeX = Math.floor(x / 3);
                if (paradeX < paradeWidth) {
                    rgbColumns.r[paradeX].push(r);
                    rgbColumns.g[paradeX].push(g);
                    rgbColumns.b[paradeX].push(b);
                }
                
                // Vectorscope data (sample for performance)
                if ((y * width + x) % vectorSampleRate === 0) {
                    // Convert RGB to YCbCr for vectorscope
                    const cb = 128 + (-0.168736 * r - 0.331264 * g + 0.5 * b);
                    const cr = 128 + (0.5 * r - 0.418688 * g - 0.081312 * b);
                    colorPoints.push({ cb, cr, r, g, b });
                }
                
                // Histogram data
                histogram.r[r]++;
                histogram.g[g]++;
                histogram.b[b]++;
                histogram.lum[lum]++;
            }
        }
        
        return {
            luminance: luminanceColumns,
            rgbColumns,
            colorPoints,
            histogram
        };
    }
    
    /**
     * Render waveform scope (luminance display)
     */
    renderWaveform(luminanceColumns, srcWidth, srcHeight) {
        const canvas = this.waveformCanvas;
        const ctx = this.waveformCtx;
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        
        // Draw graticule lines
        this.drawGraticule(ctx, width, height, 'waveform');
        
        // Create intensity map for phosphor-like effect
        const intensityMap = new Uint32Array(width * height);
        
        for (let col = 0; col < luminanceColumns.length; col++) {
            const values = luminanceColumns[col];
            const x = Math.floor((col / luminanceColumns.length) * width);
            
            for (const lum of values) {
                // Map luminance (0-255) to y position (height-1 to 0)
                const y = Math.floor(height - 1 - (lum / 255) * (height - 1));
                if (y >= 0 && y < height && x >= 0 && x < width) {
                    intensityMap[y * width + x]++;
                }
            }
        }
        
        // Render intensity map
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;
        
        // Find max intensity without using spread operator (which causes stack overflow on large arrays)
        let maxIntensity = 1;
        for (let i = 0; i < intensityMap.length; i++) {
            if (intensityMap[i] > maxIntensity) {
                maxIntensity = intensityMap[i];
            }
        }
        
        for (let i = 0; i < intensityMap.length; i++) {
            if (intensityMap[i] > 0) {
                const intensity = Math.min(1, (intensityMap[i] / maxIntensity) * 8);
                const pixelIndex = i * 4;
                
                // Bright green phosphor color for better visibility
                pixels[pixelIndex] = Math.floor(intensity * 150);     // R
                pixels[pixelIndex + 1] = Math.floor(intensity * 255); // G
                pixels[pixelIndex + 2] = Math.floor(intensity * 100); // B
                pixels[pixelIndex + 3] = 255;                          // A
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // Redraw graticule on top
        this.drawGraticule(ctx, width, height, 'waveform');
    }
    
    /**
     * Render parade scope (RGB channels side by side)
     */
    renderParade(rgbColumns, srcWidth, srcHeight) {
        const canvas = this.paradeCanvas;
        const ctx = this.paradeCtx;
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        
        // Draw graticule
        this.drawGraticule(ctx, width, height, 'parade');
        
        const channelWidth = Math.floor(width / 3);
        const channels = ['r', 'g', 'b'];
        const colors = ['#ff4444', '#44ff44', '#4444ff'];
        
        for (let ch = 0; ch < 3; ch++) {
            const channelData = rgbColumns[channels[ch]];
            const offsetX = ch * channelWidth;
            
            // Create intensity map for this channel
            const intensityMap = new Uint32Array(channelWidth * height);
            
            for (let col = 0; col < channelData.length; col++) {
                const values = channelData[col];
                const x = Math.floor((col / channelData.length) * channelWidth);
                
                for (const val of values) {
                    const y = Math.floor(height - 1 - (val / 255) * (height - 1));
                    if (y >= 0 && y < height && x >= 0 && x < channelWidth) {
                        intensityMap[y * channelWidth + x]++;
                    }
                }
            }
            
            // Render this channel
            const imageData = ctx.getImageData(offsetX, 0, channelWidth, height);
            const pixels = imageData.data;
            // Find max intensity without using spread operator (which causes stack overflow on large arrays)
            let maxIntensity = 1;
            for (let j = 0; j < intensityMap.length; j++) {
                if (intensityMap[j] > maxIntensity) {
                    maxIntensity = intensityMap[j];
                }
            }
            
            for (let i = 0; i < intensityMap.length; i++) {
                if (intensityMap[i] > 0) {
                    const intensity = Math.min(1, (intensityMap[i] / maxIntensity) * 8);
                    const pixelIndex = i * 4;
                    
                    // Channel-specific colors - brighter for better visibility
                    if (ch === 0) { // Red
                        pixels[pixelIndex] = Math.floor(intensity * 255);
                        pixels[pixelIndex + 1] = Math.floor(intensity * 80);
                        pixels[pixelIndex + 2] = Math.floor(intensity * 80);
                    } else if (ch === 1) { // Green
                        pixels[pixelIndex] = Math.floor(intensity * 80);
                        pixels[pixelIndex + 1] = Math.floor(intensity * 255);
                        pixels[pixelIndex + 2] = Math.floor(intensity * 80);
                    } else { // Blue
                        pixels[pixelIndex] = Math.floor(intensity * 100);
                        pixels[pixelIndex + 1] = Math.floor(intensity * 120);
                        pixels[pixelIndex + 2] = Math.floor(intensity * 255);
                    }
                    pixels[pixelIndex + 3] = 255;
                }
            }
            
            ctx.putImageData(imageData, offsetX, 0);
        }
        
        // Redraw graticule and channel separators
        this.drawGraticule(ctx, width, height, 'parade');
    }
    
    /**
     * Render vectorscope (color wheel representation)
     */
    renderVectorscope(colorPoints) {
        const canvas = this.vectorscopeCanvas;
        const ctx = this.vectorscopeCtx;
        const size = canvas.width;
        const center = size / 2;
        const radius = (size / 2) - 20;
        
        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, size, size);
        
        // Draw vectorscope graticule (circle and color targets)
        this.drawVectorscopeGraticule(ctx, center, radius);
        
        // Create intensity map
        const intensityMap = new Uint32Array(size * size);
        
        for (const point of colorPoints) {
            // Cb and Cr are in range 0-255, center is 128
            // Map to vectorscope coordinates
            const x = center + ((point.cb - 128) / 128) * radius;
            const y = center - ((point.cr - 128) / 128) * radius; // Inverted Y
            
            const px = Math.floor(x);
            const py = Math.floor(y);
            
            // Plot a 3x3 point for better visibility
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const plotX = px + dx;
                    const plotY = py + dy;
                    if (plotX >= 0 && plotX < size && plotY >= 0 && plotY < size) {
                        intensityMap[plotY * size + plotX]++;
                    }
                }
            }
        }
        
        // Render intensity map
        const imageData = ctx.getImageData(0, 0, size, size);
        const pixels = imageData.data;
        // Find max intensity without using spread operator (which causes stack overflow on large arrays)
        let maxIntensity = 1;
        for (let i = 0; i < intensityMap.length; i++) {
            if (intensityMap[i] > maxIntensity) {
                maxIntensity = intensityMap[i];
            }
        }
        
        for (let i = 0; i < intensityMap.length; i++) {
            if (intensityMap[i] > 0) {
                const intensity = Math.min(1, (intensityMap[i] / maxIntensity) * 10);
                const pixelIndex = i * 4;
                
                // Bright cyan/green phosphor for better visibility
                pixels[pixelIndex] = Math.floor(intensity * 100);
                pixels[pixelIndex + 1] = Math.floor(intensity * 255);
                pixels[pixelIndex + 2] = Math.floor(intensity * 200);
                pixels[pixelIndex + 3] = 255;
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // Redraw graticule on top
        this.drawVectorscopeGraticule(ctx, center, radius);
    }
    
    /**
     * Render histogram (brightness distribution)
     */
    renderHistogram(histogram) {
        const canvas = this.histogramCanvas;
        const ctx = this.histogramCtx;
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        
        // Find max value for scaling
        const maxR = Math.max(...histogram.r);
        const maxG = Math.max(...histogram.g);
        const maxB = Math.max(...histogram.b);
        const maxVal = Math.max(maxR, maxG, maxB, 1);
        
        const barWidth = width / 256;
        
        // Draw each channel with transparency for overlap visualization
        ctx.globalAlpha = 0.7;
        
        // Red channel
        ctx.fillStyle = '#ff4444';
        for (let i = 0; i < 256; i++) {
            const barHeight = (histogram.r[i] / maxVal) * (height - 20);
            ctx.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
        }
        
        // Green channel
        ctx.fillStyle = '#44ff44';
        for (let i = 0; i < 256; i++) {
            const barHeight = (histogram.g[i] / maxVal) * (height - 20);
            ctx.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
        }
        
        // Blue channel
        ctx.fillStyle = '#4488ff';
        for (let i = 0; i < 256; i++) {
            const barHeight = (histogram.b[i] / maxVal) * (height - 20);
            ctx.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
        }
        
        ctx.globalAlpha = 1.0;
        
        // Draw graticule/scale markers
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        
        // Vertical lines at 0, 64, 128, 192, 255
        const markers = [0, 64, 128, 192, 255];
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#888';
        
        for (const marker of markers) {
            const x = (marker / 255) * width;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
            ctx.fillText(marker.toString(), x + 2, height - 5);
        }
    }
    
    /**
     * Draw graticule lines for waveform and parade
     */
    drawGraticule(ctx, width, height, type) {
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#888';
        
        // Horizontal lines at key IRE/percentage levels
        const levels = [0, 25, 50, 75, 100];
        
        for (const level of levels) {
            const y = height - (level / 100) * height;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
            
            // Label
            ctx.fillText(`${level}%`, 5, y - 3);
        }
        
        // For parade, draw channel separators
        if (type === 'parade') {
            ctx.strokeStyle = '#666';
            ctx.setLineDash([5, 5]);
            
            const channelWidth = width / 3;
            ctx.beginPath();
            ctx.moveTo(channelWidth, 0);
            ctx.lineTo(channelWidth, height);
            ctx.moveTo(channelWidth * 2, 0);
            ctx.lineTo(channelWidth * 2, height);
            ctx.stroke();
            
            ctx.setLineDash([]);
            
            // Channel labels - brighter colors
            ctx.fillStyle = '#ff8888';
            ctx.fillText('R', channelWidth / 2, 15);
            ctx.fillStyle = '#88ff88';
            ctx.fillText('G', channelWidth * 1.5, 15);
            ctx.fillStyle = '#8888ff';
            ctx.fillText('B', channelWidth * 2.5, 15);
        }
    }
    
    /**
     * Draw vectorscope graticule with color targets and skin tone line
     */
    drawVectorscopeGraticule(ctx, center, radius) {
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        
        // Draw outer circle
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw inner circles (25%, 50%, 75%)
        for (const scale of [0.25, 0.5, 0.75]) {
            ctx.beginPath();
            ctx.arc(center, center, radius * scale, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Draw crosshairs
        ctx.beginPath();
        ctx.moveTo(center - radius, center);
        ctx.lineTo(center + radius, center);
        ctx.moveTo(center, center - radius);
        ctx.lineTo(center, center + radius);
        ctx.stroke();
        
        // Draw color target boxes (standard vectorscope targets)
        // These represent the standard color bar positions
        const colorTargets = [
            { name: 'R', angle: -14, dist: 0.9, color: '#ff4444' },   // Red
            { name: 'Mg', angle: -59, dist: 0.9, color: '#ff44ff' },  // Magenta
            { name: 'B', angle: -104, dist: 0.9, color: '#4444ff' },  // Blue
            { name: 'Cy', angle: 166, dist: 0.9, color: '#44ffff' },  // Cyan
            { name: 'G', angle: 121, dist: 0.9, color: '#44ff44' },   // Green
            { name: 'Yl', angle: 76, dist: 0.9, color: '#ffff44' }    // Yellow
        ];
        
        ctx.font = '11px sans-serif';
        
        for (const target of colorTargets) {
            const angleRad = target.angle * (Math.PI / 180);
            const x = center + Math.cos(angleRad) * radius * target.dist;
            const y = center - Math.sin(angleRad) * radius * target.dist;
            
            // Draw small target box
            ctx.strokeStyle = target.color;
            ctx.lineWidth = 2;
            ctx.strokeRect(x - 6, y - 6, 12, 12);
            
            // Label
            ctx.fillStyle = target.color;
            ctx.fillText(target.name, x + 10, y + 4);
        }
        
        // Draw skin tone line (I-line, approximately 123 degrees)
        // This is the crucial line for checking skin tones
        ctx.strokeStyle = '#ffaa44';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.lineTo(
            center + Math.cos(this.skinToneAngle) * radius,
            center - Math.sin(this.skinToneAngle) * radius
        );
        ctx.stroke();
        
        // Label for skin tone line
        ctx.setLineDash([]);
        ctx.fillStyle = '#ffaa44';
        ctx.font = '12px sans-serif';
        const labelX = center + Math.cos(this.skinToneAngle) * (radius + 5);
        const labelY = center - Math.sin(this.skinToneAngle) * (radius + 5);
        ctx.fillText('Skin', labelX - 15, labelY - 5);
        
        ctx.lineWidth = 1;
    }
    
    /**
     * Clear all scopes
     */
    clearAll() {
        const canvases = [
            { canvas: this.waveformCanvas, ctx: this.waveformCtx },
            { canvas: this.paradeCanvas, ctx: this.paradeCtx },
            { canvas: this.vectorscopeCanvas, ctx: this.vectorscopeCtx },
            { canvas: this.histogramCanvas, ctx: this.histogramCtx }
        ];
        
        for (const { canvas, ctx } of canvases) {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
}

// Export for use in app.js
window.VideoScopes = VideoScopes;
