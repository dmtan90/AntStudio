Analyze the following {{contextType}} content and extract product and brand details into a structured JSON format.
        
Content:
{{contentToAnalyze}}

Target JSON Structure:
{
    "product": {
        "name": "Product Name",
        "description": "Marketing description (with highlights)",
        "selling_price": 0,
        "currency": "USD",
        "tags": ["tag1", "tag2"],
        "site_url": "{{sourceUrl}}",
        "features": ["feature 1", "feature 2"],
        "rating": 5.0,
        "review_count": 0,
        "original_price": 0,
        "sku": "SKU-123",
        "availability": true,
        "category": "General"
    },
    "brand": {
        "brand_name": "Brand Name",
        "brand_description": "Brand story",
        "primary_colors": ["#000000"],
        "secondary_colors": ["#ffffff"],
        "tone_of_voice": "Professional"
    }
}

Rules:
- Infer missing fields reasonably based on context.
- If multiple products found, pick the main one.
- Price should be a number.
- "features" should be a list of key selling points.
- Return ONLY JSON.
