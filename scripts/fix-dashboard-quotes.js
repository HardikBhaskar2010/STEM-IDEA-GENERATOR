import fs from 'fs';
import path from 'path';

const filePath = path.join('/vercel/share/v0-project', 'frontend/src/pages/Dashboard.tsx');

try {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Replace all escaped quotes with regular quotes
  const fixed = content.replace(/\\"/g, '"');
  
  // Write back to file
  fs.writeFileSync(filePath, fixed, 'utf-8');
  
  console.log('[v0] Successfully fixed all escaped quotes in Dashboard.tsx');
} catch (error) {
  console.error('[v0] Error fixing quotes:', error.message);
  process.exit(1);
}
