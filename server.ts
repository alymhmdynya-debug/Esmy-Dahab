import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const app = express();
const PORT = 3000;

// Read firebase configuration file
const firebaseConfig = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf-8')
);

// Initialize Firebase for server-side manifest generation
const firebaseApp = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId) : getFirestore(firebaseApp);

// API route for dynamic user PWA manifest
app.get('/:username/manifest.json', async (req, res) => {
  const { username } = req.params;
  const reservedWords = ['admin', 'apps', 'api', 'assets', 'icons', 'public', 'src', 'lib', 'components', 'seed', 'test'];
  if (reservedWords.includes(username.toLowerCase())) {
    return res.status(404).send('Not found');
  }

  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('username', '==', username));
  let displayName = username;
  let level = 1;

  try {
    const snap = await getDocs(q);
    if (!snap.empty) {
      const userDoc = snap.docs[0].data();
      displayName = userDoc.displayName || displayName;
      level = Number(userDoc.level) || 1;
    }
  } catch (err) {
    console.error('Error fetching user manifest on server:', err);
  }

  let selectedIcon = '/icons/stage1.png';
  if (level === 2) selectedIcon = '/icons/stage2.png';
  if (level === 3) selectedIcon = '/icons/stage3.png';

  res.setHeader('Content-Type', 'application/manifest+json');
  return res.json({
    "short_name": displayName,
    "name": `${displayName} - اسمي دهب`,
    "description": "براند تيشرتات بالاسم مخصصة فخمة - ESM",
    "icons": [
      {
        "src": selectedIcon,
        "sizes": "192x192",
        "type": "image/png"
      },
      {
        "src": selectedIcon,
        "sizes": "512x512",
        "type": "image/png"
      }
    ],
    "start_url": `/${username}?ref=${username}`,
    "background_color": "#000000",
    "theme_color": level === 1 ? "#000000" : level === 2 ? "#C0C0C0" : "#D4AF37",
    "display": "standalone",
    "orientation": "portrait"
  });
});

// Dynamic fallback or cookie-based PWA manifest at `/manifest.json` for installation support
app.get('/manifest.json', async (req, res) => {
  let username = '';
  
  // 1. Try to read from cookie
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const matches = cookieHeader.match(/(?:^|; )esm_username=([^;]*)/);
    if (matches) {
      username = decodeURIComponent(matches[1]).toLowerCase();
    }
  }

  // 2. Try to read from query parameter
  if (!username && req.query.u) {
    username = String(req.query.u).toLowerCase();
  }

  // If we resolved a user, return their user-specific manifest
  if (username) {
    const reservedWords = ['admin', 'apps', 'api', 'assets', 'icons', 'public', 'src', 'lib', 'components', 'seed', 'test'];
    if (!reservedWords.includes(username)) {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username));
      let displayName = username;
      let level = 1;

      try {
        const snap = await getDocs(q);
        if (!snap.empty) {
          const userDoc = snap.docs[0].data();
          displayName = userDoc.displayName || displayName;
          level = Number(userDoc.level) || 1;
        }
      } catch (err) {
        console.error('Error fetching user manifest for root manifest:', err);
      }

      let selectedIcon = '/icons/stage1.png';
      if (level === 2) selectedIcon = '/icons/stage2.png';
      if (level === 3) selectedIcon = '/icons/stage3.png';

      res.setHeader('Content-Type', 'application/manifest+json');
      return res.json({
        "short_name": displayName,
        "name": `${displayName} - اسمي دهب`,
        "description": "براند تيشرتات بالاسم مخصصة فخمة - ESM",
        "icons": [
          {
            "src": selectedIcon,
            "sizes": "192x192",
            "type": "image/png"
          },
          {
            "src": selectedIcon,
            "sizes": "512x512",
            "type": "image/png"
          }
        ],
        "start_url": `/${username}?ref=${username}`,
        "background_color": "#000000",
        "theme_color": level === 1 ? "#000000" : level === 2 ? "#C0C0C0" : "#D4AF37",
        "display": "standalone",
        "orientation": "portrait"
      });
    }
  }

  // Default branding PWA manifest
  res.setHeader('Content-Type', 'application/manifest+json');
  return res.json({
    "short_name": "إسمي ذهب",
    "name": "إسمي ذهب • ESMY DAHAB",
    "description": "براند تيشرتات بالاسم مخصصة فخمة - ESM",
    "icons": [
      {
        "src": "/icons/stage1.png",
        "sizes": "192x192",
        "type": "image/png"
      },
      {
        "src": "/icons/stage1.png",
        "sizes": "512x512",
        "type": "image/png"
      }
    ],
    "start_url": "/",
    "background_color": "#000000",
    "theme_color": "#000000",
    "display": "standalone",
    "orientation": "portrait"
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
