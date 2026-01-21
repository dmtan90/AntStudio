# AntFlow Branding Assets

This directory contains the official branding assets for AntFlow by AntMedia.

## Logo Files

### 1. logo.png
**Full horizontal logo** with "AntFlow by AntMedia" branding
- **Usage**: Website header, email signatures, presentations
- **Format**: PNG with transparency
- **Colors**: Purple gradient (#6366f1 → #8b5cf6) with orange accents (#ff6b35)
- **Dimensions**: Optimized for web use

### 2. icon.png
**App icon** with rounded square format
- **Usage**: Mobile/desktop app icon, social media avatar
- **Format**: PNG with transparency
- **Style**: Rounded square (iOS/Android style)
- **Features**: "AM" badge for AntMedia branding
- **Dimensions**: 1024x1024 (suitable for app stores)

### 3. favicon.ico
**Favicon** for browser tabs
- **Usage**: Browser tab icon, bookmarks
- **Format**: ICO (converted from icon.png)
- **Dimensions**: Multiple sizes for different displays

### 4. splash.png
**Splash screen** for app loading
- **Usage**: Application launch screen
- **Format**: PNG
- **Content**: Centered logo with "AntFlow by AntMedia" and tagline
- **Aspect Ratio**: 16:9

## Brand Colors

### Primary Colors
- **Purple Gradient**: `#6366f1` → `#8b5cf6`
  - Used for primary branding, buttons, highlights
  
### Accent Colors
- **Orange**: `#ff6b35`
  - AntMedia brand reference
  - Used sparingly for accents and highlights

### Background Colors
- **Dark**: `#0a0a0a`
  - Primary background for dark theme
- **Dark Gray**: `#1a1a1a`
  - Secondary background elements

## Typography

**Primary Font**: Modern sans-serif (Inter, Roboto, or similar)
- **Logo Text**: Bold weight (700-800)
- **Tagline**: Regular weight (400-500)

## Brand Guidelines

### Logo Usage
1. **Minimum Size**: Don't scale logo below 120px width
2. **Clear Space**: Maintain minimum padding equal to height of "A" in AntFlow
3. **Background**: Works best on dark backgrounds
4. **Variations**: Use icon.png for square/small spaces, logo.png for horizontal layouts

### Color Usage
- Purple gradient is the primary brand color
- Orange accents reference AntMedia parent brand
- Maintain high contrast for accessibility

### Don'ts
- ❌ Don't change logo colors
- ❌ Don't distort or skew the logo
- ❌ Don't add effects (shadows, outlines) to the logo
- ❌ Don't place logo on busy backgrounds
- ❌ Don't separate "AntFlow" from "by AntMedia" tagline

## File Locations

```
client/public/
├── logo.png          # Full horizontal logo
├── icon.png          # App icon
├── favicon.ico       # Browser favicon
└── splash.png        # Splash screen
```

## Integration

### HTML
```html
<link rel="icon" href="/favicon.ico">
<link rel="apple-touch-icon" href="/icon.png">
<meta property="og:image" content="/logo.png">
```

### Vue Components
```vue
<img src="/logo.png" alt="AntFlow by AntMedia" />
<img src="/icon.png" alt="AntFlow Icon" />
```

## Updates

**Last Updated**: January 2026
**Version**: 1.0.0
**Designer**: AntMedia Design Team

For questions about branding, contact: branding@antmedia.io
