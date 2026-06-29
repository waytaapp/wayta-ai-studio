import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, GeoPoint } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ─── Bootstrap ─────────────────────────────────────────── */

const __dirname = dirname(fileURLToPath(import.meta.url));

let serviceAccount: ServiceAccount;
try {
  const saPath = resolve(__dirname, '../service-account.json');
  serviceAccount = JSON.parse(readFileSync(saPath, 'utf-8')) as ServiceAccount;
} catch {
  serviceAccount = {
    projectId: 'wayta-rbac-v10',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  } as ServiceAccount;
}

const app = initializeApp({ credential: cert(serviceAccount) });
const targetDb = process.env.FIRESTORE_DB || 'ai-studio-2ea8ff24-bbdd-46a8-a8a7-b0e54e4ae964';
const db = getFirestore(app, targetDb);

/* ─── Helpers ────────────────────────────────────────────── */

const now = Date.now();

function ago(minutes: number): Date {
  return new Date(now - minutes * 60_000);
}

let _seed = 42;
function rand(): number {
  _seed = (_seed * 1103515245 + 12345) & 0x7fffffff;
  return _seed / 0x7fffffff;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

/* ─── Data ───────────────────────────────────────────────── */

interface VenueDef {
  id: string;
  name: string;
  suburb: string;
  lat: number;
  lng: number;
  type: string;
  capacity: number;
  goLive: string;
}

const VENUES: VenueDef[] = [
  { id: 'venue-latitude', name: 'Latitude Rooftop', suburb: 'Sandton', lat: -26.1076, lng: 28.0567, type: 'Rooftop bar', capacity: 320, goLive: '2025-06-01' },
  { id: 'venue-andclub', name: 'And Club Rosebank', suburb: 'Rosebank', lat: -26.1467, lng: 28.0417, type: 'Nightclub', capacity: 480, goLive: '2025-08-15' },
  { id: 'venue-kong', name: 'Kong Lounge', suburb: 'Hatfield', lat: -25.7478, lng: 28.2293, type: 'Lounge bar', capacity: 200, goLive: '2025-09-01' },
  { id: 'venue-loft', name: 'Loft @ Hatfield', suburb: 'Hatfield', lat: -25.7463, lng: 28.2310, type: 'Student bar', capacity: 150, goLive: '2025-10-01' },
];

const STAFF: Array<{ name: string; role: string; initials: string; score: number; zone: string }> = [
  { name: 'Kabelo M.', role: 'Manager', initials: 'KM', score: 96, zone: 'Floor' },
  { name: 'Lerato K.', role: 'Bartender', initials: 'LK', score: 91, zone: 'Bar 1' },
  { name: 'Sipho D.', role: 'Bartender', initials: 'SD', score: 64, zone: 'Bar 2' },
  { name: 'Nia P.', role: 'Door', initials: 'NP', score: 99, zone: 'Entry' },
  { name: 'Khanyi M.', role: 'VIP Host', initials: 'KM', score: 88, zone: 'VIP Booth 3' },
  { name: 'Jay R.', role: 'Runner', initials: 'JR', score: 80, zone: 'W2' },
  { name: 'Thato B.', role: 'Runner', initials: 'TB', score: 85, zone: 'W1' },
];

const MENU_ITEMS: Array<{ name: string; category: string; size: string; abv: string; cost: number; retail: number; stock: number }> = [
  { name: 'Black Label NRB', category: 'Beer', size: '330ml', abv: '5.5%', cost: 14, retail: 32, stock: 48 },
  { name: 'Castle Lite NRB', category: 'Beer', size: '330ml', abv: '4%', cost: 15, retail: 35, stock: 36 },
  { name: 'Heineken', category: 'Beer', size: '330ml', abv: '5%', cost: 18, retail: 42, stock: 28 },
  { name: 'Corona Extra', category: 'Beer', size: '330ml', abv: '4.5%', cost: 20, retail: 45, stock: 24 },
  { name: 'Savanna Dry', category: 'Beer', size: '330ml', abv: '6%', cost: 19, retail: 45, stock: 32 },
  { name: 'Brutal Fruit Ruby', category: 'RTD', size: '330ml', abv: '3%', cost: 15, retail: 38, stock: 40 },
  { name: 'Klipdrift Premium', category: 'Spirits', size: '750ml', abv: '43%', cost: 145, retail: 480, stock: 12 },
  { name: 'Klipdrift + Coke', category: 'Spirits', size: 'Single', abv: '', cost: 22, retail: 65, stock: 50 },
  { name: 'Jack Daniels', category: 'Spirits', size: '750ml', abv: '40%', cost: 320, retail: 780, stock: 6 },
  { name: 'Tanqueray + Tonic', category: 'Spirits', size: 'Single', abv: '', cost: 28, retail: 85, stock: 30 },
  { name: 'Patron Silver', category: 'Spirits', size: 'Shot', abv: '40%', cost: 55, retail: 160, stock: 8 },
  { name: 'Red Bull', category: 'Soft', size: '250ml', abv: '', cost: 12, retail: 30, stock: 60 },
  { name: 'Still Water', category: 'Soft', size: '500ml', abv: '', cost: 5, retail: 18, stock: 100 },
  { name: 'Windhoek Lager', category: 'Beer', size: '330ml', abv: '4.2%', cost: 16, retail: 38, stock: 20 },
];

const LINE_ITEMS: Array<{ name: string; qty: number; unit: number }> = [
  { name: 'Heineken', qty: 2, unit: 42 },
  { name: 'Corona Extra', qty: 1, unit: 45 },
  { name: 'Klipdrift + Coke', qty: 1, unit: 65 },
  { name: 'Brutal Fruit Ruby', qty: 3, unit: 38 },
  { name: 'Savanna Dry', qty: 1, unit: 45 },
  { name: 'Red Bull', qty: 2, unit: 30 },
  { name: 'Patron Silver', qty: 1, unit: 160 },
  { name: 'Tanqueray + Tonic', qty: 1, unit: 85 },
  { name: 'Black Label NRB', qty: 4, unit: 32 },
  { name: 'Jack Daniels', qty: 1, unit: 780 },
];

const CUSTOMERS = ['Sipho', 'Lerato', 'Nia', 'Kabelo', 'Khanyi', 'Jay', 'Thato', 'Zanele', 'Thabo', 'Amanda', 'Bongani', 'Lindiwe'] as const;
const ZONES = ['W1', 'W2', 'VIP Booth 3', 'Bar 1', 'Bar 2', 'Dancefloor'] as const;
const STATUSES = ['new', 'prepping', 'ready', 'collected'] as const;
const WEIGHTS = [0.25, 0.35, 0.25, 0.15];

function pickWeighted<T>(items: readonly T[], weights: number[]): T {
  const r = rand();
  let cumulative = 0;
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (r <= cumulative) return items[i];
  }
  return items[items.length - 1];
}

