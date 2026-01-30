# AntFlow Web Live Studio Guide

The Web Live Studio allows you to broadcast directly from your browser without needing external software like OBS (though OBS is also supported via RTMP).

## 1. Setup & Destinations

1.  Click **"Go Live"** on the Dashboard.
2.  **Add Destinations**:
    -   Click **"Add Destination"** to connect accounts (YouTube, Twitch, Facebook, Custom RTMP).
    -   Toggle the switch ON for the platforms you want to stream to.

## 2. Studio configuration

### Sources
-   **Webcam**: Select your video input device.
-   **Microphone**: Select your audio input device.
-   **Screen Share**: Click "Share Screen" to show your desktop or a specific window.
-   **Media Files**: Add pre-recorded videos or images as overlay sources.

### Layouts
Choose how your sources are arranged:
-   **Full Screen**: One source takes up the whole view.
-   **Pip (Picture-in-Picture)**: Webcam in the corner over screen share.
-   **Split**: Side-by-side view.
-   **Custom**: Drag and resize sources freely on the canvas.

## 3. Going Live

1.  **Check Health**: Ensure the "Connection Good" status is visible.
2.  **Start Stream**: Click the large **"Go Live"** button.
3.  **Confirm**: A countdown (3-2-1) will start, and you will be On Air.

## 4. Interactive Features

### Unified Chat
The **Chat Panel** on the right combines messages from all connected platforms (YouTube, Twitch, etc.) into one feed.
-   **Reply**: Type in the box to send a message to all platforms.
-   **Highlight**: Click a message to display it on-stream (Overlay).

### AI Director (Beta)
-   Enable **"AI Director"** to let the system automatically switch layouts.
-   Example: If you stop speaking and show a video, it will switch to full-screen video. If you start talking, it switches back to PIP.

## 5. RTMP Ingest (Professional)

If you prefer using OBS, vMix, or Wirecast:
1.  In the Studio setup, select **"RTMP Source"**.
2.  Copy the **Server URL** and **Stream Key**.
3.  Paste these into your encoder software settings.
4.  Start streaming from your encoder. The Web Studio will receive the feed and restream it to your destinations.
