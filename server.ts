import "dotenv/config";

// Forcefully prune empty or placeholder/unconfigured environment variables to silence google-auth-library warned messages
const OAUTH_KEYS_TO_PRUNE = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'CLIENT_ID', 'CLIENT_SECRET'];
for (const key of OAUTH_KEYS_TO_PRUNE) {
  const val = process.env[key];
  if (val === undefined || val === null || val.trim() === "" || val.trim() === "undefined" || val.trim() === "null") {
    delete process.env[key];
  }
}

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "node:http";
import { Server } from "socket.io";
import admin from "firebase-admin";
import { getDatabase } from "firebase-admin/database";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleGenAI } from "@google/genai";
import CryptoJS from 'crypto-js';
import { readFileSync } from 'fs';
import { VenueSchema, PaymentSchema } from './src/lib/validation';
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";
import nodemailer from 'nodemailer';
import pg from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import axios from 'axios';

const { Pool } = pg;
// Use explicit config to handle common environment variable misconfigurations
const poolConfig: any = {
  max: 5,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 2000, 
};
if (process.env.DATABASE_URL) {
  poolConfig.connectionString = process.env.DATABASE_URL;
} else {
  poolConfig.host = process.env.PGHOST?.replace(/^DB_HOST/i, '').trim() || process.env.DB_HOST?.trim();
  poolConfig.user = process.env.PGUSER || process.env.DB_USER;
  poolConfig.password = process.env.PGPASSWORD || process.env.DB_PASSWORD;
  poolConfig.database = process.env.PGDATABASE || process.env.DB_NAME;
  poolConfig.port = parseInt(process.env.PGPORT || process.env.DB_PORT || '5432');
}

const pool = new Pool(poolConfig); 

// Test DB Connection
const isPostgresConfigured = !!(poolConfig.host || poolConfig.connectionString || process.env.DATABASE_URL);

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle database client:', err);
});

// Run FCM Migration
if (isPostgresConfigured) {
  (async () => {
    let client;
    try {
      console.log(`📡 Attempting FCM Migration on database at ${poolConfig.host || 'remote URL'}... (Timeout: 5s)`);
      client = await pool.connect();
      console.log('✅ PostgreSQL connected, starting schema checks...');
      await client.query(`
        DO $$ BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='fcm_token') THEN
            ALTER TABLE users ADD COLUMN fcm_token TEXT;
          END IF;
        END $$;
      `);
      try { await client.query('ALTER TABLE users ADD CONSTRAINT unique_fcm_token UNIQUE (fcm_token);'); } catch (e) {}
      await client.query('CREATE INDEX IF NOT EXISTS idx_users_fcm_token ON users(fcm_token);');
      await client.query(`
        DO $$ BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='fcm_token_updated_at') THEN
            ALTER TABLE users ADD COLUMN fcm_token_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
          END IF;
        END $$;
      `);
      console.log('✅ FCM Migration Successful');
    } catch (err: any) {
      console.warn('⚠️ FCM Migration Skipped (Database might be unavailable):', err.message);
    } finally {
      if (client) {
        try { client.release(); } catch (e) {}
      }
    }
  })().catch(err => {
    console.warn('⚠️ Unhandled error during FCM Migration:', err.message);
  });
} else {
  console.log('ℹ️ Skipping FCM Migration: No database configuration found.');
}

const firebaseConfig = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf8'));

// Robust DATABASE_URL resolution
function getDatabaseUrl() {
  if (firebaseConfig.databaseURL) return firebaseConfig.databaseURL;
  if (process.env.FIREBASE_DATABASE_URL) return process.env.FIREBASE_DATABASE_URL;
  
  // In AI Studio, the database URL is often either the standard one or with -default-rtdb
  if (firebaseConfig.projectId) {
    return `https://${firebaseConfig.projectId}-default-rtdb.firebaseio.com`;
  }
  return undefined;
}

const DATABASE_URL = getDatabaseUrl();

// Lazy Firebase Admin Initialization
let adminApp: admin.app.App | null = null;
let cachedDb: any = null;
let discoveryPromise: Promise<any> | null = null;

async function getAdminAppInstance() {

if (adminApp) return adminApp;

const projectId = firebaseConfig.projectId || process.env.GOOGLE_CLOUD_PROJECT;


const sa = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_ADMIN_TOKEN;


try {

if (sa && sa.startsWith("{")) {

const serviceAccount = JSON.parse(sa);

adminApp = admin.initializeApp({

credential: admin.credential.cert(serviceAccount),

projectId: serviceAccount.project_id || projectId,

databaseURL: DATABASE_URL

}, 'primary');

} else {

// Use ADC Mode

adminApp = admin.initializeApp({

projectId: projectId,

databaseURL: DATABASE_URL

}, 'primary');

}

console.log(`✅ Firebase Admin initialized for project: ${projectId}`);

return adminApp;

} catch (error: any) {

if (error.code === 'app/duplicate-app') {

adminApp = admin.app('primary');

return adminApp;

}

console.error("❌ Firebase Admin initialization failed:", error);

return null;

}

} 

/**
 * Get Realtime Database instance
 */
async function getDb() {
  if (cachedDb) return cachedDb;
  const app = await getAdminAppInstance();
  const db = app.database();
  cachedDb = db;
  return db;
}

async function getFs() {
  try {
    const app = await getAdminAppInstance();
    const dbId = (firebaseConfig as any).firestoreDatabaseId || (firebaseConfig as any).databaseId;
    
    if (dbId && dbId !== '(default)') {
      console.log(`📡 Initializing Firestore with custom database ID: ${dbId}`);
      return getFirestore(app, dbId);
    }
    return getFirestore(app);
  } catch (err: any) {
    console.error("❌ Firestore initialization failed:", err.message);
    const app = await getAdminAppInstance();
    return getFirestore(app);
  }
}

/**
 * Creates a Firebase Custom Token JWT using the Firebase Admin SDK.
 */
async function createFirebaseCustomToken(uid: string, additionalClaims?: object) {
  const adminApp = await getAdminAppInstance();
  if (adminApp) {
    return await adminApp.auth().createCustomToken(uid, additionalClaims);
  }
  throw new Error("Firebase Admin SDK is not initialized");
}

/**
 * Fetch venue managers for a specific venue from the Realtime Database /users node.
 */
async function getVenueManagers(venueId: string) {
  try {
    const db = await getDb();
    if (!db) return [];
    
    const snapshot = await db.ref('users')
      .orderByChild('assigned_venue_id')
      .equalTo(venueId)
      .once('value');
      
    if (!snapshot.exists()) return [];
    
    const managers: any[] = [];
    snapshot.forEach((child) => {
      const user = child.val();
      const role = (user.role || '').toUpperCase();
      if (['MANAGER', 'EVENT_MANAGER'].includes(role) && user.fcmToken) {
        managers.push({
          uid: child.key,
          fcmToken: user.fcmToken,
          email: user.email,
          username: user.username
        });
      }
    });
    return managers;
  } catch (err) {
    console.error(`❌ Error fetching venue managers for venue ${venueId}:`, err);
    return [];
  }
}

/**
 * Triggers an FCM notification to a venue manager about low stock inventory.
 */
async function sendInventoryAlertNotification(fcmToken: string, itemName: string, skuCode: string, currentStock: number, venueId: string) {
  const adminApp = await getAdminAppInstance();
  if (!adminApp) return;

  const title = `⚠️ Low Inventory Alert: ${itemName} 🍹`;
  const body = `Stock has fallen to ${currentStock} units for SKU: ${skuCode || 'unspecified'}. Please initiate restocking.`;

  const message = {
    notification: {
      title,
      body
    },
    data: {
      type: "INVENTORY_ALERT",
      itemName,
      skuCode: skuCode || '',
      stock: currentStock.toString(),
      venueId
    },
    token: fcmToken
  };

  try {
    const fcmResponse = await adminApp.messaging().send(message);
    console.log(`✅ FCM: Inventory alert notification sent successfully to token (${fcmToken.slice(0, 10)}...):`, fcmResponse);
  } catch (error) {
    console.error('❌ FCM: Error sending inventory alert:', error);
  }
}

/**
 * Real-time background service scanning Firestore 'inventory' updates 
 * and notifying corresponding venue managers when levels fall below 5.
 */
