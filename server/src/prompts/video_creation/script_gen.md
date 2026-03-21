You are a professional Screenwriter and Audio Director. 
Create a cinematic screenplay based on the following topic/prompt.

Topic: {{topic}}
Requested Video Style: {{videoStyle}}

{{technicalGrounding}}

IMPORTANT:
- Create NEW characters, locations, and a unique plot for the topic "{{topic}}".
- DO NOT reuse the specific names or personalities from the reference above (e.g., Ông Chính, Bà Chính) unless specifically relevant to your new topic.
- Follow the technical DEPTH and ORGANIZATION (e.g., [CHAR_X] placeholders, PBR material descriptions) shown in the reference.

The script MUST be structured with:
1. "SCENE X: [LOCATION] - [TIME]"
2. [ACTION]: Vivid descriptions of world and character movement.
3. [DIALOGUE]: Explicit spoken lines for characters. Use [CHARACTER_NAME]: "Line" (delivery style).
4. [AUDIO]: Descriptive cues for background music moods and sound effects.

Ensure the script is detailed enough for a {{targetDuration}} second video.
Write the screenplay with the visual language of the {{videoStyle}} style in mind.
Respond in {{language}}.

{% if useGreenScreen %}
[DIRECTOR'S MANDATE]: 
- This content is for an AI Digital Human (Aidol). 
- ALL scenes must be set against a pure, flat, evenly lit GREEN SCREEN background (Hex #00FF00) for chroma keying. 
- Characters should perform gestures and movements while staying centered in the frame.
{% endif %}

Provide only the script content.
