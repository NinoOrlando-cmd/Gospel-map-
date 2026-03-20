export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const API_KEY = process.env.EVENTBRITE_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const url = 'https://www.eventbriteapi.com/v3/events/search/' +
      '?location.address=Massachusetts,US' +
      '&location.within=50mi' +
      '&expand=venue' +
      '&status=live' +
      '&sort_by=date' +
      '&page_size=50';

    const response = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + API_KEY }
    });

    const data = await response.json();

    // Return debug info so we can see exactly what Eventbrite says
    if (!response.ok || !data.events) {
      return res.status(200).json({ events: [], debug: JSON.stringify(data) });
    }

    const events = data.events.map(function(ev) {
      const venue = ev.venue || {};
      const address = venue.address || {};
      const lat = parseFloat(venue.latitude) || null;
      const lng = parseFloat(venue.longitude) || null;

      return {
        id: 'eb_' + ev.id,
        name: ev.name ? ev.name.text : 'Untitled Event',
        category: 'community',
        date: ev.start ? formatDate(ev.start.local) : 'TBD',
        time: ev.start ? formatTime(ev.start.local) : 'TBD',
        location: [venue.name, address.city].filter(Boolean).join(', ') || 'Massachusetts',
        lat: lat,
        lng: lng,
        crowd: ev.capacity || 1000,
        capacity: ev.capacity || null,
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
