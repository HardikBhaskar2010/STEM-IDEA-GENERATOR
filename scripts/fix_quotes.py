#!/usr/bin/env python3
import os

# Change to the project directory
os.chdir('/vercel/share/v0-project')

# Read the file
with open('frontend/src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all escaped quotes with regular quotes
fixed_content = content.replace('\\"', '"')

# Write back
with open('frontend/src/pages/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(fixed_content)

print('[v0] Successfully fixed all escaped quotes in Dashboard.tsx')
