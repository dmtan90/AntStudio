# SaleStudio Orchestration Architecture

This document outlines how the various components within [SaleStudio.vue](file:///d:/Workspace/Gits/CamHub/ams/AntStudio/client/src/views/live/SaleStudio.vue) coordinate smoothly during a live stream, highlighting the roles of the Neural Showrunner, Synthetic Guest Manager, Gemini Live, and the Aidol Video Player.

## 1. Concept: The State Machine
The core mechanism driving the AI influencer's visual representation is a **State Machine** managed within [VirtualGuest.vue](file:///d:/Workspace/Gits/CamHub/ams/AntStudio/client/src/components/studio/virtual/VirtualGuest.vue) (the `aidolState` computed property). This state dictates which `aidolClip` (neural video) is currently playing on the `AidolVideoPlayer`.

**Clips Library:**
The `aidolClips` dictionary is loaded from the database (`Influencer.visual.aidolClips`) and contains base states:
- `idle`: Default resting state
- `speaking`: Talking state
- `hype`: Energetic state
- `gift_react`: Reaction to donations
- `product`: *Dynamically injected state*

## 2. Orchestration Flow

### A. Product Spotlight & Sales Script
* **Trigger:** When a product is highlighted (automatically or manually), [SaleStudio.vue](file:///d:/Workspace/Gits/CamHub/ams/AntStudio/client/src/views/live/SaleStudio.vue) detects the change via `watch(() => studioStore.highlightedProduct)`.
* **Script Generation/Retrieval:** The system looks for an existing script in the **Storyboard**. If none exists, it dynamically generates a localized fallback sales pitch (e.g., *"Các bạn ơi, nhìn xem mình đang có gì nè! Đây là [Product Name]..."*).
* **Execution:** The script is sent directly to the AI via `connection.geminiLive.sendText(script)`. This guarantees 100% adherence to the sales pitch without AI hallucination.

### B. Custom Neural Video (Product Clip Integration)
* **Injection:** Simultaneously with the script execution, the system retrieves the specific Neural Video associated with the product (`product.eventClip?.['product']`).
* **Override:** This clip is temporarily written into the influencer's state library: `activeAI.persona.visual.aidolClips['product'] = productClip`.
* **Gesture Trigger:** The manager calls [triggerGesture(..., 'product_intro')](file:///d:/Workspace/Gits/CamHub/ams/AntStudio/client/src/utils/ai/SyntheticGuestManager.ts#987-1000).
* **State Transition:** The [VirtualGuest.vue](file:///d:/Workspace/Gits/CamHub/ams/AntStudio/client/src/components/studio/virtual/VirtualGuest.vue) state machine prioritizes the `product_intro` gesture and switches `aidolState` to `'product'`. The video player crossfades smoothly to show the AI holding/using the exact product.

> **Current Limitation & Upcoming Fix:** Currently, [SyntheticGuestManager.ts](file:///d:/Workspace/Gits/CamHub/ams/AntStudio/client/src/utils/ai/SyntheticGuestManager.ts) has a hardcoded reset for gestures after **3 seconds**. This causes the custom product video to revert to the standard `speaking` video prematurely. We will update this so the state holds for the appropriate duration.

### C. Audience Interaction & Comments
* **Q&A Bridge:** Buyer comments containing a question mark (`?`) are intercepted by [handleIncomingChat](file:///d:/Workspace/Gits/CamHub/ams/AntStudio/client/src/views/live/SaleStudio.vue#663-680) and piped directly into the active Gemini Live session for real-time AI responses.
* **Intent Analyzer:** High-velocity chat or specific buying keywords trigger the `IntentAnalyzer`. This feeds into [CommerceIntelligenceEngine](file:///d:/Workspace/Gits/CamHub/ams/AntStudio/client/src/utils/ai/CommerceIntelligenceEngine.ts#12-88) and increments the `intentScore`.
* **Autonomous Flash Sales:** If intent reaches a critical threshold (`> 0.7`), `NeuralShowrunner.orchestrateCommerce()` will forcefully inject a `<product_showcase>` directive, overriding the current segment to capitalize on audience FOMO.

### D. Orders & Purchases
* **Simulated FOMO:** Currently, when a `product_showcase` is active, [SaleStudio.vue](file:///d:/Workspace/Gits/CamHub/ams/AntStudio/client/src/views/live/SaleStudio.vue) uses `setTimeout` to trigger simulated purchase notifications (*"GuestXYZ just purchased [Product]!"*) to create artificial urgency.
* **Integration Point:** To integrate real orders, the server needs to broadcast a WebSocket event (e.g., `socket.emit('economy:order')`). [SyntheticGuestManager.ts](file:///d:/Workspace/Gits/CamHub/ams/AntStudio/client/src/utils/ai/SyntheticGuestManager.ts) will listen for this event, extract the buyer's name and the product, and instruct the AI to call out the buyer's name to thank them in real-time.

## 3. Recommended Upgrades (Next Steps)
1. **Fix Product Video Duration:** Modify [triggerGesture](file:///d:/Workspace/Gits/CamHub/ams/AntStudio/client/src/utils/ai/SyntheticGuestManager.ts#987-1000) and [VirtualGuest.vue](file:///d:/Workspace/Gits/CamHub/ams/AntStudio/client/src/components/studio/virtual/VirtualGuest.vue) to allow the `'product'` state to persist dynamically (e.g., until the AI finishes the specific sales script) rather than resetting after 3 seconds.
2. **Real-time Order Integration:** Implement WebSocket listeners for actual transaction events to trigger personalized AI thank-you dialogues.
