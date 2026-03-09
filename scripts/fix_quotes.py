#!/usr/bin/env python3
import os

# Use absolute path
file_path = '/vercel/share/v0-project/frontend/src/pages/Dashboard.tsx'

print(f'[v0] Reading file from: {file_path}')
print(f'[v0] File exists: {os.path.exists(file_path)}')

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Count escaped quotes before
count_before = content.count('\\"')
print(f'[v0] Found {count_before} escaped quotes')

# Replace all escaped quotes with regular quotes
fixed_content = content.replace('\\"', '"')

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(fixed_content)

print('[v0] Successfully fixed all escaped quotes in Dashboard.tsx')