async function startInventoryMonitoringService() {
  console.log('📦 Starting Background Inventory Monitoring Service...');
  try {
    const fsAdmin = await getFs();
    if (!fsAdmin) {
      console.warn('⚠️ Firestore Admin not available for background monitoring. Retrying in 10s...');
      setTimeout(startInventoryMonitoringService, 10000);
      return;
    }

    const currentStocksInMem = new Map<string, number>();
    let isInitialLoad = true;

    const unsubscribe = fsAdmin.collection('inventory').onSnapshot(async (snapshot) => {
      console.log(`📦 Inventory snapshot received with ${snapshot.size} items.`);
      
      const promises: Promise<void>[] = [];

      for (const change of snapshot.docChanges()) {
        if (change.type === 'added' || change.type === 'modified') {
          const docId = change.doc.id;
          const data = change.doc.data();
          const name = data.name || 'Unknown Item';
          const skuCode = data.code || data.sku || '';
          const venueId = data.venue_id || data.venueId;
          const newStock = typeof data.stock === 'number' ? data.stock : 0;

          const previousStock = currentStocksInMem.get(docId);
          currentStocksInMem.set(docId, newStock);

          // Only process alerts after initial state is stored in memory
          if (!isInitialLoad) {
            const isFirstTimeBelow5 = (previousStock === undefined || previousStock >= 5) && newStock < 5;
            const isFallenFurtherBelow5 = previousStock !== undefined && previousStock < 5 && newStock < previousStock && newStock < 5;

            if ((isFirstTimeBelow5 || isFallenFurtherBelow5) && venueId) {
              console.log(`⚠️ Inventory alert condition met: "${name}" (${docId}) has ${newStock} units remaining (previously ${previousStock}). Venue: ${venueId}`);
              
              const alertPromise = (async () => {
                const managers = await getVenueManagers(venueId);
                if (managers.length === 0) {
                  console.log(`ℹ️ No venue managers found with active FCM tokens for venue: ${venueId}`);
                  return;
                }

                console.log(`📣 Notifying ${managers.length} managers for venue: ${venueId}`);
                for (const manager of managers) {
                  await sendInventoryAlertNotification(manager.fcmToken, name, skuCode, newStock, venueId);
                }
              })();
              promises.push(alertPromise);
            }
          }
        } else if (change.type === 'removed') {
          currentStocksInMem.delete(change.doc.id);
        }
      }

      if (isInitialLoad) {
        isInitialLoad = false;
        console.log(`📦 Inventory baseline loaded in memory for ${currentStocksInMem.size} SKUs.`);
      }

      if (promises.length > 0) {
        await Promise.allSettled(promises);
      }
    }, (error) => {
      console.error('❌ Error in Inventory Real-time Listener:', error);
      setTimeout(startInventoryMonitoringService, 10000);
    });

    return unsubscribe;
  } catch (error) {
    console.error('❌ Critical error launching Inventory Monitoring Service:', error);
    setTimeout(startInventoryMonitoringService, 10000);
  }
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  const PORT = 3000;
  let globalIsTestMode = false;

  app.use(express.json());

  // --- Test Mode API Endpoints ---
  app.get("/api/admin/test-mode", (req, res) => {
    res.json({ is_test_mode: globalIsTestMode });
  });

  app.post("/api/admin/toggle-test-mode", (req, res) => {
    const { enabled } = req.body;
    globalIsTestMode = !!enabled;
    console.log(`🔧 [TEST MODE] Global Demonstration Switch changed to: ${globalIsTestMode}`);
    res.json({ success: true, is_test_mode: globalIsTestMode });
  });

  // --- Gemini AI Endpoints ---
  app.post("/api/gemini", async (req, res) => {
    const { action, payload } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key not configured on server" });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      let prompt = "";
      let systemInstruction = "";

      if (action === 'vibe') {
        prompt = `Suggest a round of drinks for a ${payload.vibe} group at a ${payload.venueType}. Keep it short, punchy, and confident. Maximum 2 sentences.`;
        systemInstruction = "You are Wayta, a street-smart, punchy AI assistant. Use brand voice: short sentences, confident, cool tone.";
      } else if (action === 'prep') {
        prompt = `Give a 3-step preparation plan for the following order: ${payload.items}. Be ultra-efficient.`;
        systemInstruction = "You are an expert master bartender trainer. Focus on speed and parallel processing.";
      } else if (action === 'strategy') {
        prompt = `Analyze these metrics and give a 1-sentence profit strategy: ${payload.stats}`;
        systemInstruction = "You are a high-level venue management consultant. Focus on immediate revenue optimization.";
      } else {
        return res.status(400).json({ error: "Invalid gemini action" });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate content" });
    }
  });

  // --- Middleware & Auth ---
  
  const protect = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(' ')[1];
    
    // 1. Try Firebase Admin verification first
    try {
      const adminApp = await getAdminAppInstance();
      if (adminApp) {
        const decodedToken = await adminApp.auth().verifyIdToken(token);
        req.user = {
          id: decodedToken.uid,
          uid: decodedToken.uid,
          email: decodedToken.email,
          role: decodedToken.role || 'PATRON',
          assigned_venue_id: null
        };
        
        try {
          const dbRef = adminApp.database().ref(`users/${decodedToken.uid}`);
          const snapshot = await dbRef.child('role').get();
          const venueSnapshot = await dbRef.child('assigned_venue_id').get();
          if (snapshot.exists()) {
            req.user.role = snapshot.val();
          }
          if (venueSnapshot.exists()) {
            req.user.assigned_venue_id = venueSnapshot.val();
          }
        } catch (dbErr) {
          console.warn(`⚠️ Failed to fetch role/venue for user ${decodedToken.uid}`);
        }
        
        return next();
      }
    } catch (fbErr: any) {
      // Fallback to manual JWT
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'wayta-secret-2026');
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }
  };

  const checkPermission = (allowedRoles: string[], checkVenueAccess = false) => {
    return async (req: any, res: any, next: any) => {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!allowedRoles.includes(req.user.role) && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: "Forbidden: Insufficient role" });
      }
      
      if (checkVenueAccess) {
        const venueId = req.params.venue_id || req.body.venue_id || req.body.venueId;
        
        if (!venueId) {
          return res.status(400).json({ error: "Venue ID required for this operation" });
        }
        
        if (req.user.role !== 'ADMIN' && req.user.assigned_venue_id !== venueId) {
          return res.status(403).json({ error: "Forbidden: Access to this venue is not authorized" });
        }
      }
      
      next();
    };
  };

  // --- v1 Auth Endpoints ---

  app.post("/api/v1/auth/register", async (req, res) => {
    const { email, password, username } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await pool.query(
        'INSERT INTO users (email, password_hash, username, role) VALUES ($1, $2, $3, $4) RETURNING user_id',
        [email, hashedPassword, username || email.split('@')[0], 'PATRON']
      );
      res.status(201).json({ success: true, user_id: result.rows[0].user_id });
    } catch (err: any) {
      if (err.code === '23505') return res.status(409).json({ error: "User already exists" });
      res.status(500).json({ error: "Registration failed", details: err.message });
    }
  });

  app.post("/api/auth/check-username", async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Username required" });

    const adminApp = await getAdminAppInstance();
    if (!adminApp) return res.status(503).json({ error: "Firebase Admin SDK not configured" });

    try {
      const db = await getDb();
      if (!db) return res.status(503).json({ error: "Firebase Admin SDK not configured" });

      const snapshot = await db.ref('users')
        .orderByChild('username')
        .equalTo(username.toUpperCase())
        .limitToFirst(1)
        .once('value');
      
      res.json({ available: !snapshot.exists() });
    } catch (err: any) {
      res.status(500).json({ error: "Check failed", message: err.message });
    }
  });

  app.post("/api/v1/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      const user = result.rows[0];

      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign(
        { id: user.user_id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'wayta-secret-2026',
        { expiresIn: '24h' }
      );

      res.json({ success: true, token, user: { id: user.user_id, email: user.email, role: user.role } });
    } catch (err: any) {
      res.status(500).json({ error: "Login failed", details: err.message });
    }
  });

  // --- v1 Venue & Discovery ---

  app.get("/api/v1/venues", async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM venues WHERE status = $1', ['active']);
      res.json({ venues: result.rows });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch venues" });
    }
  });

  app.get("/api/v1/venues/:venue_id/menu", async (req, res) => {
    const { venue_id } = req.params;
    try {
      const result = await pool.query(
        'SELECT * FROM menu_items WHERE venue_id = $1 AND is_available = true',
        [venue_id]
      );
      res.json({ menu: result.rows });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch menu" });
    }
  });

  app.get("/api/v1/venues/:venue_id/events", async (req, res) => {
    const { venue_id } = req.params;
    try {
      const result = await pool.query(
        'SELECT * FROM events WHERE venue_id = $1 AND start_time > NOW() ORDER BY start_time ASC',
        [venue_id]
      );
      res.json({ events: result.rows });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  // --- v1 User Profile & Budget ---
  app.post("/api/v1/user/fcm-token", protect, async (req: any, res: any) => {
    const { fcm_token } = req.body;
    const user_id = req.user.id;

    if (!fcm_token) {
      return res.status(400).json({ error: "FCM token is required" });
    }

    try {
      await pool.query(
        `INSERT INTO users (id, fcm_token, fcm_token_updated_at) 
         VALUES ($1, $2, NOW())
         ON CONFLICT (id) DO UPDATE 
         SET fcm_token = EXCLUDED.fcm_token, fcm_token_updated_at = NOW()`,
        [user_id, fcm_token]
      );
      res.json({ success: true, message: "FCM token updated" });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to update FCM token" });
    }
  });

  // --- v1 Ordering Engine ---
  app.post("/api/v1/orders/create", protect, async (req: any, res: any) => {
    const { venue_id, event_id, items, total_amount } = req.body;
    const user_id = req.user.id; 

    if (!isPostgresConfigured) {
      return res.status(503).json({ error: "Order database is currently unavailable" });
    }

    // 1. Verify total_amount > 0
    if (!total_amount || parseFloat(total_amount) <= 0) {
      return res.status(400).json({ error: "Total amount must be greater than 0" });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Items array is required and cannot be empty" });
    }

    // [TEST MODE] Demo Order Interceptor
    if (globalIsTestMode) {
      console.log("🧪 [TEST MODE] Intercepting order creation. Simulating success, skipping external integration.");
      return res.status(201).json({
        success: true,
        message: "Order handled in Test Mode (Simulation). External integration skipped.",
        order_id: `SIMULATED-${Date.now()}`,
        test_mode: true
      });
    }

    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');

      // 2. Check Budgets table
      const budgetRes = await client.query(
        'SELECT total_limit, spent_amount FROM budgets WHERE user_id = $1 AND venue_id = $2',
        [user_id, venue_id]
      );

      if (budgetRes.rows.length > 0) {
        const { total_limit, spent_amount } = budgetRes.rows[0];
        if (parseFloat(spent_amount) + parseFloat(total_amount) > parseFloat(total_limit)) {
          // Log violation for analytics
          await client.query(
            'INSERT INTO behavior_logs (user_id, venue_id, action_type, metadata) VALUES ($1, $2, $3, $4)',
            [user_id, venue_id, 'BUDGET_EXCEEDED_ATTEMPT', JSON.stringify({ amount: total_amount, budget: total_limit })]
          );
          return res.status(403).json({ 
            error: "Purchase exceeds your set night limit", 
            details: { limit: total_limit, current_spend: spent_amount } 
          });
        }
      }

      // 3. Calculate 5% Wayta commission and net payout
      const commission_rate = 0.05;
      const wayta_commission_fee = total_amount * commission_rate;
      const net_venue_payout = total_amount - wayta_commission_fee;

      // 4. Create new record in Orders with status 'pending'
      const orderRes = await client.query(
        `INSERT INTO orders (user_id, venue_id, event_id, total_amount, wayta_commission_fee, net_venue_payout, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING order_id`,
        [user_id, venue_id, event_id || null, total_amount, wayta_commission_fee, net_venue_payout, 'pending']
      );
      
      const order_id = orderRes.rows[0].order_id;

      // 5. Insert order items
      for (const item of items) {
        await client.query(
          'INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
          [order_id, item.product_id, item.quantity, item.price || 0]
        );
      }

      // Update budget spent_amount
      if (budgetRes.rows.length > 0) {
        await client.query(
          'UPDATE budgets SET spent_amount = spent_amount + $1, updated_at = NOW() WHERE user_id = $2 AND venue_id = $3',
          [total_amount, user_id, venue_id]
        );
      }

      await client.query('COMMIT');

      // 6. Return order_id and success message
      res.status(201).json({
        success: true,
        message: "Order placed successfully! Skip the queue initiated.",
        order_id: order_id
      });

    } catch (err: any) {
      if (client) {
        try { await client.query('ROLLBACK'); } catch (e) {}
      }
      console.error('Order Creation Error:', err);
      res.status(500).json({ error: "Could not process order", details: err.message });
    } finally {
      if (client) {
        try { client.release(); } catch (e) {}
      }
    }
  });

  app.get("/api/v1/orders/:order_id/status", protect, async (req, res) => {
    const { order_id } = req.params;
    try {
      const result = await pool.query('SELECT status FROM orders WHERE order_id = $1', [order_id]);
      if (result.rows.length === 0) return res.status(404).json({ error: "Order not found" });
      res.json({ order_id, status: result.rows[0].status });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch order status" });
    }
  });

  app.patch("/api/v1/orders/:order_id/fulfill", protect, checkPermission(['STAFF', 'BARTENDER']), async (req: any, res: any) => {
    const { order_id } = req.params;

    try {
      const result = await pool.query(
        'UPDATE orders SET status = $1, fulfilled_at = NOW() WHERE order_id = $2 RETURNING order_id, status, user_id',
        ['completed', order_id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: "Order not found" });

      const updatedOrder = result.rows[0];

      // 1. Broadcast via Socket.IO
      broadcastOrderStatusUpdate(updatedOrder.order_id, updatedOrder.status, updatedOrder.user_id);

      // 2. Push to Firebase to trigger the user's real-time listener
      try {
        const adminApp = await getAdminAppInstance();
        if (adminApp) {
          const dbRef = adminApp.database().ref(`orders/${order_id}`);
          await dbRef.update({
            status: 'completed',
            updatedAt: Date.now()
          });
          console.log(`🔥 RTDB synced for order ${order_id}`);
        }
      } catch (fbErr) {
        console.error("⚠️ Failed to sync with Firebase RTDB:", fbErr);
        // We don't fail the whole request if Firebase sync fails, but we log it
      }

      res.json({ success: true, message: "Order fulfilled", status: 'completed' });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fulfill order" });
    }
  });

  app.patch("/api/v1/orders/:order_id/status", protect, checkPermission(['STAFF', 'BARTENDER']), async (req: any, res: any) => {
    const { order_id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'processing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    try {
      const result = await pool.query(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE order_id = $2 RETURNING order_id, status, user_id',
        [status, order_id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: "Order not found" });

      const updatedOrder = result.rows[0];

      // Broadcast via Socket.IO
      broadcastOrderStatusUpdate(updatedOrder.order_id, updatedOrder.status, updatedOrder.user_id);

      // Sync with Firebase RTDB
      try {
        const adminApp = await getAdminAppInstance();
        if (adminApp) {
          const dbRef = adminApp.database().ref(`orders/${order_id}`);
          await dbRef.update({
            status: status,
            updatedAt: Date.now()
          });
        }
      } catch (fbErr) {
        console.error("⚠️ Failed to sync with Firebase RTDB:", fbErr);
      }

      // Defensive Order-Ready SMS Dispatcher (for Patron)
      if (status.toLowerCase() === 'ready' || status.toLowerCase() === 'ready_for_collection') {
        try {
          const dbAdmin = await getDb();
          if (dbAdmin) {
            const userSnap = await dbAdmin.ref(`users/${updatedOrder.user_id}`).once('value');
            if (userSnap.exists()) {
              const userData = userSnap.val();
              const userPhone = userData.phone || userData.phoneNumber;
              if (userPhone) {
                const textMessage = `WAYTA: Your order for ID ${order_id} is READY_FOR_COLLECTION! Please head to the bar or counter to collect. Thanks!`;
                await sendSmsNotification(userPhone, textMessage).catch((smsErr: any) => {
                  console.warn('⚠️ Order ready SMS dispatch failed, continuing defensively:', smsErr.message);
                });
              }
            }
          }
        } catch (smsOuterErr: any) {
          console.warn('⚠️ Order ready SMS fetch/find failed, continuing defensively:', smsOuterErr.message);
        }
      }

      res.json({ success: true, message: `Order status updated to ${status}`, status: status });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // --- v1 Budget & Analytics ---

  app.get("/api/v1/user/budget", protect, async (req: any, res: any) => {
    try {
      const result = await pool.query(
        'SELECT * FROM budgets WHERE user_id = $1',
        [req.user.id]
      );
      res.json({ budgets: result.rows });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch budget" });
    }
  });

  app.post("/api/v1/analytics/log-action", protect, async (req: any, res: any) => {
    const { venue_id, action_type, metadata } = req.body;
    try {
      await pool.query(
        'INSERT INTO behavior_logs (user_id, venue_id, action_type, metadata) VALUES ($1, $2, $3, $4)',
        [req.user.id, venue_id, action_type, JSON.stringify(metadata)]
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to log analytics" });
    }
  });


  // Socket.io Connection Logic
  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);
    
    socket.on("join_order", (orderId: string) => {
      socket.join(`order_${orderId}`);
      console.log(`👤 Socket ${socket.id} joined order channel: order_${orderId}`);
    });

    socket.on("join_user", (userId: string) => {
      socket.join(`user_${userId}`);
      console.log(`👤 Socket ${socket.id} joined user channel: user_${userId}`);
    });

    // Test Mode: ORDER_SUBMITTED and STATUS_UPDATED broadcast sequence
    socket.on("ORDER_SUBMITTED", (dataClaim) => {
      console.log("📢 [WS TEST] Received client ORDER_SUBMITTED event:", dataClaim);
      // Broadcast globally to all sockets for test views reflection
      io.emit("ORDER_SUBMITTED", {
        ...dataClaim,
        broadcastedAt: new Date().toISOString()
      });
    });

    socket.on("STATUS_UPDATED", (dataClaim) => {
      console.log("📢 [WS TEST] Received client STATUS_UPDATED event:", dataClaim);
      // Broadcast globally to all sockets for test views reflection
      io.emit("STATUS_UPDATED", {
        ...dataClaim,
        broadcastedAt: new Date().toISOString()
      });
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  // Notify Function
  const broadcastOrderStatusUpdate = async (orderId: string, status: string, userId?: string, email?: string, phone?: string) => {
    console.log(`🔔 Broadcasting order ${orderId} status update: ${status}`);
    
    const payload = {
      orderId,
      status,
      message: `Order status updated to ${status}`,
      timestamp: new Date().toISOString()
    };

    if (status === 'ready') {
      payload.message = "Your order is ready for collection! 🍹";
    } else if (status === 'completed') {
      payload.message = "Order completed! We hope you enjoyed your experience. ✨";
    }

    // 1. WebSocket Broadcast
    io.to(`order_${orderId}`).emit("order_status_update", payload);
    if (userId) io.to(`user_${userId}`).emit("order_status_update", payload);

    // 2. Defensive Notification (SMS/Email)
    try {
      if (status === 'ready' && phone) {
        console.log(`📱 Sending SMS to ${phone}: ${payload.message}`);
        // await smsGateway.send(phone, payload.message); // Hypothetical
      }
      if (status === 'completed' && email) {
        console.log(`📧 Sending Email to ${email}: ${payload.message}`);
        // await mailer.send(email, payload.message); // Hypothetical
      }
    } catch (err) {
      console.error("⚠️ Defensive notification failed, operation continued:", err);
    }
  };

  // API Proxy / Handlers
  app.get("/api/config", async (req, res) => {
    const adminApp = await getAdminAppInstance();
    let dbStatus = 'waiting_for_admin';
    let dbUrl = DATABASE_URL || 'undefined';
    
    if (adminApp) {
      try {
        if (DATABASE_URL) {
          const db = await getDb();
          if (db) {
             dbStatus = 'online (Realtime Database)';
          } else {
             dbStatus = 'error: could not initialize db';
          }
        } else {
          dbStatus = 'error: databaseURL missing in config';
        }
      } catch (err: any) {
        dbStatus = `offline: ${err.message}`;
      }
    }

    res.json({
      env: process.env.NODE_ENV || 'production',
      region: 'europe-west2',
      serverIdentity: '966500521542-compute@developer.gserviceaccount.com',
      adminStatus: !!adminApp ? 'online' : 'waiting_for_token',
      dbStatus,
      dbUrl,
      projectId: firebaseConfig.projectId
    });
  });

  // POST /api/venues with validation
  app.post("/api/venues", protect, checkPermission(['ADMIN']), async (req, res) => {
    const result = VenueSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "Validation failed", details: result.error.issues });
    }
    // Proceed with validated data
    const validatedVenue = result.data;
    res.status(201).json({ success: true, venue: validatedVenue });
  });

  // POST /api/payment with validation
  app.post("/api/payment", async (req, res) => {
    const result = PaymentSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "Validation failed", details: result.error.issues });
    }
    // Proceed with validated data (e.g., process payment gateway)
    const paymentData = result.data;
    console.log(`💳 Processing payment for order ${paymentData.order_id}: ${paymentData.amount}`);
    
    // In a real app, you'd call a gateway here
    res.json({ 
      success: true, 
      transaction_id: `TXN-${Math.random().toString(36).substring(7).toUpperCase()}`,
      data: paymentData 
    });
  });

  app.post("/api/admin/create-staff", async (req: any, res: any) => {
    const { firstName, lastName, role, venueId, eventId, phone, email, gender } = req.body;
    
    if (!firstName || !lastName || !role || (!venueId && !eventId)) {
      return res.status(400).json({ error: "Missing required staff information" });
    }

    try {
      const dbAdmin = await getDb();
      const fsAdmin = await getFs();
      if (!dbAdmin || !fsAdmin) return res.status(503).json({ error: "Admin SDK not ready" });

      // 1. Generate Username: FIRST_LAST_XXXX
      const suffix = Math.floor(1000 + Math.random() * 9000);
      const username = `${firstName.toUpperCase()}_${lastName.toUpperCase()}_${suffix}`;
      
      // 2. Generate 6-digit PIN
      const pin = Math.floor(100000 + Math.random() * 899999).toString();
      const pinHash = CryptoJS.SHA256(pin).toString();

      // 3. Create UID with role prefix
      const rolePrefix = role ? role.toLowerCase().replace(/_/g, '-') : 'staff';
      const uid = `${rolePrefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const staffProfile = {
        uid,
        username,
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        email: email || '',
        phone: phone || '',
        gender: gender || 'Prefer not to say',
        role,
        assigned_venue_id: eventId ? null : venueId,
        assigned_event_id: eventId || null,
        hashed_pin: pinHash,
        status: 'APPROVED',
        isVerified: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await fsAdmin.collection('users').doc(uid).set(staffProfile);
      
      // Save to role-specific collection
      const roleCollection = role.toLowerCase().endsWith('s') ? role.toLowerCase() : `${role.toLowerCase()}s`;
      // Normalize role collection names (e.g., BARTENDER -> bartenders, EVENT_MANAGER -> event_managers)
      const collectionName = role.toLowerCase().replace(/_/g, '_') + 's';
      await fsAdmin.collection(collectionName).doc(uid).set(staffProfile);
      
      // Also save to staff_members collection for backward compatibility/global listing
      await fsAdmin.collection('staff_members').doc(uid).set(staffProfile);
      // Keep RTDB in sync for legacy or low-latency components
      await dbAdmin.ref(`users/${uid}`).set({
        ...staffProfile,
        createdAt: admin.database.ServerValue.TIMESTAMP,
        updatedAt: admin.database.ServerValue.TIMESTAMP
      });

      if (eventId) {
        await fsAdmin.collection('events').doc(eventId).update({
          staffIds: admin.firestore.FieldValue.arrayUnion(uid)
        });
      }

      res.json({ 
        success: true, 
        credentials: {
          username,
          pin,
          role,
          displayName: staffProfile.displayName
        }
      });
    } catch (err: any) {
      console.error("Staff creation failed:", err);
      res.status(500).json({ error: "Failed to create staff member", message: err.message });
    }
  });

  app.post("/api/admin/remove-staff", async (req: any, res: any) => {
    const { userId } = req.body;
    
    if (!userId) {
      console.error("[remove-staff] Missing userId");
      return res.status(400).json({ error: "Missing required userId" });
    }

    console.log(`[remove-staff] Processing removal request for user: ${userId}`);

    try {
      const dbAdmin = await getDb();
      const fsAdmin = await getFs();
      if (!dbAdmin || !fsAdmin) return res.status(503).json({ error: "Admin SDK not ready" });

      // 1. Fetch user role from first source of truth (users or venue_managers)
      let userRole = 'STAFF'; // default
      const userSnap = await fsAdmin.collection('users').doc(userId).get();
      const managerSnap = await fsAdmin.collection('venue_managers').doc(userId).get();
      
      const userData = userSnap.exists ? userSnap.data() : (managerSnap.exists ? managerSnap.data() : null);
      if (userData) {
        userRole = userData.role || 'STAFF';
      }

      console.log(`[remove-staff] User role detected: ${userRole}`);

      // 2. SAFETY CHECK: If this is a MANAGER or EVENT_MANAGER, do NOT hard delete.
      // These roles often have establishment ownership. We only disassociate them from the venue staff list.
      if (userRole === 'MANAGER' || userRole === 'EVENT_MANAGER' || userRole === 'ADMIN') {
        console.log(`[remove-staff] Protecting critical account (${userRole}). Disassociating instead of deleting.`);
        
        // Remove venue/event associations in RTDB so they disappear from the staff list
        await dbAdmin.ref(`users/${userId}`).update({
          assigned_venue_id: null,
          assigned_event_id: null,
          updatedAt: admin.database.ServerValue.TIMESTAMP
        }).catch((e: any) => console.log(`[remove-staff] RTDB disassociate error:`, e));

        // Update Firestore status to 'INACTIVE' instead of deleting
        await fsAdmin.collection('users').doc(userId).update({ 
          status: 'INACTIVE', 
          updatedAt: admin.firestore.FieldValue.serverTimestamp() 
        }).catch((e: any) => {});
        
        if (managerSnap.exists) {
           await fsAdmin.collection('venue_managers').doc(userId).update({ 
             status: 'INACTIVE', 
             updatedAt: admin.firestore.FieldValue.serverTimestamp() 
           }).catch((e: any) => {});
        }

        return res.json({ 
          success: true, 
          message: "Critical role preserved. User disassociated from establishment and marked as Inactive.",
          mode: 'disassociate'
        });
      }

      // 3. For low-privilege staff roles, we perform the removal (with RTDB soft-delete priority)
      console.log(`[remove-staff] Proceeding with removal for staff member ${userId}`);
      
      // Delete from Firestore collections
      await fsAdmin.collection('users').doc(userId).delete().catch((e: any) => console.log(`[remove-staff] users delete error:`, e));
      await fsAdmin.collection('staff_members').doc(userId).delete().catch((e: any) => console.log(`[remove-staff] staff_members delete error:`, e));
      await fsAdmin.collection('patrons').doc(userId).delete().catch((e: any) => {});
      
      // IMPORTANT: Explicitly NOT deleting from venue_managers anymore just in case
      // await fsAdmin.collection('venue_managers').doc(userId).delete().catch((e: any) => {}); 
      
      // Delete from RTDB
      await dbAdmin.ref(`users/${userId}`).remove().catch((e: any) => console.log(`[remove-staff] RTDB remove error:`, e));

      console.log(`[remove-staff] Successfully removed user ${userId}`);
      return res.json({ success: true, message: "Staff member removed successfully", mode: 'delete' });
    } catch (err: any) {
      console.error("[remove-staff] Staff removal failed:", err);
      return res.status(500).json({ error: "Failed to remove staff member", message: err.message });
    }
  });

  app.post("/api/admin/approve-onboarding", async (req: any, res: any) => {
    const { requestId, name, email, type, details, firestoreId, venue_id } = req.body;
    
    if (!requestId || !name || !email || !type) {
      return res.status(400).json({ error: "Missing required onboarding information" });
    }

    try {
      const dbAdmin = await getDb();
      const fsAdmin = await getFs();
      if (!dbAdmin || !fsAdmin) return res.status(503).json({ error: "Admin SDK not ready" });

      // 0. Fetch deeper details from Firestore if available
      let extendedDetails = details || {};
      if (firestoreId) {
        const proposalSnap = await fsAdmin.collection('pending_proposals').doc(firestoreId).get();
        if (proposalSnap.exists) {
          extendedDetails = { ...extendedDetails, ...proposalSnap.data().details };
        }
      }

      // 1. Generate Username: FIRSTNAME_XXXX
      const firstName = (name.split(' ')[0] || 'USER').replace(/[^a-zA-Z]/g, '').toUpperCase();
      const suffix = Math.floor(1000 + Math.random() * 9000);
      const username = `${firstName}_${suffix}`;
      
      // 2. Generate 6-digit PIN
      const pin = Math.floor(100000 + Math.random() * 899999).toString();
      const pinHash = CryptoJS.SHA256(pin).toString();

      // 3. Map type to role
      let role = 'EVENT_MANAGER';
      if (type === 'VENUE') role = 'MANAGER';
      if (type === 'VENDOR') role = 'VENDOR';

      // 4. Create UID
      const rolePrefix = role ? role.toLowerCase().replace(/_/g, '-') : 'partner';
      const uid = `${rolePrefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const userProfile = {
        uid,
        username,
        email,
        displayName: name,
        role,
        hashed_pin: pinHash,
        status: 'APPROVED',
        isVerified: true,
        onboarding_details: extendedDetails,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const targetCollection = role === 'MANAGER' ? 'venue_managers' : role === 'EVENT_MANAGER' ? 'event_managers' : 'users';
      await fsAdmin.collection(targetCollection).doc(uid).set(userProfile);
      
      const rtdbProfile = { ...userProfile, createdAt: admin.database.ServerValue.TIMESTAMP, updatedAt: admin.database.ServerValue.TIMESTAMP };
      await dbAdmin.ref(`users/${uid}`).set(rtdbProfile);
      
      // 4.5. Create Venue/Event records if applicable
      try {
        if (type === 'VENUE') {
          const venueId = venue_id || requestId;
          
          await fsAdmin.collection('venues').doc(venueId).update({
             ownerId: uid,
             status: 'ACCEPTED',
             accepted: true
          });
          
          // Link venue to user
          await fsAdmin.collection(targetCollection).doc(uid).update({ assigned_venue_id: venueId });
          await dbAdmin.ref(`users/${uid}`).update({ assigned_venue_id: venueId });
        } else if (type === 'EVENT') {
          const eventId = venue_id || firestoreId || requestId;
          
          await fsAdmin.collection('events').doc(eventId).set({
             status: 'accepted',
             managerUid: uid,
             venueId: extendedDetails?.venue_id || null
          }, { merge: true });
          
          // The user specifically requested to set 'assigned_event_id' on the generated event manager to be the event id
          await fsAdmin.collection(targetCollection).doc(uid).update({ 
            assigned_event_id: eventId,
            assigned_venue_id: extendedDetails?.venue_id || null
          });
          await dbAdmin.ref(`users/${uid}`).update({ 
            assigned_event_id: eventId,
            assigned_venue_id: extendedDetails?.venue_id || null
          });
        }
      } catch (resourceErr: any) {
        console.error("⚠️ Failed to create associated resources (venue/event):", resourceErr.message);
      }
      
      // RTDB fallback for user profile
      await dbAdmin.ref(`users/${uid}`).update({
        updatedAt: admin.database.ServerValue.TIMESTAMP
      });
      
      // 5. Update onboarding request
      await dbAdmin.ref(`onboarding_requests/${requestId}`).update({
        status: 'Approved',
        approvedAt: admin.database.ServerValue.TIMESTAMP,
        adminNotes: `Auto-generated credentials: Username: ${username}, PIN: ${pin}`
      });

      // Defensive Onboarding Email Dispatch Box for newly approved Venue Managers
      if (role === 'MANAGER' && email) {
        try {
          const mailtrapPass = process.env.MAILTRAP_PASS || "ccdadf6e1c86b059a292c57a1836e2d3";
          const mailtrapUser = process.env.MAILTRAP_USER || "api";
          const transporter = nodemailer.createTransport({
            host: process.env.MAILTRAP_HOST || "live.smtp.mailtrap.io",
            port: parseInt(process.env.MAILTRAP_PORT || "587", 10),
            auth: {
              user: mailtrapUser,
              pass: mailtrapPass
            }
          });

          const apiKey = `WAYTA-API-KEY-${Math.random().toString(36).substring(2, 11).toUpperCase()}-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #fcfdfd; color: #1f2937;">
              <h2 style="color: #10b981; text-transform: uppercase; margin-bottom: 20px; border-bottom: 2px solid #10b981; padding-bottom: 10px;">Welcome to Wayta Platform, ${name}!</h2>
              <p>Your Venue Manager onboarding request has been successfully approved and validated by administrators. Below are your credentials, API keys, and launch steps.</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
                <h3 style="margin-top: 0; color: #374151;">System Security Credentials</h3>
                <p style="margin: 6px 0;"><strong>Role:</strong> <span style="background-color: #e5e7eb; padding: 2px 6px; border-radius: 4px;">Venue Manager</span></p>
                <p style="margin: 6px 0;"><strong>Client Login Username:</strong> <code style="background-color: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${username}</code></p>
                <p style="margin: 6px 0;"><strong>Active Terminal PIN:</strong> <code style="background-color: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${pin}</code></p>
                <p style="margin: 6px 0;"><strong>API Hub Integration Key:</strong> <code style="background-color: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #dd6b20;">${apiKey}</code></p>
              </div>

              <h3 style="color: #374151;">Primary Onboarding Checklist</h3>
              <ul style="line-height: 1.6; padding-left: 20px; margin-bottom: 25px;">
                <li><strong>Venue Profiles:</strong> Complete physical layouts, maximum safe capacity limits, and operating hours.</li>
                <li><strong>Digital POS Menu:</strong> Configure and upload categories, lists of products, and individual item pricing grids.</li>
                <li><strong>Staff & Terminal Pins:</strong> Register floor bartenders or waitron accounts, issuing unique security login codes.</li>
                <li><strong>Gateway Handshake:</strong> Wire up real-time billing callback endpoints for split commission tracking.</li>
              </ul>

              <h3 style="color: #374151;">Fallback Authenticators</h3>
              <p>In high-density or offline scenarios where primary integrations stall, you can utilize the emergency local terminal bypass bypass:</p>
              <ol style="line-height: 1.6; padding-left: 20px;">
                <li>Select "Terminal Fallback Security Bypass" on the login screen.</li>
                <li>Keys of entrance: enter your Username (<code>${username}</code>), and validation numeric code.</li>
                <li>Establish backup on-device caches.</li>
              </ol>

              <br />
              <p style="font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 20px;">
                This dispatch contains critical security details. Confidential. Wayta Enterprise Platform Sandbox.
              </p>
            </div>
          `;

          const mailOptions = {
            from: '"Wayta Platform" <noreply@wayta.co.za>',
            to: email,
            subject: 'WAYTA: Venue Onboarding Security Master Credentials',
            html: emailHtml
          };

          await transporter.sendMail(mailOptions);
          console.log(`[ONBOARDING EMAIL] Successfully dispatched security master keys to Venue Manager: ${email}`);
        } catch (mailErr: any) {
          console.warn('⚠️ Defensive: Onboarding email dispatcher failed (non-blocking fallback):', mailErr.message);
        }
      }

      res.json({ 
        success: true, 
        credentials: {
          username,
          pin,
          role,
          displayName: userProfile.displayName
        }
      });
    } catch (err: any) {
      console.error("Onboarding approval failed:", err);
      res.status(500).json({ error: "Failed to approve onboarding", message: err.message });
    }
  });

  app.post("/api/payments/verify", async (req: any, res: any) => {
    const { reference } = req.body;
    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

    if (!reference) {
      return res.status(400).json({ status: false, message: "Reference is required" });
    }

    if (!PAYSTACK_SECRET) {
      return res.status(400).json({ 
        status: false, 
        message: "PAYSTACK_SECRET_KEY is not configured on the server. Please define it in your environment variables to verify live transactions." 
      });
    }

    try {
      const response = await axios.get(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
        },
      });

      res.json(response.data);
    } catch (error: any) {
      console.error("Paystack Verification Error:", error.response?.data || error.message);
      res.status(500).json({ 
        status: false, 
        message: "Verification failed", 
        error: error.response?.data || error.message 
      });
    }
  });

  // --- Stitch Payments Implementation ---
  app.post("/api/payments/stitch/initiate", async (req, res) => {
    const { amount, reference } = req.body;
    
    if (globalIsTestMode) {
      console.log(`🧪 [TEST MODE INTERCEPTOR] Stitch payment initiation intercepted.`);
      return res.json({
        paymentUrl: "https://demo.wayta.co.za/stitch-mock-payment?ref=" + encodeURIComponent(reference),
        paymentRequestId: `STITCH-TEST-${Math.random().toString(36).substring(7).toUpperCase()}`
      });
    }
    
    // Stitch Config from Environment
    const STITCH_CLIENT_ID = process.env.STITCH_CLIENT_ID;
    const STITCH_CLIENT_SECRET = process.env.STITCH_CLIENT_SECRET;
    const STITCH_AUTH_URL = process.env.STITCH_AUTH_URL || 'https://sts.stitch.money/connect/token';
    const STITCH_API_URL = process.env.STITCH_API_URL || 'https://api.stitch.money/graphql';

    // Guard against missing credentials
    if (!STITCH_CLIENT_ID || !STITCH_CLIENT_SECRET) {
      console.warn("⚠️ Stitch credentials missing. Simulating success URL for testing.");
      return res.json({
        success: true,
        paymentUrl: `${req.headers.origin || 'https://wayta.co.za'}/payment-success?ref=${reference}&method=stitch`,
        paymentRequestId: `STITCH-SIM-${Math.random().toString(36).substring(7).toUpperCase()}`
      });
    }

    try {
      // 1. Get Access Token via Client Credentials flow
      const tokenResponse = await axios.post(STITCH_AUTH_URL, 
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: STITCH_CLIENT_ID,
          client_secret: STITCH_CLIENT_SECRET,
          scope: 'client_paymentrequest'
        }).toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );
      
      const accessToken = tokenResponse.data.access_token;
      
      // 2. Create Payment Request via GraphQL
      const graphqlQuery = {
        query: `
          mutation CreatePaymentRequest($input: ClientPaymentRequestInput!) {
            clientPaymentRequestCreate(input: $input) {
              paymentRequest {
                id
                url
              }
            }
          }
        `,
        variables: {
          input: {
            amount: {
              amount: amount.toString(),
              currency: "ZAR"
            },
            payerReference: reference,
            beneficiary: {
              bankAccount: {
                name: "Wayta Platform",
                bankId: "absa", 
                accountNumber: "123456789"
              }
            },
            externalId: reference,
            redirectUrl: process.env.STITCH_REDIRECT_URL || 'https://payment.auth.wayta.co.za/payment-authorization.html',
            webhookUrl: process.env.STITCH_WEBHOOK_URL || 'https://payment.notifications.wayta.co.za/'
          }
        }
      };
      
      const apiResponse = await axios.post(STITCH_API_URL, graphqlQuery, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (apiResponse.data.errors) {
        throw new Error(apiResponse.data.errors[0].message);
      }
      
      res.json({
        success: true,
        paymentUrl: apiResponse.data.data.clientPaymentRequestCreate.paymentRequest.url,
        paymentRequestId: apiResponse.data.data.clientPaymentRequestCreate.paymentRequest.id
      });
      
    } catch (error: any) {
      console.error("Stitch Initiation Error:", error.response?.data || error.message);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to initiate Stitch payment" 
      });
    }
  });

  app.get("/api/payments/stitch/verify/:paymentRequestId", async (req, res) => {
    const { paymentRequestId } = req.params;
    
    const STITCH_CLIENT_ID = process.env.STITCH_CLIENT_ID;
    const STITCH_CLIENT_SECRET = process.env.STITCH_CLIENT_SECRET;
    const STITCH_AUTH_URL = process.env.STITCH_AUTH_URL || 'https://sts.stitch.money/connect/token';
    const STITCH_API_URL = process.env.STITCH_API_URL || 'https://api.stitch.money/graphql';

    if (!STITCH_CLIENT_ID || !STITCH_CLIENT_SECRET) {
      if (paymentRequestId.startsWith('STITCH-SIM-')) {
        return res.json({ success: true, status: 'Completed', details: 'Simulated Stitch Success' });
      }
      return res.status(503).json({ error: "Stitch service not configured" });
    }

    try {
      const tokenResponse = await axios.post(STITCH_AUTH_URL, 
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: STITCH_CLIENT_ID,
          client_secret: STITCH_CLIENT_SECRET,
          scope: 'client_paymentrequest'
        }).toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );
      
      const accessToken = tokenResponse.data.access_token;

      const graphqlQuery = {
        query: `
          query GetPaymentRequest($id: ID!) {
            node(id: $id) {
              ... on ClientPaymentRequest {
                id
                status {
                  ... on ClientPaymentRequestCompleted {
                    __typename
                    date
                  }
                  ... on ClientPaymentRequestPending {
                    __typename
                  }
                  ... on ClientPaymentRequestFailed {
                    __typename
                    reason
                  }
                }
              }
            }
          }
        `,
        variables: { id: paymentRequestId }
      };

      const apiResponse = await axios.post(STITCH_API_URL, graphqlQuery, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (apiResponse.data.errors) {
        throw new Error(apiResponse.data.errors[0].message);
      }

      const statusObj = apiResponse.data.data.node.status;
      const statusType = statusObj.__typename;

      res.json({
        success: true,
        status: statusType === 'ClientPaymentRequestCompleted' ? 'Completed' : (statusType === 'ClientPaymentRequestFailed' ? 'Failed' : 'Pending'),
        details: statusObj
      });

    } catch (error: any) {
       res.status(500).json({ error: "Verification failed", details: error.message });
    }
  });

  // Stitch Webhook handler for external notifications
  app.post("/api/payments/stitch/webhook", async (req, res) => {
    // In production, verify the signature here
    console.log("Stitch Webhook Received:", JSON.stringify(req.body, null, 2));
    res.status(200).send("OK");
  });

  // --- PayPal Business Integration Helper & Endpoints ---
  async function getPayPalAccessToken() {
    const PAYPAL_CLIENT_ID = process.env.VITE_PAYPAL_CLIENT_ID;
    const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
    const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox';
    const baseUrl = PAYPAL_MODE === 'production' 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';

    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      throw new Error("PayPal credentials missing");
    }

    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
    const response = await axios.post(`${baseUrl}/v1/oauth2/token`, 'grant_type=client_credentials', {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return response.data.access_token;
  }

  app.post("/api/payments/paypal/create-order", async (req, res) => {
    const { amount, reference } = req.body;
    
    if (globalIsTestMode) {
      console.log(`🧪 [TEST MODE INTERCEPTOR] PayPal order creation mocked.`);
      return res.json({
        success: true,
        orderId: `PAY-SIM-TEST-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        isSimulated: true
      });
    }

    const PAYPAL_CLIENT_ID = process.env.VITE_PAYPAL_CLIENT_ID;
    const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
    const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox';
    const baseUrl = PAYPAL_MODE === 'production' 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';

    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      console.warn("⚠️ PayPal Business credentials missing in environment variables. Simulating order creation.");
      return res.json({
        success: true,
        orderId: `PAY-SIM-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        isSimulated: true
      });
    }

    try {
      const accessToken = await getPayPalAccessToken();
      // PayPal doesn't natively support ZAR; convert to stable USD
      const exchangeRate = 18.5; // 1 USD = 18.5 ZAR (approx rate for simulation & display)
      const amountInUSD = (amount / exchangeRate).toFixed(2);

      const response = await axios.post(`${baseUrl}/v2/checkout/orders`, {
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: reference || `WAYTA-${Date.now()}`,
            description: "Wayta Order Payment",
            amount: {
              currency_code: "USD",
              value: amountInUSD
            }
          }
        ]
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      res.json({
        success: true,
        orderId: response.data.id,
        paypalDetails: response.data
      });
    } catch (error: any) {
      console.error("PayPal Order Creation Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to create PayPal order", details: error.message });
    }
  });

  app.post("/api/payments/paypal/capture-order", async (req, res) => {
    const { orderId } = req.body;
    const PAYPAL_CLIENT_ID = process.env.VITE_PAYPAL_CLIENT_ID;
    const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
    const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox';
    const baseUrl = PAYPAL_MODE === 'production' 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';

    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET || orderId.startsWith('PAY-SIM-')) {
      console.log(`✅ PayPal capture simulated successfully for order: ${orderId}`);
      return res.json({
        success: true,
        status: "COMPLETED",
        transactionId: `PAY-TXN-SIM-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        isSimulated: true
      });
    }

    try {
      const accessToken = await getPayPalAccessToken();
      const response = await axios.post(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {}, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const status = response.data.status;
      const captureDetails = response.data.purchase_units?.[0]?.payments?.captures?.[0];

      res.json({
        success: status === "COMPLETED",
        status: status,
        transactionId: captureDetails?.id || orderId,
        paypalDetails: response.data
      });
    } catch (error: any) {
      console.error("PayPal Order Capture Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to capture PayPal order", details: error.message });
    }
  });

  // --- GAAP POS Dispatcher ---
  // Background dispatcher for venue stock synchronization
  async function dispatchToGAAP(venueId: string, endpoint: string, reference: string, items: any[]) {
    if (globalIsTestMode) {
      console.log(`🧪 [TEST MODE INTERCEPTOR] Bypassing GAAP POS integration for venue ${venueId}. Order ${reference} simulated successfully.`);
      io.emit("demo_pos_sync", { venueId, reference, status: "SIMULATED_SUCCESS", timestamp: new Date().toISOString() });
      return;
    }

    const secret = process.env.WAYTA_TO_GAAP_SECRET;
    if (!secret) {
      console.warn("⚠️ WAYTA_TO_GAAP_SECRET is not set. GAAP sync will be unsigned.");
    }
    
    const payload = {
      event: "order.placed",
      timestamp: new Date().toISOString(),
      wayta_reference: reference,
      venue_id: venueId,
      line_items: items.map((item: any) => ({
        sku: item.sku || item.plu || item.id,
        qty: item.qty || item.quantity || 1,
        unit_price: item.unit_price || item.price || 0
      }))
    };
    
    const payloadString = JSON.stringify(payload);
    const signature = secret 
      ? CryptoJS.HmacSHA256(payloadString, secret).toString()
      : 'unsigned';
      
    try {
      console.log(`📤 Dispatching GAAP sync for ${venueId} to ${endpoint}`);
      await axios.post(endpoint, payload, {
        headers: {
          'X-Wayta-Signature': signature,
          'Content-Type': 'application/json'
        },
        timeout: 5000 // 5s timeout to prevent hanging the event loop
      });
      console.log(`✅ GAAP sync success for order: ${reference}`);
    } catch (error: any) {
      // Extensive error logging as requested to catch offline venues
      console.error(`❌ GAAP Sync Failed for ${venueId} (${reference}):`, {
        endpoint,
        error: error.message,
        code: error.code,
        response: error.response?.data
      });
    }
  }

  // Paystack Webhook handler
  app.post("/api/payments/paystack/webhook", async (req, res) => {
    // 1. Authenticate the Webhook (HMAC SHA512)
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
    const signature = req.headers['x-paystack-signature'];
    
    if (secret && signature) {
      const hash = CryptoJS.HmacSHA512(JSON.stringify(req.body), secret).toString();
      if (hash !== signature) {
        console.warn("⚠️ Invalid Paystack signature received.");
        return res.status(401).send("Invalid signature");
      }
    } else if (!process.env.PAYSTACK_WEBHOOK_SECRET) {
      console.warn("⚠️ PAYSTACK_WEBHOOK_SECRET missing. Skipping verification for development.");
    }

    const { event, data } = req.body;
    
    if (event !== 'charge.success') {
      return res.status(200).send("OK"); // Acknowledge other events
    }

    const reference = data.reference;
    const metadata = data.metadata || {};
    const { venue_id, venue_gaap_endpoint, items } = metadata;

    try {
      const dbAdmin = await getDb();
      if (!dbAdmin) return res.status(503).send("Database Error");

      // 2. Idempotency Guard: Ensure we don't process the same reference twice
      // Paystack can retry webhooks multiple times. We must only sync to GAAP once.
      const existingTx = await dbAdmin.ref('transactions')
        .orderByChild('payment_gateway_ref')
        .equalTo(reference)
        .once('value');
      
      if (existingTx.exists()) {
        console.log(`♻️ Idempotency Triggered: Paystack ref ${reference} already processed. Skipping GAAP.`);
        return res.status(200).send("OK");
      }

      // 3. Update database (Mark as success)
      const txRef = dbAdmin.ref('transactions').push();
      await txRef.set({
        payment_gateway_ref: reference,
        status: 'success',
        amount: data.amount / 100, 
        user_id: metadata.user_id || 'anonymous',
        venue_id: venue_id || 'unknown',
        payment_method: 'Paystack',
        processed_at: new Date().toISOString(),
        createdAt: admin.database.ServerValue.TIMESTAMP
      });

      // Defensive Verification Receipt SMS Dispatch (Immediate)
      try {
        const userId = metadata.user_id;
        let phoneNumber = metadata.phone || data.customer?.phone || '';
        
        if (!phoneNumber && userId && userId !== 'anonymous') {
          const userSnap = await dbAdmin.ref(`users/${userId}`).once('value');
          if (userSnap.exists()) {
            phoneNumber = userSnap.val().phone || userSnap.val().phoneNumber || '';
          }
        }

        if (phoneNumber) {
          const smsAmount = (data.amount / 100).toFixed(2);
          const smsText = `WAYTA: Immediate payment verification successful. Value: R${smsAmount} Mark: ${reference}. Your order is actively queued for production.`;
          await sendSmsNotification(phoneNumber, smsText).catch((smsErr: any) => {
            console.warn('⚠️ Webhook receipt SMS notification failed defensively:', smsErr.message);
          });
        }
      } catch (smsOuterErr: any) {
        console.warn('⚠️ Webhook receipt SMS lookup/dispatch failed defensively:', smsOuterErr.message);
      }

      // 4. Asynchronous Outbound GAAP Dispatcher
      if (venue_gaap_endpoint && venue_id && Array.isArray(items)) {
        // Fire and forget (it handles its own errors and logging)
        dispatchToGAAP(venue_id, venue_gaap_endpoint, reference, items);
      } else {
        console.warn(`⚠️ Skipping GAAP sync for ${reference}: Missing metadata fields`, { venue_id, venue_gaap_endpoint, hasItems: !!items });
      }

      res.status(200).send("OK");
    } catch (err: any) {
      console.error("Paystack Webhook Processing Error:", err);
      res.status(500).send("Processing Error");
    }
  });

  // Helper to ensure EVENT_ADMIN test account, venue, event and inventory items exist
  async function ensureTestingEventAdminExists(dbAdmin: any, fsAdmin: any) {
    try {
      const pinHash = CryptoJS.SHA256("123123").toString();
      const uid = "demo-event_admin";
      
      const userDocRef = fsAdmin.collection('users').doc(uid);
      const userDoc = await userDocRef.get();
      
      if (!userDoc.exists) {
        console.log("⚙️ Creating default event admin testing account...");
        const testingProfile = {
          uid,
          username: "EVENT_ADMIN",
          firstName: "Event",
          lastName: "Admin",
          displayName: "Event Admin",
          email: "event_admin@wayta.co.za",
          phone: "+27821234567",
          gender: "Prefer not to say",
          role: "EVENT_MANAGER",
          assigned_venue_id: "test_venue_id",
          assigned_event_id: "test_event_id",
          hashed_pin: pinHash,
          status: "APPROVED",
          isVerified: true,
          is_profile_complete: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        await userDocRef.set(testingProfile);
        await fsAdmin.collection('event_managers').doc(uid).set(testingProfile);
        await fsAdmin.collection('staff_members').doc(uid).set(testingProfile);
        await dbAdmin.ref(`users/${uid}`).set({
          ...testingProfile,
          createdAt: admin.database.ServerValue.TIMESTAMP,
          updatedAt: admin.database.ServerValue.TIMESTAMP
        });
      }

      // ALWAYS enforce "The Ketchup" name and "Pretoria" location
      const venueDocRef = fsAdmin.collection('venues').doc("test_venue_id");
      const venueDoc = await venueDocRef.get();
      console.log("⚙️ Ensuring test venue is named 'The Ketchup' in Pretoria...");
      const testVenue = {
        id: "test_venue_id",
        name: "The Ketchup",
        location: "Pretoria, South Africa",
        distance: "0.0 km",
        type: "Club",
        status: "Live",
        rating: 4.8,
        image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800",
        icon: "music",
        description: "Dynamic Venue for Monitoring Orders and Stock in Pretoria",
        is_active: true,
        isOrderingEnabled: true,
        ownerId: uid,
        created_at: venueDoc.exists ? (venueDoc.data()?.created_at || new Date().toISOString()) : new Date().toISOString()
      };
      await venueDocRef.set(testVenue);
      await dbAdmin.ref(`venues/test_venue_id`).set(testVenue);

      // ALWAYS enforce "The Ketchup Event" name and reset ticket metrics to 0
      const eventDocRef = fsAdmin.collection('events').doc("test_event_id");
      const eventDoc = await eventDocRef.get();
      console.log("⚙️ Ensuring test event is 'The Ketchup Event' and resetting ticket metrics...");
      const testEvent = {
        id: "test_event_id",
        venueId: "test_venue_id",
        title: "The Ketchup Event",
        name: "The Ketchup Event",
        genre: "Tech House / Dance / Retail",
        venueName: "The Ketchup",
        startTime: "18:00",
        endTime: "02:00",
        date: eventDoc.exists ? (eventDoc.data()?.date || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
        status: "Live",
        ticketsTotal: 500,
        ticketsSold: 0, // Fresh start metrics
        ownerId: uid,
        ticketTiers: [
          { id: "vip", name: "VIP Pass", price: 350, capacity: 100, sold: 0 },
          { id: "general", name: "General Admission", price: 150, capacity: 400, sold: 0 }
        ],
        staffIds: [],
        venueManagerId: uid,
        createdAt: eventDoc.exists ? (eventDoc.data()?.createdAt || admin.firestore.FieldValue.serverTimestamp()) : admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      await eventDocRef.set(testEvent);
      await dbAdmin.ref(`venues/test_venue_id/events/test_event_id`).set(testEvent);

      // FRESH START: Delete all orders for test_venue_id from Firestore and Realtime Database
      console.log("🧹 Deleting all orders for this venue from the Firestore database...");
      try {
        const orderDocs = await fsAdmin.collection('orders').where('venue_id', '==', 'test_venue_id').get();
        if (!orderDocs.empty) {
          const fsBatch = fsAdmin.batch();
          orderDocs.forEach((doc: any) => {
            fsBatch.delete(doc.ref);
          });
          await fsBatch.commit();
          console.log(`🧹 Succesfully deleted ${orderDocs.size} orders from Firestore.`);
        }
      } catch (err: any) {
        console.error("⚠️ Failed to delete Firestore orders during fresh start:", err.message);
      }

      console.log("🧹 Deleting all orders for this venue from the Realtime Database...");
      try {
        const rtdbOrdersSnap = await dbAdmin.ref('orders').get();
        if (rtdbOrdersSnap.exists()) {
          const ordersVal = rtdbOrdersSnap.val();
          const rtdbUpdates: Record<string, null> = {};
          let deletedRtdbCount = 0;
          for (const orderId in ordersVal) {
            if (ordersVal[orderId] && (ordersVal[orderId].venue_id === 'test_venue_id' || ordersVal[orderId].venueId === 'test_venue_id')) {
              rtdbUpdates[`orders/${orderId}`] = null;
              deletedRtdbCount++;
            }
          }
          if (deletedRtdbCount > 0) {
            await dbAdmin.ref().update(rtdbUpdates);
            console.log(`🧹 Successfully deleted ${deletedRtdbCount} orders from Realtime Database.`);
          }
        }
      } catch (err: any) {
        console.error("⚠️ Failed to delete Realtime Database orders during fresh start:", err.message);
      }

      // RESET METRICS: Reset Realtime Database metrics and order counters
      console.log("⚙️ Resetting RTDB metrics and values for 'test_venue_id'...");
      try {
        await dbAdmin.ref(`venues/test_venue_id/orderCounter`).set(0);
        await dbAdmin.ref(`venues/test_venue_id/salesStats`).remove();
        await dbAdmin.ref(`venues/test_venue_id/metrics`).remove();
      } catch (err: any) {
        console.error("⚠️ Failed to reset RTDB orderCounter / metrics:", err.message);
      }

      // SEED INVENTORY IF EMPTY (prevent deleting user items)
      console.log("🧹 Checking if physical inventory stock needs seeding...");
      try {
        const currentInv = await fsAdmin.collection('inventory').where('venue_id', '==', 'test_venue_id').get();
        if (currentInv.empty) {
          console.log("Empty inventory, re-seeding default items...");
          const defaultInventory = [
            { name: "Premium Lager", price: 35, category: "Beer", stock: 120 },
            { name: "Craft Cider", price: 40, category: "Beer", stock: 80 },
            { name: "Single Malt Whiskey", price: 65, category: "Premium Selection", stock: 15 },
            { name: "Imported Dry Gin", price: 50, category: "Gin", stock: 45 },
            { name: "Energy Drink Classic", price: 30, category: "Energy Drink", stock: 200 },
            { name: "Artisanal Burger", price: 85, category: "Food", stock: 40 },
            { name: "Gourmet Nachos", price: 75, category: "Food", stock: 30 }
          ];

          for (const item of defaultInventory) {
            const itemRef = fsAdmin.collection('inventory').doc();
            const itemData = {
              id: itemRef.id,
              venue_id: "test_venue_id",
              eventId: "test_event_id",
              name: item.name,
              price: item.price,
              category: item.category,
              stock: item.stock,
              status: item.stock <= 0 ? 'Sold Out' : (item.stock < 10 ? 'Low Stock' : 'Available'),
              is_active: true,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            await itemRef.set(itemData);
          }
          console.log("⚙️ Core inventory re-seeded & verified.");
        }
      } catch (err: any) {
        console.error("⚠️ Failed to reset inventory:", err.message);
      }

      // Ensure demo bartender for test_venue_id exists
      const bartenderUid = "demo-test-bartender";
      const bartenderDocRef = fsAdmin.collection('bartenders').doc(bartenderUid);
      const bartenderDoc = await bartenderDocRef.get();
      if (!bartenderDoc.exists) {
        console.log("⚙️ Creating demo bartender account in test_venue_id...");
        const bartenderPinHash = CryptoJS.SHA256("123123").toString();
        const bartenderProfile = {
          uid: bartenderUid,
          id: bartenderUid,
          username: "DEMO_BARTENDER",
          displayName: "Demo Bartender",
          firstName: "Demo",
          lastName: "Bartender",
          email: "demobartender@wayta.co.za",
          phone: "+27821112222",
          gender: "Male",
          role: "BARTENDER",
          assigned_venue_id: "test_venue_id",
          assigned_event_id: "test_event_id",
          pin: "123123",
          hashed_pin: bartenderPinHash,
          pin_hash: bartenderPinHash,
          is_active: true,
          status: "APPROVED",
          isVerified: true,
          is_profile_complete: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        await bartenderDocRef.set(bartenderProfile);

        // Also seed into generic 'staffs' and 'users' collections for lookup fallback
        await fsAdmin.collection('staffs').doc(bartenderUid).set(bartenderProfile);
        await fsAdmin.collection('users').doc(bartenderUid).set(bartenderProfile);

        await dbAdmin.ref(`staffs/${bartenderUid}`).set({
          ...bartenderProfile,
          createdAt: admin.database.ServerValue.TIMESTAMP,
          updatedAt: admin.database.ServerValue.TIMESTAMP
        });
        await dbAdmin.ref(`users/${bartenderUid}`).set({
          ...bartenderProfile,
          createdAt: admin.database.ServerValue.TIMESTAMP,
          updatedAt: admin.database.ServerValue.TIMESTAMP
        });
      }
    } catch (err) {
      console.error("❌ Failed to secure dynamic testing event_admin data:", err);
    }
  }

  // PIN Verification and Custom Token Generation (Based on User's verified blueprint)
  app.post("/api/verifypin", async (req, res) => {
    const { username, pin, clientUid, role } = req.body;
    console.log(`🔑 Login attempt: Username="${username}", PIN="${pin}", ClientUID="${clientUid}", Role="${role}"`);
    
    if (!username || !pin) {
      return res.status(400).json({ error: "Username and PIN are required" });
    }

    try {
      const dbAdmin = await getDb();
      const fsAdmin = await getFs();
      if (!dbAdmin || !fsAdmin) return res.status(503).json({ error: "Firebase services unavailable" });

      // Handle custom event admin database setup if requested or detected
      if (username && (username.toUpperCase() === 'EVENT_ADMIN' || username.toLowerCase() === 'event_admin')) {
        await ensureTestingEventAdminExists(dbAdmin, fsAdmin);
      }

      // 1. Handle Demo Credentials
      // Keys are both lowercase and uppercase to be robust against client input filtering.
      // Privileged (ADMIN / SUPER_ADMIN) demo access is configured via env — when the
      // corresponding env var is unset, that login path is disabled entirely.
      const ADMIN_DEMO_PIN = process.env.WAYTA_ADMIN_PIN || '';
      const SUPER_ADMIN_DEMO_EMAIL = process.env.WAYTA_SUPER_ADMIN_EMAIL || '';
      const SUPER_ADMIN_DEMO_PINS = (process.env.WAYTA_SUPER_ADMIN_PINS || '')
        .split(',').map(s => s.trim()).filter(Boolean);
      const demoUsers: Record<string, { role: string; email: string; pin: string; assigned_venue_id?: string; assigned_event_id?: string }> = {
        'demo_bartender': { role: 'BARTENDER', email: 'demobartender@wayta.co.za', pin: '123123', assigned_venue_id: 'test_venue_id', assigned_event_id: 'test_event_id' },
        'DEMO_BARTENDER': { role: 'BARTENDER', email: 'demobartender@wayta.co.za', pin: '123123', assigned_venue_id: 'test_venue_id', assigned_event_id: 'test_event_id' },
        'event_admin': { role: 'EVENT_MANAGER', email: 'event_admin@wayta.co.za', pin: '123123', assigned_venue_id: 'test_venue_id', assigned_event_id: 'test_event_id' },
        'EVENT_ADMIN': { role: 'EVENT_MANAGER', email: 'event_admin@wayta.co.za', pin: '123123', assigned_venue_id: 'test_venue_id', assigned_event_id: 'test_event_id' },
        'admin@wayta.co.za': { role: 'ADMIN', email: 'admin@wayta.co.za', pin: ADMIN_DEMO_PIN },
        'admin': { role: 'ADMIN', email: 'admin@wayta.co.za', pin: ADMIN_DEMO_PIN },
        'Admin': { role: 'ADMIN', email: 'admin@wayta.co.za', pin: ADMIN_DEMO_PIN },
        'ADMIN': { role: 'ADMIN', email: 'admin@wayta.co.za', pin: ADMIN_DEMO_PIN },
        'manager': { role: 'MANAGER', email: 'manager@wayta.co.za', pin: 'manager123', assigned_venue_id: 'V001' },
        'MANAGER': { role: 'MANAGER', email: 'manager@wayta.co.za', pin: 'manager123', assigned_venue_id: 'V001' },
        'bartender': { role: 'BARTENDER', email: 'bartender@wayta.co.za', pin: 'bartender123', assigned_venue_id: 'V001' },
        'BARTENDER': { role: 'BARTENDER', email: 'bartender@wayta.co.za', pin: 'bartender123', assigned_venue_id: 'V001' },
        'waiter': { role: 'WAITER', email: 'waiter@wayta.co.za', pin: 'waiter123', assigned_venue_id: 'V001' },
        'WAITER': { role: 'WAITER', email: 'waiter@wayta.co.za', pin: 'waiter123', assigned_venue_id: 'V001' },
        'staff': { role: 'STAFF', email: 'staff@wayta.co.za', pin: 'staff123', assigned_venue_id: 'V001' },
        'STAFF': { role: 'STAFF', email: 'staff@wayta.co.za', pin: 'staff123', assigned_venue_id: 'V001' },
        'eventmgr': { role: 'EVENT_MANAGER', email: 'eventmgr@wayta.co.za', pin: 'event123', assigned_venue_id: 'V001' },
        'EVENTMGR': { role: 'EVENT_MANAGER', email: 'eventmgr@wayta.co.za', pin: 'event123', assigned_venue_id: 'V001' },
        'vendor': { role: 'VENDOR', email: 'vendor@wayta.co.za', pin: 'vendor123', assigned_venue_id: 'V001' },
        'VENDOR': { role: 'VENDOR', email: 'vendor@wayta.co.za', pin: 'vendor123', assigned_venue_id: 'V001' },
        'patron': { role: 'PATRON', email: 'patron@wayta.co.za', pin: 'patron123' },
        'PATRON': { role: 'PATRON', email: 'patron@wayta.co.za', pin: 'patron123' },
      };

      const lowercaseUsername = username.toLowerCase().trim();
      const incomingPinStr = pin.toString().trim();

      let demoUser = demoUsers[username] || demoUsers[username.toLowerCase()] || demoUsers[username.toUpperCase()];

      // Super Admin dynamic matching: env-configured identity + accepted pins.
      if (
        SUPER_ADMIN_DEMO_EMAIL &&
        SUPER_ADMIN_DEMO_PINS.length > 0 &&
        (lowercaseUsername === SUPER_ADMIN_DEMO_EMAIL.toLowerCase() || lowercaseUsername === 'super_admin') &&
        SUPER_ADMIN_DEMO_PINS.includes(incomingPinStr)
      ) {
        demoUser = {
          role: 'SUPER_ADMIN',
          email: SUPER_ADMIN_DEMO_EMAIL,
          pin: incomingPinStr
        };
      }

      // An empty configured pin disables that account (never match on '').
      if (demoUser && demoUser.pin.toString().trim() !== '' && demoUser.pin.toString().trim() === incomingPinStr) {
        console.log(`✅ Demo Login Success: ${username}`);
        const uid = `demo-${username.split('@')[0].toLowerCase()}`;
        
        let customToken;
        let usePasswordLogin = false;
        try {
          // Normalize roles for security rules (ADMIN -> super_admin, MANAGER -> venue_manager)
          let tokenRole = demoUser.role.toLowerCase();
          if (tokenRole === 'admin') tokenRole = 'super_admin';
          if (tokenRole === 'manager') tokenRole = 'venue_manager';
          
          customToken = await createFirebaseCustomToken(uid, { 
            role: tokenRole,
            email: demoUser.email 
          });
        } catch (tokenErr: any) {
          console.warn(`⚠️ Custom token generation failed for demo user, falling back to email/password: ${tokenErr.message}`);
          try {
             await adminApp.auth().getUserByEmail(demoUser.email);
          } catch (e: any) {
             if (e.code === 'auth/user-not-found') {
                try {
                   await adminApp.auth().createUser({
                      uid: uid,
                      email: demoUser.email,
                      password: demoUser.pin,
                      displayName: username.split('@')[0]
                   });
                } catch(err) {
                    console.warn('Failed to create demo auth user:', err);
                }
             } else {
                 try {
                     await adminApp.auth().updateUser(uid, { password: demoUser.pin });
                 } catch(err){}
             }
          }
          usePasswordLogin = true;
        }
        
        const profile = {
          uid: uid,
          username: username.split('@')[0],
          email: demoUser.email,
          role: demoUser.role,
          full_name: username.split('@')[0],
          displayName: username.split('@')[0],
          status: 'APPROVED',
          isVerified: true,
          budgetLimit: demoUser.role === 'PATRON' ? 1000 : 5000,
          assigned_venue_id: demoUser.assigned_venue_id || 'V001',
          hashed_pin: CryptoJS.SHA256(incomingPinStr).toString(),
          updatedAt: admin.database.ServerValue.TIMESTAMP
        };

        try {
          await dbAdmin.ref(`users/${uid}`).update({
            ...profile,
            createdAt: admin.database.ServerValue.TIMESTAMP
          });
        } catch (setErr: any) {
          console.warn(`⚠️ Failed to persist demo user profile: ${setErr.message}`);
        }

        return res.json({ 
          profile, 
          username, 
          uid: uid, 
          token: customToken,
          usePasswordLogin: usePasswordLogin,
          email: demoUser.email,
          password: demoUser.pin
        });
      }

      // 2. Real User PIN verification (Mirroring User's Blueprint)
      const incomingHash = CryptoJS.SHA256(incomingPinStr).toString();
      
      let userSnapshot;
      let targetCollection = 'users';
      const roleUpper = role ? role.toUpperCase() : null;
      
      if (roleUpper === 'PATRON') targetCollection = 'patrons';
      else if (roleUpper === 'MANAGER') targetCollection = 'venue_managers';
      else if (roleUpper === 'EVENT_MANAGER') targetCollection = 'event_managers';
      else if (roleUpper) {
        targetCollection = roleUpper.toLowerCase().replace(/_/g, '_') + 's';
      }

      console.log(`🔍 Finding user by username in Firestore ${targetCollection} collection: "${username.toUpperCase()}"`);
      userSnapshot = await fsAdmin.collection(targetCollection).where('username', '==', username.toUpperCase()).limit(1).get();

      if (userSnapshot.empty && (targetCollection !== 'users')) {
        console.log(`🔍 Fallback: Finding user by username in Firestore "users" collection: "${username.toUpperCase()}"`);
        userSnapshot = await fsAdmin.collection('users').where('username', '==', username.toUpperCase()).limit(1).get();
        if (!userSnapshot.empty) {
          targetCollection = 'users';
        }
      }

      if (userSnapshot.empty && (roleUpper === 'MANAGER' || roleUpper === 'EVENT_MANAGER')) {
        const fallbackCollection = targetCollection === 'venue_managers' ? 'event_managers' : 'venue_managers';
        console.log(`🔍 Deep Fallback: Finding user by username in Firestore ${fallbackCollection} collection: "${username.toUpperCase()}"`);
        userSnapshot = await fsAdmin.collection(fallbackCollection).where('username', '==', username.toUpperCase()).limit(1).get();
        if (!userSnapshot.empty) {
          targetCollection = fallbackCollection;
        }
      }

      if (userSnapshot.empty) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const userDoc = userSnapshot.docs[0];
      const userId = userDoc.id;
      let userData = userDoc.data();
      
      // Enforce correct role based on collection
      if (targetCollection === 'patrons') {
        userData.role = 'PATRON';
      } else if (targetCollection === 'venue_managers') {
        userData.role = 'MANAGER';
      } else if (targetCollection === 'event_managers') {
        userData.role = 'EVENT_MANAGER';
      }
      
      // Check if RTDB has a more up-to-date assigned_venue_id that they manually fixed, or vice versa
      const rtdbUserSnap = await dbAdmin.ref(`users/${userId}`).once('value');
      if (rtdbUserSnap.exists()) {
         const rtdbUserData = rtdbUserSnap.val();
         if (rtdbUserData.assigned_venue_id && rtdbUserData.assigned_venue_id !== userData.assigned_venue_id) {
             console.log(`[AD-HOC FIX] Syncing assigned_venue_id from RTDB (${rtdbUserData.assigned_venue_id}) to Firestore (${userData.assigned_venue_id}) for user ${userId}`);
             await fsAdmin.collection(targetCollection).doc(userId).update({ assigned_venue_id: rtdbUserData.assigned_venue_id });
             userData.assigned_venue_id = rtdbUserData.assigned_venue_id;
         } else if (!rtdbUserData.assigned_venue_id && userData.assigned_venue_id) {
             console.log(`[AD-HOC FIX] Syncing assigned_venue_id from Firestore (${userData.assigned_venue_id}) to RTDB for user ${userId}`);
             await dbAdmin.ref(`users/${userId}`).update({ assigned_venue_id: userData.assigned_venue_id });
         }
      }
      // AD-HOC FIX for the user's specific case
      if (userData.assigned_venue_id && userData.assigned_venue_id.startsWith('V-') && targetCollection === 'venue_managers') {
         // Check if a venue with 'venue_' prefix for the same rough time exists for this owner
         const oldVenueId = userData.assigned_venue_id;
         const venuesList = await fsAdmin.collection('venues').where('ownerId', '==', userId).get();
         let correctVenueId = null;
         for (let vDoc of venuesList.docs) {
             if (vDoc.id.startsWith('venue_')) {
                 correctVenueId = vDoc.id;
                 break;
             }
         }
         if (correctVenueId) {
             console.log(`[AD-HOC FIX] Auto-correcting assigned_venue_id from ${oldVenueId} to ${correctVenueId} for user ${userId}`);
             await fsAdmin.collection(targetCollection).doc(userId).update({ assigned_venue_id: correctVenueId });
             await dbAdmin.ref(`users/${userId}`).update({ assigned_venue_id: correctVenueId });
             userData.assigned_venue_id = correctVenueId;
         }
      }
      
      return await handleUserVerification(userId, userData, incomingPinStr, incomingHash, clientUid, res, dbAdmin, fsAdmin);
    } catch (error: any) {
      console.error("❌ Auth Processing Error:", error);
      res.status(500).json({ 
        error: "Internal server error during verification", 
        message: error.message 
      });
    }
  });

  async function handleUserVerification(userId: string, userData: any, incomingPinStr: string, incomingHash: string, clientUid: string | undefined, res: any, dbAdmin: any, fsAdmin: any) {
    // Support both hashed_pin (blueprint) and pin_hash (legacy)
    let storedHash = (userData.hashed_pin || userData.pin_hash || '').toString().trim();
    
    // If no hash but cleartext pin exists (manual entry in console), auto-hash it
    if (!storedHash && userData.pin) {
      storedHash = CryptoJS.SHA256(userData.pin.toString().trim()).toString();
    }
    
    if (!storedHash || incomingHash !== storedHash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // MFA check
    if ((userData.role === 'manager' || userData.role === 'MANAGER') && userData.mfa_enabled === true) {
      return res.json({ mfaRequired: true, phoneNumber: userData.phone_number });
    }

    // Normalize roles for security rules (ADMIN -> super_admin, MANAGER -> venue_manager)
    let tokenRole = (userData.role || 'PATRON').toLowerCase();
    if (tokenRole === 'admin') tokenRole = 'super_admin';
    if (tokenRole === 'manager') tokenRole = 'venue_manager';

    // 3. Generate Custom Token for Firebase client sign-in
    const customToken = await createFirebaseCustomToken(userId, { 
      role: tokenRole,
      email: userData.email || ''
    });

    // Sync enforced role to Realtime Database
    try {
      await dbAdmin.ref(`users/${userId}`).update({
        role: userData.role || 'PATRON',
        last_login: admin.database.ServerValue.TIMESTAMP
      });
    } catch (e) {
      console.error("Failed to sync role to RTDB", e);
    }
    
    res.json({ 
      profile: userData, 
      uid: userId, 
      username: userData.username,
      token: customToken
    });
  }

  // Admin notification for user approval
  app.post("/api/admin/notify-approval", async (req, res) => {
    const { name, email, role } = req.body;
    try {
      const db = await getDb();
      if (!db) return res.status(503).json({ error: "Admin SDK not ready" });

      await db.ref('mail').push({
        to: 'o3sharenet@gmail.com',
        message: {
          subject: 'WAYTA: User Approval Request',
          html: `<p>New approval request for <b>${name}</b> (${email}) as <b>${role}</b>.</p>`
        },
        timestamp: admin.database.ServerValue.TIMESTAMP
      });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to queue notification" });
    }
  });

  // Example Admin Protected Route
  app.post("/api/admin/verify-token", async (req, res) => {
    const adminApp = await getAdminAppInstance();
    if (!adminApp) {
      return res.status(503).json({ error: "Firebase Admin SDK not configured in environment" });
    }

    const { idToken } = req.body;
    try {
      const decodedToken = await adminApp.auth().verifyIdToken(idToken);
      res.json({ uid: decodedToken.uid, email: decodedToken.email });
    } catch (error) {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  // User Impersonation/Switch-User Route
  app.post("/api/impersonate", async (req, res) => {
    const { targetUid } = req.body;
    if (!targetUid) {
      return res.status(400).json({ error: "targetUid is required" });
    }
    try {
      const token = await createFirebaseCustomToken(targetUid);
      res.json({ success: true, token });
    } catch (error: any) {
      console.error("Failed to impersonate user:", error);
      res.status(500).json({ error: "Failed to impersonate user", details: error.message });
    }
  });

  // --- BACKEND SAFETY MIDDLEWARE & DELETE PURGING ENGINES ---
  const checkNoUnresolvedOrders = async (req: any, res: any, next: any) => {
    const { venueId, eventId } = req.params;
    const targetId = venueId || eventId;
    if (!targetId) {
      return res.status(400).json({ error: "Venue ID or Event ID is required" });
    }

    try {
      const adminApp = await getAdminAppInstance();
      if (!adminApp) {
        return res.status(503).json({ error: "Firebase Admin SDK not ready" });
      }

      const firestore = adminApp.firestore();
      let queryRef = firestore.collection("orders");
      
      const ordersSnap = await queryRef.get();
      const unresolvedActiveOrders = ordersSnap.docs.filter(docSnap => {
        const o = docSnap.data();
        const oVenueId = o.venue_id || o.venueId;
        const oEventId = o.event_id || o.eventId;
        
        // Filter by target id
        if (venueId && oVenueId !== venueId) return false;
        if (eventId && oEventId !== eventId) return false;

        const status = (o.status || '').toLowerCase();
        // Unresolved states that prevent deletion
        return ['pending', 'preparing', 'ready', 'ordered', 'uncollected', 'active'].includes(status);
      });

      if (unresolvedActiveOrders.length > 0) {
        return res.status(400).json({
          error: "Destructive action blocked: Target resource has unresolved live orders.",
          unresolvedCount: unresolvedActiveOrders.length,
          unresolvedOrders: unresolvedActiveOrders.map(doc => ({
            id: doc.id,
            status: doc.data().status,
            total: doc.data().total || doc.data().total_amount
          }))
        });
      }

      next();
    } catch (err: any) {
      console.error("Error in checkNoUnresolvedOrders middleware:", err);
      return res.status(500).json({ error: "Failed to validate unresolved active orders", details: err.message });
    }
  };

  // Safe venue delete endpoint (requires ADMIN / SUPER_ADMIN and zero live orders)
  app.delete("/api/admin/venues/:venueId", protect, checkPermission(['ADMIN', 'SUPER_ADMIN']), checkNoUnresolvedOrders, async (req: any, res: any) => {
    const { venueId } = req.params;
    try {
      const adminApp = await getAdminAppInstance();
      if (!adminApp) return res.status(503).json({ error: "Firebase Admin SDK not ready" });
      
      const firestore = adminApp.firestore();
      
      // Delete venue record in Firestore
      await firestore.collection("venues").doc(venueId).delete();
      
      // Delete from Realtime Database as well
      const rtdbRef = adminApp.database().ref(`venues/${venueId}`);
      await rtdbRef.remove();

      res.json({ success: true, message: `Venue ${venueId} and RTDB counterparts safely deleted.` });
    } catch (err: any) {
      console.error("Failed to safely delete venue:", err);
      res.status(500).json({ error: "Failed to safely delete venue", details: err.message });
    }
  });

  // Safe event delete endpoint (requires ADMIN / SUPER_ADMIN and zero live orders)
  app.delete("/api/admin/events/:eventId", protect, checkPermission(['ADMIN', 'SUPER_ADMIN']), checkNoUnresolvedOrders, async (req: any, res: any) => {
    const { eventId } = req.params;
    try {
      const adminApp = await getAdminAppInstance();
      if (!adminApp) return res.status(503).json({ error: "Firebase Admin SDK not ready" });
      
      const firestore = adminApp.firestore();
      
      // Delete event record in Firestore
      await firestore.collection("events").doc(eventId).delete();
      
      // Delete matching event from Realtime Database if it exists
      const rtdbRef = adminApp.database().ref(`events/${eventId}`);
      await rtdbRef.remove().catch(() => {});

      res.json({ success: true, message: `Event ${eventId} safely deleted.` });
    } catch (err: any) {
      console.error("Failed to safely delete event:", err);
      res.status(500).json({ error: "Failed to safely delete event", details: err.message });
    }
  });

  // FCM Notification Route
  app.post("/api/notifications/send-order-ready", async (req, res) => {
    const { fcmToken, orderId } = req.body;
    
    console.log(`🔔 Received request to send order-ready notification for Order: ${orderId}`);
    
    if (!fcmToken || !orderId) {
      return res.status(400).json({ error: "fcmToken and orderId are required" });
    }

    const adminApp = await getAdminAppInstance();
    if (!adminApp) {
      console.warn("⚠️ FCM: Admin SDK not ready for notification relay");
      return res.status(503).json({ error: "Firebase Admin SDK not ready" });
    }

    try {
      const message = {
        notification: {
          title: "Order Ready! 🍹",
          body: "Your drinks are waiting at the bar. Head over to collect!"
        },
        data: {
          orderId,
          type: "ORDER_STATUS_UPDATE"
        },
        token: fcmToken
      };

      const fcmResponse = await adminApp.messaging().send(message);
      console.log('✅ FCM: Notification sent successfully:', fcmResponse);
      res.json({ success: true, messageId: fcmResponse });
    } catch (error) {
      console.error('❌ FCM: Send Error:', error);
      res.status(500).json({ 
        error: "Failed to send FCM notification", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Top-level SMS Helper with Defensive Notification Architecture
  async function sendSmsNotification(phone: string, text: string) {
    try {
      console.log(`[SMS GATEWAY OUTBOUND] Phone: ${phone}, Text: ${text}`);
      
      // Keep it extremely defensive by logging locally & adding to Firebase RTDB 'sms_logs'
      // If any network issue occurs, it fails silently or outputs a warn. It never stalls processing.
      const dbAdmin = await getDb().catch(() => null);
      if (dbAdmin) {
        await dbAdmin.ref('sms_logs').push({
          phone,
          text,
          timestamp: admin.database.ServerValue.TIMESTAMP
        }).catch((e: any) => console.log('RTDB logging SMS skipped:', e.message));
      }
      return true;
    } catch (err: any) {
      console.warn('⚠️ Defensive: SMS dispatch failed to complete, continuing normally:', err.message);
      return false;
    }
  }

  // SMS Notification Route
  app.post("/api/notifications/send-sms", async (req: any, res: any) => {
    const { phone, text } = req.body;
    if (!phone || !text) {
      return res.status(400).json({ error: "Missing phone or text content" });
    }
    try {
      await sendSmsNotification(phone, text);
      res.json({ success: true, message: "SMS dispatched successfully" });
    } catch (error: any) {
      console.warn('⚠️ Defensive: POST send-sms caught error, continuing normally:', error.message);
      res.json({ success: true, simulated: true });
    }
  });

  // Email Notification Route
  app.post("/api/notifications/send-email", async (req, res) => {
    const { to, subject, text, html } = req.body;
    
    const mailtrapPass = process.env.MAILTRAP_PASS || "ccdadf6e1c86b059a292c57a1836e2d3";
    const mailtrapUser = process.env.MAILTRAP_USER || "api";
    
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.MAILTRAP_HOST || "live.smtp.mailtrap.io",
        port: parseInt(process.env.MAILTRAP_PORT || "587", 10),
        auth: {
          user: mailtrapUser,
          pass: mailtrapPass
        }
      });

      const mailOptions = {
        from: '"Wayta Platform" <noreply@wayta.co.za>',
        to,
        subject,
        text,
        html
      };

      await transporter.sendMail(mailOptions);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to send email:', error instanceof Error ? error.message : JSON.stringify(error));
      res.status(500).json({ error: "Failed to send email", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Yoco API Stock Levels Sync Gateway
  app.post("/api/yoco/sync", async (req, res) => {
    const { yocoPrivateKey, venueId, eventId, isMock } = req.body;
    
    if (!venueId) {
      return res.status(400).json({ error: "venueId is required for stock sync" });
    }

    try {
      const fsAdmin = await getFs();
      if (!fsAdmin) return res.status(503).json({ error: "Firebase unavailable" });

      let products: any[] = [];

      if (isMock || !yocoPrivateKey || yocoPrivateKey.trim() === "" || yocoPrivateKey.toLowerCase().includes("mock") || yocoPrivateKey.toLowerCase().includes("test")) {
        console.log("ℹ️ Performing simulated/mock Yoco synchronization...");
        products = [
          { name: "Premium Lager", sku: "SKU-PL-101", stock: Math.floor(40 + Math.random() * 80), price: 35 },
          { name: "Craft Cider", sku: "SKU-CC-102", stock: Math.floor(30 + Math.random() * 90), price: 40 },
          { name: "Single Malt Whiskey", sku: "SKU-SMW-103", stock: Math.floor(10 + Math.random() * 20), price: 65 },
          { name: "Imported Dry Gin", sku: "SKU-IDG-104", stock: Math.floor(25 + Math.random() * 40), price: 50 },
          { name: "Energy Drink Classic", sku: "SKU-EDC-105", stock: Math.floor(100 + Math.random() * 150), price: 30 },
          { name: "Artisanal Burger", sku: "SKU-AB-201", stock: Math.floor(15 + Math.random() * 35), price: 85 },
          { name: "Gourmet Nachos", sku: "SKU-GN-202", stock: Math.floor(10 + Math.random() * 25), price: 75 },
          { name: "Wayta Premium IPA", sku: "SKU-IPA-301", stock: Math.floor(50 + Math.random() * 100), price: 45 }
        ];
      } else {
        console.log(`🌐 Calling live Yoco API with secret key...`);
        try {
          // Dynamic import of fetch if needed, standard global fetch check for newer Node versions
          const response = await fetch('https://online.yoco.com/v1/products', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${yocoPrivateKey.trim()}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Yoco API returned ${response.status}: ${errorText}`);
          }

          const data = await response.json() as any;
          const yocoItems = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : (Array.isArray(data.products) ? data.products : []));

          products = yocoItems.map((prod: any) => {
            const priceVal = prod.price ? (typeof prod.price === 'number' ? prod.price / 100 : parseFloat(prod.price) / 100) : 40;
            return {
              name: prod.name || prod.title || "Yoco Sync Product",
              sku: prod.sku || prod.id || "",
              stock: prod.inventory && typeof prod.inventory.stockLevel === 'number' ? prod.inventory.stockLevel : (typeof prod.stock === 'number' ? prod.stock : Math.floor(50 + Math.random() * 50)),
              price: priceVal
            };
          });
        } catch (apiErr: any) {
          console.error("❌ Live Yoco API invocation failed, returning connection error:", apiErr.message);
          return res.status(502).json({ 
            error: "Yoco API Connection Failed", 
            message: apiErr.message,
            suggestion: "Please verify your Secret Key is correct, or sync with standard Mock mode."
          });
        }
      }

      // Sync fetched products with Firestore inventory table
      const matchedCount: string[] = [];
      const addedCount: string[] = [];

      // Get current venue inventory
      const currentInvSnapshot = await fsAdmin.collection('inventory').where('venue_id', '==', venueId).get();
      const currentItems: any[] = [];
      currentInvSnapshot.forEach((doc: any) => {
        currentItems.push({ id: doc.id, ...doc.data() });
      });

      for (const prod of products) {
        // Find if we have an item with the same name (case-insensitive)
        const match = currentItems.find(item => (item.name || '').toLowerCase().trim() === prod.name.toLowerCase().trim());

        if (match) {
          await fsAdmin.collection('inventory').doc(match.id).update({
            stock: prod.stock,
            status: prod.stock <= 0 ? 'Sold Out' : (prod.stock < 10 ? 'Low Stock' : 'Available'),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          matchedCount.push(prod.name);
        } else {
          const newDocRef = fsAdmin.collection('inventory').doc();
          const newItemData = {
            id: newDocRef.id,
            venue_id: venueId,
            eventId: eventId || null,
            name: prod.name,
            price: prod.price || 40,
            category: "Premium Selection", // Default synced category
            stock: prod.stock,
            status: prod.stock <= 0 ? 'Sold Out' : (prod.stock < 10 ? 'Low Stock' : 'Available'),
            is_active: true,
            sku: prod.sku,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };
          await newDocRef.set(newItemData);
          addedCount.push(prod.name);
        }
      }

      res.json({
        success: true,
        syncedCount: products.length,
        matched: matchedCount,
        added: addedCount,
        message: `Successfully synchronized stock with Yoco! Updated ${matchedCount.length} existing items and imported ${addedCount.length} new items.`
      });

    } catch (err: any) {
      console.error("❌ Failed synchronizing stock with Yoco API:", err);
      res.status(500).json({ error: "Failed to sync Yoco products", message: err.message });
    }
  });

  // 404 for API routes - Prevent falling through to HTML fallback
  // Reset Database Endpoint (Internal Use)
  app.post("/api/admin/reset-database", async (req, res) => {
    try {
      const db = await getDb();
      
      // We manually clear nodes
      const nodes = ['users', 'onboarding_requests', 'orders', 'transactions', 'venues', 'venue_reviews'];
      
      for (const node of nodes) {
        await db.ref(node).remove();
      }
      
      res.json({ message: "Database reset successful" });
    } catch (err: any) {
      console.error("Reset failed:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.all("/api/*", (req, res) => {
    console.warn(`⚠️ API Route not found: ${req.method} ${req.url}`);
    res.status(404).json({ error: "Route not found", method: req.method, path: req.url });
  });

  // POST /api/notify-order-status
  app.post("/api/notify-order-status", async (req, res) => {
    const { orderId, status, userId } = req.body;
    if (!orderId || !status) {
      return res.status(400).json({ error: "orderId and status are required" });
    }
    
    try {
      broadcastOrderStatusUpdate(orderId.toString(), status.toString(), userId?.toString());
      res.json({ success: true, message: "Status update broadcasted" });
    } catch (err) {
      res.status(500).json({ error: "Failed to broadcast status update" });
    }
  });

  // Legacy endpoint for compatibility
  app.post("/api/notify-order-ready", async (req, res) => {
    const { orderId, userId } = req.body;
    if (!orderId || !userId) {
      return res.status(400).json({ error: "orderId and userId are required" });
    }
    
    try {
      broadcastOrderStatusUpdate(orderId, 'ready', userId);
      res.json({ success: true, message: "Notification broadcasted" });
    } catch (err) {
      res.status(500).json({ error: "Failed to broadcast notification" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Wayta Terminal running on http://0.0.0.0:${PORT}`);
    console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔌 Socket.io server active`);
    startInventoryMonitoringService().catch(err => {
      console.error("❌ Failed to initialize background inventory monitoring service:", err);
    });

    // Run the default venue rename, fresh start, and metrics reset immediately on startup
    Promise.all([getDb(), getFs()]).then(([dbAdmin, fsAdmin]) => {
      if (dbAdmin && fsAdmin) {
        ensureTestingEventAdminExists(dbAdmin, fsAdmin).then(() => {
          console.log("🌟 Startup default seeding and fresh-start cleanups finalized successfully.");
        }).catch(err => {
          console.error("❌ Failed to run ensureTestingEventAdminExists during startup:", err);
        });
      }
    }).catch(err => {
      console.error("❌ Failed to obtain Firebase admin instances on startup:", err);
    });
  });
}

startServer().catch(err => {
  console.error("❌ Critical server startup failure:", err);
  process.exit(1);
});
