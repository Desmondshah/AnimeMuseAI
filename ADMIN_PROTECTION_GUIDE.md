# Auto-Refresh Protection System Guide 🛡️

## Overview

The Auto-Refresh Protection System prevents external API updates from overwriting manual admin edits. When an admin edits anime details, those fields are **permanently protected** from being overwritten by auto-refresh.

## How It Works

### 1. **When You Edit Anime**
```
Admin edits: Title, Description
↓
System records: 
- Admin ID
- Timestamp  
- Protected fields: ["title", "description"]
↓
These fields are now PERMANENTLY protected
```

### 2. **When Auto-Refresh Runs**
```
External API returns new data
↓
System checks each field
↓
Protected fields → SKIP (keep admin's version)
Unprotected fields → UPDATE (use API version)
```

## Using the Protection Manager

### In the Edit Anime Form

1. **Open Edit Anime Modal**
   - Navigate to Admin → Anime Management
   - Click "Edit" on any anime

2. **Check Protection Status**
   - Look for the red "Auto-Refresh Protection" section
   - Shows how many fields are protected
   - Click to expand and see details

3. **Reset Protection Options**

   **Reset Selected Fields:**
   ```
   ✓ title
   □ description  
   □ posterUrl
   [Reset Selected (1)]
   ```
   
   **Reset All Protection:**
   ```
   [Reset All Protection]
   ```

### Console Commands (Quick Access)

```javascript
// Reset ALL protection for an anime
convex.mutation("admin:adminResetAutoRefreshProtection", {
  animeId: "k97...abc"
});

// Reset specific fields only
convex.mutation("admin:adminResetAutoRefreshProtection", {
  animeId: "k97...abc",
  fieldsToReset: ["title", "description"]
});
```

## Protection Status Indicators

### 🛡️ **Protected (Red Box)**
- Fields are protected from auto-refresh
- Shows list of protected fields
- Can selectively reset protection

### ✅ **No Protection (Gray Box)**
- No fields are protected
- Auto-refresh can update all fields normally

## Examples

### Example 1: Correcting a Title
```
1. Admin edits: "Attack on Titan" → "Attack on Titan: The Final Season"
2. System protects: title field
3. External API still returns: "Attack on Titan"
4. Auto-refresh: "Skipping title - permanently protected (admin edited)"
5. Result: Title stays as "Attack on Titan: The Final Season" ✅
```

### Example 2: Resetting Protection
```
1. Anime has protected fields: ["title", "description", "genres"]
2. Admin wants to allow auto-refresh for description only
3. Admin selects: ✓ description
4. Clicks: "Reset Selected (1)"
5. Result: Only "description" can be auto-updated now
   - title ✅ Still protected
   - genres ✅ Still protected
   - description ❌ No longer protected
```

## Best Practices

1. **Review Before Resetting**
   - Check what fields are currently protected
   - Consider if you really want external APIs to overwrite

2. **Selective Resets**
   - Reset only fields you want to sync with external data
   - Keep critical corrections protected

3. **Monitor Changes**
   - Check console logs for protection activity
   - Review change history for tracking

## Troubleshooting

### "No manual edit protection to reset"
- The anime has never been manually edited
- No protection exists to reset

### Protection not working?
- Check if the edit was saved successfully
- Verify in console: `anime.lastManualEdit`
- Check logs for "permanently protected" messages

## Field Protection List

These fields can be protected:
- `title`
- `description`
- `posterUrl`
- `genres`
- `year`
- `rating`
- `emotionalTags`
- `trailerUrl`
- `studios`
- `themes`

## Questions?

The protection system ensures your manual corrections are never lost to automatic updates. Use it confidently to maintain data accuracy! 🎯 