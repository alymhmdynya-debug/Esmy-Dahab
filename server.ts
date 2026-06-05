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

// Dynamic XML Sitemap for advanced crawling and search indexing
app.get('/sitemap.xml', async (req, res) => {
  const usersRef = collection(db, 'users');
  const designsRef = collection(db, 'designs');
  
  let usersList: string[] = [];
  let designsList: string[] = [];

  try {
    const usersSnap = await getDocs(usersRef);
    usersSnap.forEach(docSnap => {
      const data = docSnap.data();
      if (data.username) {
        usersList.push(data.username.toLowerCase().trim());
      }
    });

    const designsSnap = await getDocs(designsRef);
    designsSnap.forEach(docSnap => {
      const data = docSnap.data();
      if (data.id) {
        designsList.push(data.id);
      }
    });
  } catch (err) {
    console.error('Error compiling sitemap URLs for SEO:', err);
  }

  // Generate XML content
  const domain = "https://esmydahab.com";
  const currentDate = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // 1. Static Landing Pages
  xml += `  <url>\n    <loc>${domain}/</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

  // 2. Dynamic User Profiles
  usersList.forEach(username => {
    xml += `  <url>\n    <loc>${domain}/${encodeURIComponent(username)}</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  });

  // 3. Dynamic Name Designs Links based on query param for SEO keywords
  designsList.forEach(designId => {
    const searchName = designId.replace('design_', '');
    xml += `  <url>\n    <loc>${domain}/?search=${encodeURIComponent(searchName)}</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
  });

  xml += `</urlset>`;

  res.setHeader('Content-Type', 'application/xml');
  return res.send(xml);
});

// Semantic robot file directing crawlers correctly
app.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/*
Disallow: /api/*

Sitemap: https://esmydahab.com/sitemap.xml
`);
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
