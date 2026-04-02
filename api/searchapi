export default async function handler(req, res) {
res.setHeader(‘Access-Control-Allow-Origin’, ‘*’);
res.setHeader(‘Access-Control-Allow-Methods’, ‘GET’);

const API_KEY = process.env.SEARCHAPI_KEY;

if (!API_KEY) {
return res.status(500).json({ error: ‘SearchApi key not configured’ });
}

const ZONES = [
{ name: ‘Boston Core’, query: ‘events in Boston Cambridge Somerville Massachusetts’, location: ‘Boston, Massachusetts’ },
{ name: ‘North Shore’, query: ‘events in Salem Lynn Gloucester Beverly Massachusetts’, location: ‘Salem, Massachusetts’ },
{ name: ‘South Shore’, query: ‘events in Quincy Brockton Plymouth Massachusetts’, location: ‘Quincy, Massachusetts’ },
{ name: ‘West MA’, query: ‘events in Worcester Springfield Lowell Massachusetts’, location: ‘Worcester, Massachusetts’ },
];

try {
var allEvents = [];
var seen = {};


for (var i = 0; i < ZONES.length; i++) {
  var zone = ZONES[i];
  try {
    var url = 'https://www.searchapi.io/api/v1/search' +
      '?engine=google_events' +
      '&q=' + encodeURIComponent(zone.query) +
      '&location=' + encodeURIComponent(zone.location) +
      '&gl=us' +
      '&hl=en' +
      '&api_key=' + API_KEY;

    var response = await fetch(url);
    if (!response.ok) continue;

    var data = await response.json();
    var events = data.events || [];

    events.forEach(function(ev) {
      var key = (ev.title || '').toLowerCase().trim();
      if (seen[key]) return;
      seen[key] = true;

      var address = '';
      if (ev.address && Array.isArray(ev.address)) {
        address = ev.address.join(', ');
      } else if (ev.address && typeof ev.address === 'string') {
        address = ev.address;
      }

      var dateStr = 'TBD';
      var timeStr = 'TBD';
      if (ev.date) {
        dateStr = ev.date.start_date || ev.date.when || 'TBD';
        timeStr = ev.date.when || 'TBD';
      }

      allEvents.push({
        id: 'sapi_' + Math.random().toString(36).substr(2, 9),
        name: ev.title || 'Unnamed Event',
        category: guessCategory(ev.title || ''),
        date: dateStr,
        time: timeStr,
        location: address || zone.name,
        lat: null,
        lng: null,
        crowd: guessCrowd(ev.title || '', ev.description || ''),
        capacity: null,
        description: ev.description ? ev.description.slice(0, 150) : '',
        source: 'Google Events',
        url: ev.link || '',
        address: address,
        zone: zone.name,
        needsGeocode: true
      });
    });

  } catch (zoneErr) {
    console.error('Zone error:', zone.name, zoneErr.message);
  }
}

// Geocode events using OpenStreetMap Nominatim (free)
var geocoded = await geocodeEvents(allEvents);

res.setHeader('Cache-Control', 's-maxage=3600');
return res.status(200).json({ events: geocoded, total: geocoded.length });


} catch (err) {
return res.status(500).json({ error: err.message });
}
}

async function geocodeEvents(events) {
var results = [];

var ZONE_COORDS = {
‘Boston Core’: { lat: 42.3601, lng: -71.0589 },
‘North Shore’: { lat: 42.5195, lng: -70.8967 },
‘South Shore’: { lat: 42.2529, lng: -70.9773 },
‘West MA’: { lat: 42.2626, lng: -71.8023 },
};

for (var i = 0; i < events.length; i++) {
var ev = events[i];


if (!ev.needsGeocode || !ev.address) {
  results.push(ev);
  continue;
}

try {
  var geoUrl = 'https://nominatim.openstreetmap.org/search' +
    '?q=' + encodeURIComponent(ev.address + ', Massachusetts, USA') +
    '&format=json&limit=1&countrycodes=us';

  var geoRes = await fetch(geoUrl, {
    headers: { 'User-Agent': 'GospelMap/1.0' }
  });

  if (geoRes.ok) {
    var geoData = await geoRes.json();
    if (geoData && geoData[0]) {
      ev.lat = parseFloat(geoData[0].lat);
      ev.lng = parseFloat(geoData[0].lon);
    }
  }
} catch (e) {
  // Fall through to zone fallback
}

// Zone center fallback with small random offset so pins don't stack
if (!ev.lat || !ev.lng) {
  var fallback = ZONE_COORDS[ev.zone] || ZONE_COORDS['Boston Core'];
  ev.lat = fallback.lat + (Math.random() - 0.5) * 0.08;
  ev.lng = fallback.lng + (Math.random() - 0.5) * 0.08;
}

delete ev.needsGeocode;
delete ev.address;
delete ev.zone;
results.push(ev);


}

return results;
}

function guessCategory(title) {
var t = title.toLowerCase();
if (t.includes(‘concert’) || t.includes(‘music’) || t.includes(‘band’) || t.includes(‘live’) || t.includes(‘show’)) return ‘concert’;
if (t.includes(‘game’) || t.includes(‘match’) || t.includes(’ vs ’) || t.includes(‘race’) || t.includes(‘marathon’) || t.includes(‘run’) || t.includes(‘5k’)) return ‘sports’;
if (t.includes(‘festival’) || t.includes(‘fair’) || t.includes(‘parade’) || t.includes(‘carnival’) || t.includes(‘expo’)) return ‘festival’;
if (t.includes(‘market’) || t.includes(‘farmers’) || t.includes(‘bazaar’)) return ‘market’;
return ‘community’;
}

function guessCrowd(title, description) {
var t = (title + ’ ’ + description).toLowerCase();
if (t.includes(‘marathon’) || t.includes(‘parade’)) return 50000;

if (t.includes(‘festival’) || t.includes(‘fair’) || t.includes(‘expo’)) return 10000;
if (t.includes(‘concert’) || t.includes(‘game’) || t.includes(‘match’)) return 5000;
if (t.includes(‘market’) || t.includes(‘5k’) || t.includes(‘run’)) return 3000;
return 1000;
}
