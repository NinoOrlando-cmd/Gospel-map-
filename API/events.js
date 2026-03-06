export default async function handler(req, res) {
 res.setHeader('Access-Control-Allow-Origin', '*');
 res.setHeader('Access-Control-Allow-Methods', 'GET');
 const API_KEY = process.env.EVENTBRITE_API_KEY;
 if (!API_KEY) {
 return res.status(500).json({ error: 'API key not configured' });
 }
 try {
 const url = 'https://www.eventbriteapi.com/v3/events/search/' +
 '?location.address=Massachusetts' +
 '&location.within=50mi' +
 '&expand=venue,ticket_availability' +
 '&status=live' +
 '&order_by=start_asc' +
 '&page_size=50';
 const response = await fetch(url, {
 headers: {
 'Authorization': 'Bearer ' + API_KEY
 }
 });
 if (!response.ok) {
 const err = await response.text();
 return res.status(response.status).json({ error: err });
 }
 const data = await response.json();
 const events = (data.events || []).map(function(ev) {
 const venue = ev.venue || {};
 const address = venue.address || {};
 const lat = parseFloat(venue.latitude) || null;
 const lng = parseFloat(venue.longitude) || null;
 const capacity = ev.ticket_availability
 ? ev.ticket_availability.maximum_ticket_price
 : null;
 return {
 id: ev.id,
 name: ev.name ? ev.name.text : 'Untitled Event',
 category: ev.category_id ? mapCategory(ev.category_id) : 'community',
 date: ev.start ? formatDate(ev.start.local) : 'TBD',
 time: ev.start ? formatTime(ev.start.local) : 'TBD',
 location: [venue.name, address.city].filter(Boolean).join(', ') || 'Massachusetts',
 lat: lat,
 lng: lng,
 crowd: ev.ticket_availability && ev.ticket_availability.maximum_ticket_price
 ? estimateCrowd(ev)
 : 1000,
 capacity: null,
 description: ev.description ? ev.description.text.slice(0, 120) : '',
 source: 'Eventbrite',
 url: ev.url || ''
 };
 }).filter(function(ev) {
 return ev.lat && ev.lng;
 });
 res.setHeader('Cache-Control', 's-maxage=3600');
 return res.status(200).json({ events: events });
 } catch (err) {
 return res.status(500).json({ error: err.message });
 }
}
function mapCategory(id) {
 var map = {
 '103': 'music',
 '108': 'sports',
 '104': 'arts',
 '110': 'food',
 '113': 'community',
 '105': 'festival'
 };
 return map[id] || 'community';
}
function estimateCrowd(ev) {
 if (!ev.ticket_availability) return 1000;
 if (ev.ticket_availability.is_sold_out) return 5000;
 return 1000;
}
function formatDate(dateStr) {
 if (!dateStr) return 'TBD';
 var d = new Date(dateStr);
 return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatTime(dateStr) {
 if (!dateStr) return 'TBD';
 var d = new Date(dateStr);
 return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
