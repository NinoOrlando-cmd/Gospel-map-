export default async function handler(req, res) {
res.setHeader(‘Access-Control-Allow-Origin’, ‘*’);
res.setHeader(‘Access-Control-Allow-Methods’, ‘GET’);

const API_KEY = process.env.TICKETMASTER_API_KEY;

if (!API_KEY) {
return res.status(500).json({ error: ‘Ticketmaster API key not configured’ });
}

try {
var now = new Date();
var startDateTime = now.toISOString().split(’.’)[0] + ‘Z’;

```
const url = 'https://app.ticketmaster.com/discovery/v2/events.json' +
'?apikey=' + API_KEY +
'&stateCode=MA' +
'&size=50' +
'&sort=date,asc' +
'&startDateTime=' + startDateTime +
'&includeSpellcheck=yes';

const response = await fetch(url);

if (!response.ok) {
const err = await response.text();
return res.status(response.status).json({ error: err });
}

const data = await response.json();

if (!data._embedded || !data._embedded.events) {
return res.status(200).json({ events: [] });
}

const events = data._embedded.events.map(function(ev) {
const venue = ev._embedded && ev._embedded.venues
? ev._embedded.venues[0]
: {};

const lat = venue.location ? parseFloat(venue.location.latitude) : null;
const lng = venue.location ? parseFloat(venue.location.longitude) : null;

const capacity = venue.upcomingEvents
? venue.upcomingEvents._total
: null;

const segment = ev.classifications && ev.classifications[0]
? ev.classifications[0].segment.name.toLowerCase()
: 'community';

return {
id: 'tm_' + ev.id,
name: ev.name,
category: mapSegment(segment),
date: ev.dates && ev.dates.start ? formatDate(ev.dates.start.localDate) : 'TBD',
time: ev.dates && ev.dates.start && ev.dates.start.localTime
? formatTime(ev.dates.start.localTime)
: 'TBD',
location: [venue.name, venue.city ? venue.city.name : ''].filter(Boolean).join(', '),
lat: lat,
lng: lng,
crowd: estimateCrowd(ev, venue),
capacity: capacity,
description: ev.info || ev.pleaseNote || ('Live event at ' + (venue.name || 'Massachusetts venue')),
source: 'Ticketmaster',
url: ev.url || ''
};
}).filter(function(ev) {
return ev.lat && ev.lng;
});

res.setHeader('Cache-Control', 's-maxage=3600');
return res.status(200).json({ events: events });
```

} catch (err) {
return res.status(500).json({ error: err.message });
}
}

function mapSegment(segment) {
if (segment.includes(‘sport’)) return ‘sports’;
if (segment.includes(‘music’)) return ‘concert’;
if (segment.includes(‘art’) || segment.includes(‘theatre’)) return ‘community’;
if (segment.includes(‘family’)) return ‘festival’;
return ‘community’;
}

function estimateCrowd(ev, venue) {
var capacity = venue.upcomingEvents ? venue.upcomingEvents._total : null;
if (capacity && capacity > 100) return capacity;
var segment = ev.classifications && ev.classifications[0]
? ev.classifications[0].segment.name.toLowerCase()
: ‘’;
if (segment.includes(‘sport’)) return 18000;
if (segment.includes(‘music’)) return 5000;
return 2000;
}

function formatDate(dateStr) {
if (!dateStr) return ‘TBD’;
var d = new Date(dateStr + ‘T00:00:00’);
return d.toLocaleDateString(‘en-US’, { month: ‘short’, day: ‘numeric’, year: ‘numeric’ });
}

function formatTime(timeStr) {
if (!timeStr) return ‘TBD’;
var parts = timeStr.split(’:’);
var h = parseInt(parts[0]);
var m = parts[1];
var ampm = h >= 12 ? ‘PM’ : ‘AM’;
h = h % 12 || 12;
return h + ‘:’ + m + ’ ’ + ampm;
}