/* ─── Seed functions ────────────────────────────────────── */

async function seedVenues() {
  console.log('─ Seeding venues...');
  const batch = db.batch();

  for (const v of VENUES) {
    const ref = db.collection('venues').doc(v.id);
    batch.set(ref, {
      name: v.name,
      type: v.type,
      suburb: v.suburb,
      capacity: v.capacity,
      goLiveDate: v.goLive,
      location: new GeoPoint(v.lat, v.lng),
      status: 'live',
      gmv: randInt(9000, 150000),
      covers: randInt(60, v.capacity),
      p95Prep: `${randInt(2, 9)}:${randInt(0, 59).toString().padStart(2, '0')}`,
      staffCount: randInt(4, 12),
      createdAt: ago(randInt(30, 365) * 24 * 60),
      updatedAt: ago(randInt(0, 60)),
    });
  }

  await batch.commit();
  console.log(`  ✓ ${VENUES.length} venues created`);
}

async function seedVenueStaff() {
  console.log('─ Seeding staff...');
  const batch = db.batch();

  for (const v of VENUES) {
    const count = randInt(3, STAFF.length);
    const assigned = STAFF.slice(0, count);
    for (const s of assigned) {
      const ref = db.collection('users').doc(`staff-${uid()}`);
      batch.set(ref, {
        displayName: s.name,
        role: s.role.toLowerCase(),
        initials: s.initials,
        score: s.score,
        zone: s.zone,
        assignedVenueId: v.id,
        status: 'active',
        lastLogin: ago(randInt(0, 120)),
        createdAt: ago(randInt(30, 90) * 24 * 60),
      });
    }
  }

  await batch.commit();
  console.log('  ✓ Staff profiles created');
}

