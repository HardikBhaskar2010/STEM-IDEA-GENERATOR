# Skill Level Extraction Debug Instructions - UPDATED

## Current Status
✅ **FIXED**: Updated AI service to properly extract skill level parameters in fallback mode
✅ **FIXED**: Changed default backend URL to use local server (http://localhost:8001/api)
✅ **FIXED**: Enhanced basic processing to extract both project type and skill level

## Quick Test Steps

### 1. **Start Backend Server**
Run the backend server first:
```bash
# In project root directory
start_backend.bat
```
Wait for: "Server will start on: http://localhost:8001"

### 2. **Test the Chat System**
1. Go to **http://localhost:3000**
2. Open browser Developer Tools (F12) → Console tab
3. Press **Ctrl+K** to open Universal Chat
4. Type: **"Create an expert level robotics project"**
5. Watch the console for debug messages

**Expected Console Output (NEW):**
```
🔍 UniversalChat - Sending message: Create an expert level robotics project
🔍 AI Voice Service - Making API call to: http://localhost:8001/api/ai-guidance/process-voice
🔍 AI Service Basic Processing - Extracted parameters: {projectType: "robotics", skillLevel: "expert"}
🔍 UniversalChat - Final extracted form data: {projectType: "robotics", skillLevel: "expert", interests: "Create an expert level robotics project", budget: "", duration: ""}
💾 UniversalChat - Stored form data in sessionStorage: {projectType: "robotics", skillLevel: "expert", ...}
```

### 3. **Verify Generator Page**
When you navigate to the Generator page, check:
- **Expertise dropdown** should show: "Expert (Innovator)"
- **Domain dropdown** should show: "Robotics & Mechatronics"
- **The Vision textarea** should contain your original message

## What Was Fixed

### **Issue 1: Wrong Backend URL**
- **Before**: `https://perfection-v2.onrender.com/api` (production, failing)
- **After**: `http://localhost:8001/api` (local server)

### **Issue 2: Basic Processing Missing Parameters**
- **Before**: Only returned `{ path: '/generator' }`
- **After**: Returns `{ path: '/generator', formData: { projectType: 'robotics', skillLevel: 'expert', ... } }`

### **Issue 3: Limited Trigger Conditions**
- **Before**: Only triggered on "generate", "create project", etc.
- **After**: Also triggers on skill level keywords ("expert", "advanced", "beginner", "intermediate")

## Test Cases to Try

1. **"Create an expert level robotics project"** → Should show Expert + Robotics
2. **"Make a beginner IoT device"** → Should show Beginner + IoT
3. **"Build an advanced electronics circuit"** → Should show Advanced + Electronics
4. **"Generate an intermediate automation system"** → Should show Intermediate + Automation
5. **"I want an expert sensor project"** → Should show Expert + Sensors

## Troubleshooting

### **If Backend Connection Fails:**
1. Make sure `start_backend.bat` is running
2. Check console for "Server will start on: http://localhost:8001"
3. Test backend directly: http://localhost:8001/api/health

### **If Skill Level Still Shows Intermediate:**
1. Check console for "🔍 AI Service Basic Processing - Extracted parameters"
2. Verify sessionStorage in DevTools → Application → Storage → Session Storage
3. Look for "generatorFormData" key with correct skillLevel

### **If No Debug Messages:**
1. Clear browser cache and reload
2. Check if chat is actually sending the message
3. Verify the message contains skill level keywords

## Manual Override Test

If issues persist, try this manual test:
1. Go to http://localhost:3000/generator
2. Open Console and run:
```javascript
sessionStorage.setItem('generatorFormData', JSON.stringify({
  projectType: 'robotics',
  skillLevel: 'expert',
  interests: 'Test expert project'
}));
location.reload();
```

## Expected Final Result

✅ **Working**: "Create an expert level robotics project" → Generator shows "Expert (Innovator)" and "Robotics & Mechatronics"
❌ **Still Broken**: Generator shows "Intermediate (Maker)" instead

The fix should now work both when the backend is connected AND when it falls back to basic processing!