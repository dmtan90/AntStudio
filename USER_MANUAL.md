# AntStudio - User Manual

Welcome to **AntStudio**! This manual provides step-by-step instructions on how to use all features of the AntStudio platform.

---

## 🌟 Introduction

AntStudio is an AI-powered video creation and 24/7 live commerce platform. It transforms text prompts, product links, camera streams, and digital avatars into professional video campaigns and non-stop live streams.

---

## 🚀 Getting Started & Navigation

### 1. Navigating the Workspace
- **Top Navigation Bar (`AppNavbar.vue`)**:
  - Quickly switch between **Features**, **Workflows**, **Live Commerce**, **Pricing**, and **Documentation**.
  - **Language Selector**: Switch between English (`en`), Vietnamese (`vi`), Spanish (`es`), Japanese (`ja`), and Chinese (`zh`).
  - **Go to Workspace**: Access your project dashboard directly via `/projects`.

---

## 🛠️ The 6 Specialized Creation Workflows

When you click **"New Project"** in your workspace or click any workflow card on the Landing Page, the `ProjectCreationDialog` opens with 6 specialized AI workflows:

### 1. ⚡ Script-to-Video AI Engine (`ai-video`)
- **Use Case**: Turn text scripts, blog posts, or topic prompts into complete video clips with AI narration.
- **How to Use**:
  1. Click **Script-to-Video**.
  2. Paste your text script or enter a topic prompt (e.g. *"Benefits of Smart Home Cameras"*).
  3. Choose visual aspect ratio (16:9 Landscape or 9:16 Vertical Shorts/Reels).
  4. Click **Generate**. The AI Director generates storyboards, stock footage/AI imagery, background music, and animated subtitles automatically.

### 2. 🎭 AI Digital Avatars & Personas (`avatar`)
- **Use Case**: Produce talking avatar video clips featuring 2D photo avatars or 3D VRM digital models.
- **How to Use**:
  1. Select **AI Digital Avatars**.
  2. Choose an existing avatar persona (e.g. *Phương*) or upload a custom 2D photo / 3D VRM model.
  3. Select voice synthesis language and tone.
  4. Type your speech script. The AI synthesizes speech with precise lip-sync animations.

### 3. 🛍️ E-Commerce Product Ads Wizard (`product-ads`)
- **Use Case**: Automatically generate promotional product ads from any e-commerce URL.
- **How to Use**:
  1. Click **Product Ads Wizard**.
  2. Paste a product URL (e.g., Shopify, Amazon, Shopee link) or enter product specifications.
  3. Select template style (Explainer, Flash Sale, Testimonial).
  4. Click **Convert URL to Ad**. The wizard extracts product images, features, price tags, and composes a ready-to-publish video ad.

### 4. 📡 24/7 Autonomous Sale Studio (`sales-studio`)
- **Use Case**: Run non-stop autonomous live commerce streams on YouTube, TikTok, and Facebook Live.
- **How to Use**:
  1. Click **24/7 Sale Studio** to navigate to `/live/sales`.
  2. Select your AI Host persona and select products from your store catalog.
  3. Click **Go Live**.
  4. **Autonomous Features**:
     - The AI Host cycles through `GREETING`, `PITCHING`, `Q_AND_A`, and `CLOSING` pitch loops automatically.
     - Scannable checkout **QR Codes** and **Flash Sale Countdown Banners** display automatically.
     - Viewer chat comments are answered in real-time by the AI Host.
     - If network disconnects occur, the **Auto-Reconnect Banner** alerts you while trying to resume.

### 5. 📹 Screen & Camera Recorder Studio (`record`)
- **Use Case**: Record webcam, screen share presentations, and studio microphone audio with multi-track support.
- **How to Use**:
  1. Select **Screen & Camera Recorder** (`/recorder`).
  2. Grant browser permissions for webcam, microphone, and screen capture.
  3. Select input layouts (Picture-in-Picture, Side-by-Side, Fullscreen).
  4. Click **Record**. Save directly to your workspace or send to the timeline editor.

### 6. 🎞️ Multi-Track Canvas & Timeline Studio (`blank`)
- **Use Case**: Full-featured non-linear video editing.
- **How to Use**:
  1. Click **Timeline Studio**.
  2. Drag and drop video, audio, image, and subtitle tracks onto the multi-track timeline.
  3. Use trim, split, transition, filter, and overlay tools.
  4. Click **Export** to render on your device.

---

## 🌐 Language & Localization Settings

To switch application language:
1. Locate the language dropdown on the top navbar.
2. Select your preferred locale:
   - 🇬🇧 English
   - 🇻🇳 Tiếng Việt
   - 🇪🇸 Español
   - 🇯🇵 日本語
   - 🇨🇳 中文
3. The interface, dialogs, banners, and tooltips instantly adapt to your selected language.

---

## ❓ Troubleshooting & Support

- **Server Connection Lost Banner**: If the Sale Studio displays `SERVER CONNECTION LOST! AUTO-RECONNECTING...`, the client is attempting to reconnect to the server's WebSocket gateway (`/socket.io`). Ensure your server is running on port `4000`.
- **Health Check Status**: Verify server health at `http://localhost:4000/api/health` or `http://localhost:4000/health`.

For further technical support, contact: [dmtan90@gmail.com](mailto:dmtan90@gmail.com).