async function seedMenuItems() {
  console.log('─ Seeding menu items...');
  const batch = db.batch();

  for (const v of VENUES) {
    const count = randInt(8, MENU_ITEMS.length);
    const items = MENU_ITEMS.slice(0, count);
    for (const item of items) {
      const ref = db.collection('menus').doc(`menu-${uid()}`);
      const stock = item.stock + randInt(-6, 6);
      const status = stock <= 0 ? 'Out of Stock' : stock <= 5 ? 'Low Stock' : stock > 20 ? 'Bestseller' : null;
      batch.set(ref, {
        venueId: v.id,
        name: item.name,
        category: item.category,
        size: item.size,
        abv: item.abv,
        costPrice: item.cost,
        retailPrice: item.retail,
        margin: `${Math.round((1 - item.cost / item.retail) * 100)}%`,
        stock: Math.max(0, stock),
        status,
        createdAt: ago(randInt(1, 60)),
      });
    }
  }

  await batch.commit();
  console.log('  ✓ Menu items created');
}

async function seedEvents() {
  console.log('─ Seeding events...');
  const batch = db.batch();

  const events = [
    {
      id: 'event-smirnoff-summer',
      name: 'Smirnoff Summer Series · Rosebank',
      brand: 'Smirnoff SA',
      venueId: 'venue-andclub',
      status: 'Live',
      startDate: '2026-02-07',
      endDate: '2026-02-21',
      pourCost: 'R32 / R65',
      budgetUtilised: '78%',
      sponsoredOrders: 842,
      costPerPour: 4.20,
      sellThrough: '78%',
      brandLift: '+14 pts',
    },
    {
      id: 'event-black-label-cold-pull',
      name: 'Black Label Cold Pull',
      brand: 'Carling Black Label',
      venueId: 'venue-latitude',
      status: 'Live',
      startDate: '2025-12-01',
      endDate: '2025-12-31',
      pourCost: 'R14 / R32',
      budgetUtilised: '92%',
      sponsoredOrders: 1240,
      costPerPour: 3.10,
      sellThrough: '92%',
      brandLift: '+22 pts',
    },
    {
      id: 'event-spin-twist',
      name: 'Spin Twist · Hatfield',
      brand: 'Smirnoff SA',
      venueId: 'venue-kong',
      status: 'Scheduled',
      startDate: '2026-02-14',
      endDate: '2026-02-28',
      pourCost: 'R28 / R52',
      budgetUtilised: '0%',
      sponsoredOrders: 0,
      costPerPour: 0,
      sellThrough: '0%',
      brandLift: '0 pts',
    },
  ];

  for (const e of events) {
    const ref = db.collection('events').doc(e.id);
    batch.set(ref, {
      ...e,
      createdAt: ago(randInt(5, 30) * 24 * 60),
      updatedAt: ago(randInt(0, 60)),
    });
  }

  await batch.commit();
  console.log(`  ✓ ${events.length} events created`);
}

async function seedOrders() {
  console.log('─ Seeding 50 orders...');
  const batch = db.batch();

  for (let i = 0; i < 50; i++) {
    const venue = pick(VENUES);
    const customer = pick(CUSTOMERS);
    const zone = pick(ZONES);
    const status = pickWeighted(STATUSES, WEIGHTS);
    const count = randInt(1, 4);
    const items = LINE_ITEMS.slice(0, count);
    const summary = items.map(it => `${it.qty}× ${it.name}`).join(' · ');
    const total = items.reduce((sum, it) => sum + it.qty * it.unit, 0);
    const minutesAgo = status === 'new' ? randInt(0, 15) : status === 'prepping' ? randInt(5, 40) : status === 'ready' ? randInt(10, 60) : randInt(20, 120);

    const ref = db.collection('orders').doc(`order-${uid()}`);
    batch.set(ref, {
      orderNumber: `#B-${randInt(30, 99)}`,
      venueId: venue.id,
      venueName: venue.name,
      customer,
      userId: `user-${uid()}`,
      status,
      items: items.map(it => ({ name: it.name, qty: it.qty, unitPrice: it.unit, lineTotal: it.qty * it.unit })),
      itemSummary: summary,
      totalPrice: total,
      tab: `Tab #${randInt(100, 999)}`,
      zone,
      timeElapsed: `${Math.floor(minutesAgo / 60)}:${(minutesAgo % 60).toString().padStart(2, '0')}`,
      paymentStatus: pick(['pending', 'paid', 'tabbed'] as const),
      createdAt: ago(minutesAgo),
      updatedAt: ago(randInt(0, Math.max(1, minutesAgo))),
    });
  }

  await batch.commit();
  console.log('  ✓ 50 orders created');
}

