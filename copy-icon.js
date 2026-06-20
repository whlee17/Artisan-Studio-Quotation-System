import fs from 'fs';
import path from 'path';

const src = path.join(process.cwd(), 'public', 'icon-512.png');
const dest = path.join(process.cwd(), 'public', 'icon-192.png');

try {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log('Successfully copied icon-512.png to icon-192.png');
  } else {
    console.warn('Source icon-512.png does not exist yet.');
  }
} catch (err) {
  console.error('Error duplicating PWA icons:', err);
}
