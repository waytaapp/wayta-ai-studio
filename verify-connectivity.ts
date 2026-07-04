
import admin from "firebase-admin";
import { readFileSync } from 'fs';
import dns from 'dns';
import https from 'https';

async function verify() {
  console.log("--- Connectivity Verification Start ---");
  
  const firebaseConfig = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf8'));
  const projectId = firebaseConfig.projectId;
  const rtdbUrl = `https://${projectId}-default-rtdb.firebaseio.com/`;
  const host = `${projectId}-default-rtdb.firebaseio.com`;

  console.log(`Checking resolution for ${host}...`);
  dns.lookup(host, (err, address, family) => {
    if (err) {
      console.error(`❌ DNS Lookup failed for ${host}:`, err.message);
    } else {
      console.log(`✅ DNS Lookup succeeded: ${address} (v${family})`);
    }
  });

  console.log(`Checking TCP/HTTPS connectivity to ${rtdbUrl}...`);
  const req = https.get(rtdbUrl + ".json", (res) => {
    console.log(`✅ HTTPS request to ${rtdbUrl} returned status: ${res.statusCode}`);
    if (res.statusCode === 401 || res.statusCode === 404) {
      console.log("ℹ️ (401/404 is normal for unauthenticated requests if DB exists)");
    }
    if (res.statusCode === 503 || res.statusCode === 502) {
      console.error("❌ Database might be paused or unavailable (502/503)");
    }
  });

  req.on('error', (e) => {
    console.error(`❌ HTTPS request failed: ${e.message}`);
  });

  req.end();

  // Give it some time
  setTimeout(() => {
    console.log("--- Verification End ---");
    process.exit(0);
  }, 5000);
}

verify();
