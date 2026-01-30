# AntFlow Services Architecture

The backend follows a service-oriented approach, where complex business logic is encapsulated in dedicated "Service" classes.

## 1. Video Assembly Service (`videoAssemblyService.ts`)
Responsible for orchestrating FFmpeg commands to generate final videos from project segments.
-   **Concatenation**: Merges multiple video clips into a single file.
-   **Transitions**: Implements fade, slide, and zoom transitions between clips.
-   **Overlays**: Handles text and image overlays (burn-in).
-   **Audio Mixing**: Merges background music with clip audio.

## 2. Real-time Synchronization
Powered by **Socket.IO** (`SocketServer.ts` and `CollaborationService.ts`).
-   **Cursor Sync**: Broadcasts user mouse/playhead positions to other organization members.
-   **Live Updates**: When a user modifies a segment, the change is emitted to all active editors to ensure UI consistency.
-   **Presence**: Tracks online users per project.

## 3. AI Integration Layer
Located in `src/services/ai/`.
-   **Script Analysis**: Uses OpenAI (GPT-4) to analyze user prompts and generate storyboards.
-   **Voice Generation**: Integrates with ElevenLabs for high-quality text-to-speech and voice cloning.
-   **Auto-Captioning**: Uses Whisper (via OpenAI) to generate subtitles from audio tracks.

## 4. Storage & Asset Management
Managed via an abstraction layer (`StorageFactory.ts`).
-   **S3 Adapter**: The primary production storage for raw media and exported videos.
-   **Local/Dev Adapter**: Allow development without cloud dependencies.
-   **Lifecycle**: Automatic cleanup of temporary files (`tmp/`) after processing.

## 5. Streaming & Ant Media Integration
-   **Signaling**: Handles WebRTC signaling for the Mobile Studio.
-   **Stream Orchestration**: Communicates with Ant Media Server APIs to create apps, manage broadcast keys, and monitor health.
-   **Multi-streaming**: Pipes the primary feed into multiple platform destinations (RTMP).

---

## Service Communication Pattern

Routes should generally not contain complex logic. They should follow this flow:
1.  **Route** receives request.
2.  **Middleware** validates user and permissions.
3.  **Service** is called to perform the heavy lifting.
4.  **Route** returns the service result.

```typescript
// Example Pattern
router.post('/:id/assemble', async (req, res) => {
    const project = await Project.findById(req.params.id);
    const result = await videoAssemblyService.assemble(project);
    res.json({ success: true, data: result });
});
```
