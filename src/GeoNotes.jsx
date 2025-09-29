import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Use a stable marker image (CDN) to avoid bundler asset issues
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

L.Marker.prototype.options.icon = defaultIcon

const STORAGE_KEY = 'geoNotes:v1'

function loadNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    console.error('Failed to load notes', e)
    return []
  }
}

function saveNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
}

async function getCurrentPosition() {
  // Prefer browser geolocation which works in Dev; fall back to Capacitor plugin if available
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000 },
      )
    })
  }
  // If navigator.geolocation is not available (e.g., rare embed contexts), indicate unavailability.
  throw new Error('Geolocation not available in this environment')
}

export default function GeoNotes() {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersLayerRef = useRef(null)
  const routeLayerRef = useRef(null)

  const [notes, setNotes] = useState(() => loadNotes())
  const [text, setText] = useState('')
  const [status, setStatus] = useState('')
  const [radiusMeters, setRadiusMeters] = useState(0)
  const [filterCenter, setFilterCenter] = useState(null) // {lat,lng}
  const [routeStartId, setRouteStartId] = useState('')
  const [routeEndId, setRouteEndId] = useState('')
  const [customLat, setCustomLat] = useState('')
  const [customLng, setCustomLng] = useState('')

  useEffect(() => {
    // initialize map
    if (!mapRef.current) return
    const map = L.map(mapRef.current, { center: [0, 0], zoom: 2 })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

  markersLayerRef.current = L.layerGroup().addTo(map)
  routeLayerRef.current = L.layerGroup().addTo(map)
    mapInstanceRef.current = map

    // Try to set view to last note or current location
    if (notes.length > 0) {
      const last = notes[notes.length - 1]
      map.setView([last.lat, last.lng], 13)
    } else if (navigator && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((p) => {
        map.setView([p.coords.latitude, p.coords.longitude], 13)
      })
    }

    return () => {
      if (map) map.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // update markers when notes change
  useEffect(() => {
    const map = mapInstanceRef.current
    const layer = markersLayerRef.current
    if (!map || !layer) return
    layer.clearLayers()

    // optional filter
    let filtered = notes
    if (radiusMeters > 0 && filterCenter) {
      filtered = notes.filter((n) => {
        const d = map.distance([n.lat, n.lng], [filterCenter.lat, filterCenter.lng])
        return d <= radiusMeters
      })
    }

    // add markers
    const latlngs = []
    for (const n of filtered) {
      const m = L.marker([n.lat, n.lng])
      m.bindPopup(`<b>${n.text}</b><br/><small>${new Date(n.ts).toLocaleString()}</small>`)
      m.addTo(layer)
      latlngs.push([n.lat, n.lng])
    }

    // draw polyline connecting points in stored order
    if (latlngs.length > 1) {
      L.polyline(latlngs, { color: 'blue' }).addTo(layer)
    }

    // draw filter circle
    if (radiusMeters > 0 && filterCenter) {
      L.circle([filterCenter.lat, filterCenter.lng], { radius: radiusMeters, color: 'green', fillOpacity: 0.05 }).addTo(layer)
    }
  }, [notes, radiusMeters, filterCenter])

  async function handleCheckin() {
    setStatus('Getting location...')
    try {
      const pos = await getCurrentPosition()
      const newNote = {
        id: Date.now().toString(36),
        text: text || 'Check-in',
        lat: Number(pos.latitude),
        lng: Number(pos.longitude),
        ts: Date.now(),
      }
      const next = [...notes, newNote]
      setNotes(next)
      saveNotes(next)
      setText('')
      setStatus('Saved')
      // center map on new point
      const map = mapInstanceRef.current
      if (map) map.setView([newNote.lat, newNote.lng], 14)
    } catch (e) {
      console.error(e)
      setStatus('Failed to get location: ' + (e.message || e))
    }
    setTimeout(() => setStatus(''), 2500)
  }

  function handleDelete(id) {
    const next = notes.filter((n) => n.id !== id)
    setNotes(next)
    saveNotes(next)
  }

  async function setFilterToCurrentLocation() {
    setStatus('Getting location for filter...')
    try {
      const pos = await getCurrentPosition()
      setFilterCenter({ lat: pos.latitude, lng: pos.longitude })
      setStatus('Filter center set')
    } catch (e) {
      setStatus('Failed: ' + (e.message || e))
    }
    setTimeout(() => setStatus(''), 2000)
  }

  function clearFilter() {
    setFilterCenter(null)
    setRadiusMeters(0)
  }

  function clearRoute() {
    const layer = routeLayerRef.current
    if (!layer) return
    layer.clearLayers()
  }

  function drawRouteBetween(startId, endId) {
    clearRoute()
    const layer = routeLayerRef.current
    const map = mapInstanceRef.current
    if (!layer || !map) return

    const start = notes.find((n) => n.id === startId)
    const end = notes.find((n) => n.id === endId)
    if (!start || !end) {
      setStatus('Start or end note not found')
      setTimeout(() => setStatus(''), 2000)
      return
    }

    const latlngs = [[start.lat, start.lng], [end.lat, end.lng]]
    const poly = L.polyline(latlngs, { color: 'red', weight: 4 })
    poly.addTo(layer)
    map.fitBounds(poly.getBounds(), { padding: [50, 50] })
  }

  function drawRouteToLatLng(startId, latStr, lngStr) {
    clearRoute()
    const layer = routeLayerRef.current
    const map = mapInstanceRef.current
    if (!layer || !map) return

    const start = notes.find((n) => n.id === startId)
    const lat = Number(latStr)
    const lng = Number(lngStr)
    if (!start || Number.isNaN(lat) || Number.isNaN(lng)) {
      setStatus('Invalid start note or lat/lng')
      setTimeout(() => setStatus(''), 2000)
      return
    }

    const latlngs = [[start.lat, start.lng], [lat, lng]]
    const poly = L.polyline(latlngs, { color: 'orange', weight: 4, dashArray: '6,6' })
    poly.addTo(layer)
    map.fitBounds(poly.getBounds(), { padding: [50, 50] })
  }

  return (
    <div style={{ display: 'flex', gap: 12, padding: 12 }}>
      <div style={{ flex: 1, minWidth: 300 }}>
        <h2>Geo-Notes</h2>
        <div style={{ marginBottom: 8 }}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Note text" style={{ width: '70%' }} />
          <button onClick={handleCheckin} style={{ marginLeft: 8 }}>Check-in</button>
        </div>
        <div style={{ marginBottom: 8 }}>
          <button onClick={setFilterToCurrentLocation}>Set filter center to current location</button>
          <button onClick={clearFilter} style={{ marginLeft: 8 }}>Clear filter</button>
        </div>
        <div style={{ marginBottom: 8, borderTop: '1px solid #eee', paddingTop: 8 }}>
          <h4>Routing</h4>
          <div style={{ marginBottom: 6 }}>
            <label>Start note: </label>
            <select value={routeStartId} onChange={(e) => setRouteStartId(e.target.value)}>
              <option value="">-- Select --</option>
              {notes.map((n) => (
                <option key={n.id} value={n.id}>{n.text} ({n.lat.toFixed(4)}, {n.lng.toFixed(4)})</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 6 }}>
            <label>End note: </label>
            <select value={routeEndId} onChange={(e) => setRouteEndId(e.target.value)}>
              <option value="">-- Select --</option>
              {notes.map((n) => (
                <option key={n.id} value={n.id}>{n.text} ({n.lat.toFixed(4)}, {n.lng.toFixed(4)})</option>
              ))}
            </select>
            <button
              onClick={() => {
                if (!routeStartId || !routeEndId) {
                  setStatus('choose start and end')
                  setTimeout(() => setStatus(''), 1500)
                  return
                }
                drawRouteBetween(routeStartId, routeEndId)
              }}
              style={{ marginLeft: 8 }}
            >Draw route between notes</button>
          </div>
          <div style={{ marginBottom: 6 }}>
            <label>Or: target lat,lng: </label>
            <input placeholder="lat" value={customLat} onChange={(e) => setCustomLat(e.target.value)} style={{ width: 100 }} />
            <input placeholder="lng" value={customLng} onChange={(e) => setCustomLng(e.target.value)} style={{ width: 100, marginLeft: 6 }} />
            <button
              onClick={() => {
                if (!routeStartId) {
                  setStatus('choose start note')
                  setTimeout(() => setStatus(''), 1500)
                  return
                }
                drawRouteToLatLng(routeStartId, customLat, customLng)
              }}
              style={{ marginLeft: 8 }}
            >Draw to target</button>
            <button onClick={clearRoute} style={{ marginLeft: 8 }}>Clear route</button>
          </div>
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>Radius (meters): </label>
          <input type="number" value={radiusMeters} onChange={(e) => setRadiusMeters(Number(e.target.value || 0))} />
        </div>

        <div style={{ maxHeight: '60vh', overflow: 'auto', border: '1px solid #ddd', padding: 8 }}>
          <h3>Saved notes ({notes.length})</h3>
          <ul style={{ paddingLeft: 16 }}>
            {notes.map((n) => (
              <li key={n.id} style={{ marginBottom: 8 }}>
                <b>{n.text}</b> — {new Date(n.ts).toLocaleString()}
                <br />
                <small>lat: {n.lat.toFixed(6)}, lng: {n.lng.toFixed(6)}</small>
                <br />
                <button
                  onClick={() => {
                    const map = mapInstanceRef.current
                    if (map) map.setView([n.lat, n.lng], 14)
                  }}
                >
                  Zoom
                </button>
                <button onClick={() => handleDelete(n.id)} style={{ marginLeft: 8 }}>Delete</button>
              </li>
            ))}
          </ul>
        </div>
        <div style={{ marginTop: 8, color: '#666' }}>{status}</div>
      </div>

      <div style={{ flex: 2 }}>
        <div ref={mapRef} id="map" style={{ height: '90vh', width: '100%', border: '1px solid #ccc' }} />
      </div>
    </div>
  )
}
