
# 🌀 The Pawli Mandelbrot Explorer

An immersive, high-performance Mandelbrot set explorer built with React, HTML5 Canvas, and Google Gemini AI.

## ✨ Features

- **Infinite Zoom**: High-precision fractal rendering with click-to-zoom and click-and-drag panning.
- **Continuous Dive**: Auto-zoom mode for a hypnotic, cinematic journey into complexity.
- **AI Insight**: Uses Google Gemini 2.0 Flash to analyze your current coordinates and provide poetic, mathematical descriptions of the landscape.
- **Gamified Exploration**:
  - **Daily Quests**: Unique coordinates to find every day.
  - **Achievements**: Unlock trophies as you reach deeper zoom levels and find rare patterns.
  - **Points System**: Earn points for discovering landmarks and using AI analysis.
- **Custom Palettes**: Multiple color schemes including "Inferno", "Digital Rain", and "Vaporwave Sunset".
- **Snapshot Export**: Save your discoveries as high-quality PNG images.

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/pawli-mandelbrot-explorer.git
   cd pawli-mandelbrot-explorer
   ```

2. **Environment Setup**
   The app requires a Google Gemini API Key. Ensure it is available in your environment as `process.env.API_KEY`.

3. **Run the App**
   This project uses a modern "no-build" setup with ES Modules. You can serve it using any local static server:
   ```bash
   npx serve .
   ```

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **AI Engine**: [Google Gemini API (@google/genai)](https://ai.google.dev/)
- **Rendering**: Vanilla HTML5 Canvas (JavaScript-based iteration)

## 📜 License

MIT
