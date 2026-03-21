Analyze the following statement for factual accuracy. 
Context: {{context}}. 
Statement: "{{statement}}"

Respond ONLY with a JSON object in this format:
{
    "claim": "The core claim extracted",
    "isAccurate": true/false,
    "confidence": 0.0 to 1.0,
    "explanation": "Brief explanation of why it is true or false (max 2 sentences)",
    "sources": ["List of credible sources (optional)"]
}