async function seedPaymentRails() {
  console.log('─ Seeding payment rails...');
  const batch = db.batch();

  const rails = [
    { name: 'Stitch', uptime: '99.8%', status: 'ok', transactions24h: randInt(500, 2000) },
    { name: 'Yoco', uptime: '99.5%', status: 'ok', transactions24h: randInt(300, 1500) },
    { name: 'SnapScan', uptime: '92.1%', status: 'degraded', transactions24h: randInt(50, 300) },
    { name: 'Zapper', uptime: '99.9%', status: 'ok', transactions24h: randInt(200, 800) },
  ];

  for (const r of rails) {
    const ref = db.collection('paymentRails').doc(r.name.toLowerCase());
    batch.set(ref, {
      ...r,
      updatedAt: ago(randInt(0, 30)),
    });
  }

  await batch.commit();
  console.log('  ✓ Payment rails configured');
}

async function seedPlatformConfig() {
  console.log('─ Seeding platform config...');
  const ref = db.collection('config').doc('platform');

  await ref.set({
    name: 'Wayta Platform',
    version: '2.2.0',
    liveVenues: VENUES.length,
    gmvTonight: randInt(400000, 950000),
    patronsOnline: randInt(1500, 4000),
    paymentFailRate: '0.42%',
    p95PrepSLA: '4:18',
    incidents: [
      {
        venueId: 'venue-loft',
        venueName: 'Loft @ Hatfield',
        severity: 'critical',
        description: 'Bar 2 terminal offline since 23:18. 14 patrons waiting > 6 min. Auto-paused new orders.',
        status: 'open',
        reportedAt: ago(30),
        escalated: false,
      },
      {
        venueId: 'venue-kong',
        venueName: 'Kong Lounge',
        severity: 'warning',
        description: 'P95 prep SLA at 5:42 (target 4:30). Bar 1 understaffed.',
        status: 'open',
        reportedAt: ago(45),
        escalated: true,
      },
    ],
    updatedAt: ago(randInt(0, 10)),
  }, { merge: true });

  console.log('  ✓ Platform config seeded');
}

async function seedUserProfiles() {
  console.log('─ Seeding user profiles...');
  const batch = db.batch();

  const profiles = [
    { uid: 'admin-01', displayName: 'Wayta Admin', email: 'admin@wayta.app', role: 'admin' },
    { uid: 'manager-01', displayName: 'Kabelo M.', email: 'kabelo@latituderooftop.co.za', role: 'manager', venueId: 'venue-latitude' },
    { uid: 'patron-01', displayName: 'Thato B.', email: 'thato@gmail.com', role: 'patron', budget: 860, budgetMax: 1200 },
    { uid: 'patron-02', displayName: 'Zanele K.', email: 'zanele@gmail.com', role: 'patron', budget: 500, budgetMax: 800 },
    { uid: 'patron-03', displayName: 'Amanda L.', email: 'amanda@gmail.com', role: 'patron', budget: 1200, budgetMax: 2000 },
  ];

  for (const p of profiles) {
    const ref = db.collection('users').doc(p.uid);
    batch.set(ref, {
      ...p,
      stage1Complete: true,
      stage2Complete: p.role === 'patron' ? false : true,
      lastLogin: ago(randInt(0, 60)),
      createdAt: ago(randInt(30, 180) * 24 * 60),
    });
  }

  await batch.commit();
  console.log('  ✓ User profiles created');
}

/* ─── Main ───────────────────────────────────────────────── */

async function main() {
  console.log(`\n🌱 Seeding Firestore (${targetDb})...`);

  await seedVenues();
  await seedVenueStaff();
  await seedMenuItems();
  await seedEvents();
  await seedOrders();
  await seedPaymentRails();
  await seedPlatformConfig();
  await seedUserProfiles();

  console.log('\n✅ Seed complete.\n');
}

main().catch(err => {
  console.error('\n❌ Seed failed:', err);
  process.exit(1);
});
