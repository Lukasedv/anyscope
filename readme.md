# AnyScope

Professional video scopes for analyzing any part of your desktop. View Waveform, Parade, Vectorscope, and Histogram displays in real-time.

![AnyScope](https://img.shields.io/badge/Status-Active-green)
![License](https://img.shields.io/badge/License-MIT-blue)

## Features

- **Waveform Scope** - Displays luminance/exposure levels across the image horizontally
- **Parade Scope** - Shows RGB channel levels separately for detailed color analysis
- **Vectorscope** - Displays hue and saturation on a color wheel with a skin tone target line
- **Histogram** - Shows pixel brightness distribution for all color channels

## Getting Started

### Quick Start (No Installation Required)

1. Open `index.html` in a modern web browser (Chrome, Firefox, or Edge recommended)
2. Click "Start Screen Capture"
3. Select what you want to analyze:
   - **Entire Screen** - Analyze your whole desktop
   - **Window** - Target a specific application window
   - **Browser Tab** - Analyze a specific browser tab
4. View the real-time scope analysis

### Running with a Local Server (Recommended)

For the best experience, run a local HTTP server:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (requires http-server)
npx http-server

# Using PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

## Scopes Explained

### Waveform
The waveform monitor displays luminance (brightness) values from left to right across the image. The vertical axis represents brightness levels from 0% (black) at the bottom to 100% (white) at the top.

**Use it for:**
- Checking exposure levels
- Ensuring highlights aren't clipped
- Verifying black levels

### Parade
The parade scope shows the same information as the waveform but separates the Red, Green, and Blue channels. This helps identify color casts and balance issues.

**Use it for:**
- Checking white balance
- Identifying color casts
- Balancing RGB levels

### Vectorscope
The vectorscope displays color information on a circular graph. Saturation is represented by distance from center, and hue is represented by angle around the circle.

**Key features:**
- Color target boxes for standard colors (R, Mg, B, Cy, G, Yl)
- **Skin tone line** (orange dashed) - Human skin tones of all ethnicities should fall along this line

**Use it for:**
- Checking skin tones
- Evaluating color saturation
- Color grading and matching

### Histogram
The histogram shows the distribution of brightness values for each color channel. The horizontal axis represents brightness (0-255), and the height shows how many pixels have that brightness value.

**Use it for:**
- Checking overall exposure
- Identifying clipped highlights or shadows
- Evaluating image contrast

## Browser Support

AnyScope uses the Screen Capture API and works in:
- Chrome 72+
- Firefox 66+
- Edge 79+
- Opera 60+

**Note:** Safari does not currently support the Screen Capture API.

## Privacy & Security

- All processing happens locally in your browser
- No data is sent to any server
- No images or video are stored

## Development

This is a pure HTML/CSS/JavaScript application with no dependencies or build steps required.

### Project Structure

```
anyscope/
├── index.html     # Main HTML page
├── styles.css     # Styling
├── scopes.js      # Video scope rendering library
├── app.js         # Main application logic
└── readme.md      # This file
```

## License

MIT License - Feel free to use, modify, and distribute.

## Contributing

Contributions are welcome! Feel free to submit issues and pull requests.
