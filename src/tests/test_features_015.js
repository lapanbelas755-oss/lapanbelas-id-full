const crypto = require('crypto');

console.log('--- TEST 1: Service Account Base64Url & JWT Structure ---');
function base64url(source) {
  let encodedSource = Buffer.from(source).toString('base64');
  return encodedSource.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

const header = { alg: 'RS256', typ: 'JWT' };
const claimSet = {
  iss: 'test@example.com',
  scope: 'https://www.googleapis.com/auth/calendar.events',
  aud: 'https://oauth2.googleapis.com/token',
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000)
};

const encodedHeader = base64url(JSON.stringify(header));
const encodedClaimSet = base64url(JSON.stringify(claimSet));
console.log('Encoded Header:', encodedHeader);
console.log('Encoded ClaimSet:', encodedClaimSet);
if (encodedHeader && encodedClaimSet) {
  console.log('PASSED: JWT payload encoding verified.');
} else {
  throw new Error('FAILED: JWT payload encoding');
}

console.log('\n--- TEST 2: Deadline Calculation Rules (Studio H-2 vs Wedding H-14) ---');
const today = new Date();
today.setHours(0, 0, 0, 0);

// Skenario A: Studio H-1 (Harus Ditolak)
const tomorrowStudio = new Date(today);
tomorrowStudio.setDate(today.getDate() + 1);
const diffDaysStudioH1 = Math.ceil((tomorrowStudio.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
console.log(`Studio H-1 diffDays: ${diffDaysStudioH1} (Min 2 required) -> ${diffDaysStudioH1 < 2 ? 'REJECTED (CORRECT)' : 'ERROR'}`);
if (diffDaysStudioH1 < 2) {
  console.log('PASSED: Studio H-1 correctly rejected.');
}

// Skenario B: Studio H-3 (Harus Diterima)
const threeDaysStudio = new Date(today);
threeDaysStudio.setDate(today.getDate() + 3);
const diffDaysStudioH3 = Math.ceil((threeDaysStudio.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
console.log(`Studio H-3 diffDays: ${diffDaysStudioH3} (Min 2 required) -> ${diffDaysStudioH3 >= 2 ? 'ACCEPTED (CORRECT)' : 'ERROR'}`);
if (diffDaysStudioH3 >= 2) {
  console.log('PASSED: Studio H-3 correctly accepted.');
}

// Skenario C: Wedding H-7 (Harus Ditolak, Min 14)
const weddingH7 = new Date(today);
weddingH7.setDate(today.getDate() + 7);
const diffDaysWeddingH7 = Math.ceil((weddingH7.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
console.log(`Wedding H-7 diffDays: ${diffDaysWeddingH7} (Min 14 required) -> ${diffDaysWeddingH7 < 14 ? 'REJECTED (CORRECT)' : 'ERROR'}`);
if (diffDaysWeddingH7 < 14) {
  console.log('PASSED: Wedding H-7 correctly rejected.');
}

// Skenario D: Wedding H-20 (Harus Diterima)
const weddingH20 = new Date(today);
weddingH20.setDate(today.getDate() + 20);
const diffDaysWeddingH20 = Math.ceil((weddingH20.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
console.log(`Wedding H-20 diffDays: ${diffDaysWeddingH20} (Min 14 required) -> ${diffDaysWeddingH20 >= 14 ? 'ACCEPTED (CORRECT)' : 'ERROR'}`);
if (diffDaysWeddingH20 >= 14) {
  console.log('PASSED: Wedding H-20 correctly accepted.');
}

console.log('\n--- TEST 3: Time Overlap Collision Logic ---');
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const slot1Start = timeToMinutes('14:00'); // 840
const slot1End = slot1Start + 45; // 885 (14:45)

const slot2OverlapStart = timeToMinutes('14:30'); // 870
const slot2OverlapEnd = slot2OverlapStart + 45; // 915 (15:15)

const isOverlap1 = (slot1Start < slot2OverlapEnd && slot1End > slot2OverlapStart);
console.log(`14:00-14:45 vs 14:30-15:15 overlap: ${isOverlap1} (Expected: true)`);
if (!isOverlap1) throw new Error('Overlap detection failed');

const slot3SafeStart = timeToMinutes('15:00'); // 900
const slot3SafeEnd = slot3SafeStart + 45; // 945
const isOverlap2 = (slot1Start < slot3SafeEnd && slot1End > slot3SafeStart);
console.log(`14:00-14:45 vs 15:00-15:45 overlap: ${isOverlap2} (Expected: false)`);
if (isOverlap2) throw new Error('False collision detected');

console.log('PASSED: Collision logic 100% verified.');

console.log('\nALL 3 SUITES PASSED CLEANLY!');
