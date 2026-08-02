# Devpost Submission Form Guide - AntStudio
*Use this guide to fill in the exact fields on your Devpost project submission page.*

---

## 1. PROJECT DETAILS

### Project Name
`AntStudio - AI Studio powered by Google Agent`

### Project Tagline
`Transforming static e-commerce into 24/7 autonomous live commerce with context-aware virtual influencers, directed by the Google Cloud Agent Development Kit (ADK).`

---

## 2. DESCRIPTION

### Problem to Solve
```text
Live stream shopping is a $500B+ global phenomenon, yet hosting successful sales streams remains incredibly expensive. Brands must hire professional human hosts, video directors, and production crews, making 24/7 operations financially unviable. Furthermore, manually managing real-time inventory updates, pricing overlays, and chat moderation while staying in character during a live broadcast creates an overwhelming cognitive load for creators. Smaller merchants are locked out of this high-conversion channel due to the cost and complexity of running professional live productions.
```

### Our Solution
```text
AntStudio is an autonomous, 24/7 B2B Live Commerce SaaS platform that automates the entire broadcasting pipeline. Powered by the Google Cloud Agent Development Kit (ADK), AntStudio introduces an "Autonomous AI Live Director & Co-Host Agent."

Key Features:
1. Context-Aware AI Director: Synchronizes active workspace states (Online store inventory, dynamic overlays, host personas, and live audience chat logs) dynamically at each turn.
2. Custom High-Performance Canvas: An HTML5 2D rendering pipeline that dynamically draws real-time interactive overlays, brand logos, scrolling tickers, and subtitles.
3. Declarative Intent: Merchants simply type instructions (e.g., "Start a flash sale on the active product") and the agent automatically coordinates the stream—adjusting the layout, rendering a dynamic transaction QR code, and drafting live scripts for the virtual host on the fly.
4. Synthetic photorealistic co-hosts (AIDol) that speak, emote, and pitch products synchronously.
```

### Technologies Used
```text
Google Cloud Agent Development Kit (ADK), Gemini 1.5 Pro & 2.0 Flash (via Vertex AI APIs), Model Context Protocol (MCP) design patterns, Vue 3, Vite, HTML5 Canvas Rendering Engine, WebRTC Video Streaming & Websocket Relay Ingestion, Node.js, Express, TypeScript, TailwindCSS.
```

### Data Sources
```text
1. Merchant Inventory API: Real-time product pricing, stock status, and product landing/inventory checkout URLs.
2. Stream Telemetry Queue: Real-time livestream performance logs, viewer counts, and live audience chat message event queues.
3. Influencer Character Database: Persona configurations, voice presets, and system prompt constraints for the virtual AI host.
```

### Findings and Learnings
```text
1. The Power of Model Context Protocol (MCP): Building our tool-calling architecture around MCP principles proved highly successful. It allowed the agent to securely bind backend controllers (e.g. toggling flash sales or changing layout structures) to natural language instructions seamlessly.
2. Managing Async Assets in High-Frequency Canvas Loops: High-performance rendering loops require synchronous access to assets. We learned that fetching async assets, such as generating custom QR codes on the fly, requires reactive state bridges (such as Vue watches and image-load caching) to prevent canvas frame drops and type collisions.
3. Gemini's massive context window enables extremely cohesive multi-turn reasoning, allowing the AI host to remember user interactions across long stream sessions and keep product pitches natural.
```

### Third-party Integrations (if applicable)
```text
- WebRTC Media Gateway APIs for low-latency stream broadcasting.
- Dynamic QR Code Server API for real-time transactional checkout codes.
- Google Fonts (Inter, Outfit) for typography overlays on the live stream canvas.
(We confirm we have full rights and authorization to use all listed libraries and APIs).
```

---

## 3. SUBMISSION QUESTIONS
*(Only visible to hackathon organizers & judges)*

### On a scale from 1-5, how familiar are you with Google Cloud products? (1=none, 5=expert)
`4` *(Or select `5` if you have advanced cloud engineering experience)*

### On a scale from 1-5, how familiar are you with Google AI Studio? (1=none, 5=expert)
`4` *(Or select `5` based on your familiarity)*

### Describe the readiness of your project for launch.
```text
Our project is at an advanced, high production-readiness stage. Rather than presenting a simple sandbox mockup, we built a fully compiled, type-safe TypeScript application (0 errors under rigid Vue-TSC type-checking). The frontend client includes fully functional canvas overlay modules, reactive context-aware composables, and integrated WebRTC encoders. The backend is powered by a robust Express agent server with actual Model Context Protocol tool definitions that successfully manipulate livestream data and communicate dynamically with Vertex AI. It is ready for staging deployment and scaling.
```

### Which specific feature of Agent Platform was most critical to your project's impact, and what is one thing it's currently missing?
```text
Most Critical Feature: The Google Cloud Agent Development Kit (ADK) tool-calling mechanism. It allowed us to move from static dashboard triggers to a "declarative intent" model, where the agent autonomously executes state mutations (e.g. triggering flash sales, generating QR codes, modifying graphic overlays) based purely on conversational chat context.

One Thing Missing: Native support for stateful, persistent event streams pushed directly from the agent to the client interface. Implementing real-time dashboard UI updates currently requires client-side polling or intercepting HTTP response payloads. A native push/streaming notification layer in the SDK would streamline real-time UI synchronization significantly.
```

### If you could add one specific API capability or integration that would have saved you 2+ hours of work, what would it be?
```text
A pre-packaged Google ADK Client SDK with native Vue/React hooks or composables for state synchronization out-of-the-box. We spent significant time building custom context-tracking composables (such as client-side context aggregation and state payload structure synchronization). An official, lightweight client-side SDK that handles reactive state syncing with the ADK backend would have saved hours of boilerplate code.
```

---

## 4. PROJECT ASSETS

### Architecture Diagram Asset
Please open or copy this generated diagram from your project folder to view and upload it directly to the **Architecture diagram\*** slot on Devpost:

👉 **[architecture_diagram.png](./architecture_diagram.png)** *(Click to open in your IDE)*

