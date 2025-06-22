# 🎬 In-App Anime Streaming Guide

## Overview
Your AnimeMuseAI app now includes an in-app streaming viewer that allows users to watch anime episodes directly within the app, keeping them engaged while accessing official streaming sites.

## Features

### 🎮 Streaming Overlay
- **Embedded Streaming**: Watch episodes in an iframe within the app
- **Popup Mode**: Fallback option for sites that block embedding
- **Fullscreen Support**: Press `F` to toggle fullscreen mode
- **Episode Navigation**: Use arrow keys or UI controls to switch episodes
- **Auto-hiding Controls**: Controls fade after 3 seconds of inactivity

### ⌨️ Keyboard Shortcuts
- `F` - Toggle fullscreen mode
- `ESC` - Close streaming overlay (or exit fullscreen)
- `←/→` - Navigate between episodes
- `R` - Refresh the current stream

### 🔄 Streaming Methods
1. **Embed Mode**: Displays the stream in an iframe within your app
2. **Popup Mode**: Opens stream in a separate window (for blocked sites)
3. **External Link**: Falls back to opening in a new browser tab

## Setup & Testing

### 1. Seed Test Data
```typescript
// The app includes One Piece test data for demonstration
// Use the admin panel to seed the database with streaming episodes
```

### 2. Access Admin Panel
Navigate to the admin section and use the "Streaming Test Panel" to:
- Seed One Piece anime data with 10 test episodes
- Add alternative YouTube streaming sources for demo
- Test the streaming overlay functionality

### 3. Test Streaming
1. Click "Seed One Piece Data" to create test data
2. Select an episode from the dropdown
3. Click "🎬 Test Streaming Overlay" to open the viewer
4. Try different streaming modes and keyboard shortcuts

## Integration with Your App

### Episode Display
Episodes with streaming data will show "Watch" buttons in:
- `AnimeDetailPage` - Episode tabs
- `EnhancedEpisodesTab` - Grid and list views
- Episode cards and timeline components

### Data Structure
```typescript
interface StreamingEpisode {
  title?: string;
  thumbnail?: string;
  url?: string;           // Main streaming URL
  site?: string;          // Source site name
  previewUrl?: string;    // Preview/trailer URL
  duration?: string;
  airDate?: string;
  episodeNumber?: number;
}
```

### Database Schema
Streaming episodes are stored in the `anime` collection:
```typescript
streamingEpisodes: v.optional(v.array(v.object({
  title: v.optional(v.string()),
  thumbnail: v.optional(v.string()),
  url: v.optional(v.string()),
  site: v.optional(v.string()),
  previewUrl: v.optional(v.string()),
})))
```

## How It Works

### 1. Episode Click Handler
When a user clicks "Watch" on an episode:
```typescript
const handleWatchEpisode = (url: string, episodeIndex?: number) => {
  const episode = episodes.find(ep => ep.url === url);
  if (episode) {
    setStreamingEpisode(episode);
    setStreamingEpisodeIndex(episodeIndex ?? episodes.indexOf(episode));
    setIsStreamingOpen(true);
  }
};
```

### 2. Streaming Overlay Component
The `StreamingOverlay` component handles:
- Iframe embedding with security settings
- Fallback to popup windows for blocked sites
- Episode navigation and controls
- Keyboard shortcuts and accessibility

### 3. Security Considerations
- Uses sandboxed iframes with restricted permissions
- Handles CORS and X-Frame-Options restrictions
- Provides fallback options when embedding fails
- Opens external links safely with `noopener,noreferrer`

## Benefits

### For Users
- **Seamless Experience**: Watch anime without leaving your app
- **Easy Navigation**: Switch between episodes with keyboard shortcuts
- **Multiple Viewing Options**: Embed, popup, or external viewing
- **Responsive Design**: Works on desktop and mobile devices

### For Your App
- **Increased Engagement**: Users stay within your ecosystem
- **Better UX**: No constant tab switching
- **Professional Feel**: Native streaming experience
- **Future-Ready**: Easy to extend with more streaming sources

## Customization

### Theming
The streaming overlay accepts a `themePalette` prop to match your app's design:
```typescript
<StreamingOverlay
  themePalette={extractedColors}
  // ... other props
/>
```

### Adding More Anime
Extend the test data pattern to add more anime with streaming episodes:
```typescript
// In convex/testData.ts, create more seed functions
export const seedNarutoData = mutation({
  // Similar to seedOnePieceData but with Naruto episodes
});
```

## Troubleshooting

### Common Issues
1. **Iframe Blocked**: Many streaming sites block embedding for security
   - **Solution**: App automatically offers popup mode
   
2. **CORS Errors**: Cross-origin restrictions prevent embedding
   - **Solution**: Use alternative sources or popup mode
   
3. **No Episodes Showing**: Missing streaming data
   - **Solution**: Ensure anime has `streamingEpisodes` data

### Debug Mode
Enable console logging in `StreamingOverlay.tsx` to debug:
```typescript
console.log('Streaming episode:', episode);
console.log('Available episodes:', episodes);
```

## Next Steps

1. **Add More Anime**: Expand beyond One Piece test data
2. **Integrate APIs**: Connect to official streaming service APIs
3. **User Preferences**: Save preferred streaming sources
4. **Watch History**: Track episode progress and history
5. **Quality Selection**: Add streaming quality options

---

🎉 **Your app now has professional in-app streaming capabilities!**

Test it out with the One Piece demo data and see how it keeps users engaged within your AnimeMuseAI ecosystem. 