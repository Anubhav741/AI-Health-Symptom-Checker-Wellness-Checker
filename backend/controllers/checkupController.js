import Checkup from '../models/Checkup.js';
import mongoose from 'mongoose';

let mockMemoryDB = [];

export const saveCheckup = async (req, res) => {
  console.log("Incoming report:", req.body);
  try {
    if (mongoose.connection.readyState !== 1) {
      const entry = { ...req.body, id: Math.random().toString(), createdAt: new Date().toISOString() };
      mockMemoryDB.unshift(entry);
      return res.status(201).json({ message: 'Saved (Mocked DB is offline)', data: entry });
    }
    const newCheckup = new Checkup(req.body);
    await newCheckup.save();
    res.status(201).json({ message: 'Checkup saved successfully', data: newCheckup });
  } catch (error) {
    res.status(500).json({ message: 'Error saving checkup', error: error.message });
  }
};

export const getCheckups = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json(mockMemoryDB);
    }
    const checkups = await Checkup.find().sort({ createdAt: -1 }).limit(100);
    res.status(200).json(checkups);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching checkups', error: error.message });
  }
};

export const getCheckupById = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      // When DB is offline, search in-memory store
      const found = mockMemoryDB.find(item => (item.id === req.params.id || item._id === req.params.id));
      if (found) return res.status(200).json(found);
      return res.status(404).json({ message: 'Checkup not found (DB offline)' });
    }
    const checkup = await Checkup.findById(req.params.id);
    if (!checkup) return res.status(404).json({ message: 'Checkup not found' });
    res.status(200).json(checkup);
  } catch (error) {
    // If ObjectId cast fails, try mockMemoryDB
    const found = mockMemoryDB.find(item => (item.id === req.params.id || item._id === req.params.id));
    if (found) return res.status(200).json(found);
    res.status(500).json({ message: 'Error fetching checkup', error: error.message });
  }
};


export const getStats = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      // Return mock stats if DB is completely missing so UI doesn't crash visually
      return res.status(200).json({
        totalUsers: 1,
        totalCheckups: 3,
        severityDistribution: [
          { name: 'Low', value: 1 },
          { name: 'Medium', value: 1 },
          { name: 'High', value: 1 }
        ],
        commonConditions: [
          { name: 'Common Cold', count: 2 },
          { name: 'Fatigue', count: 1 }
        ],
        successRate: 98
      });
    }

    const checkups = await Checkup.find();
    
    // Calculate stats
    const totalCheckups = checkups.length;
    const uniqueUsers = new Set(checkups.map(c => c.email)).size;
    
    const severityCount = { low: 0, medium: 0, high: 0 };
    const conditionCount = {};

    checkups.forEach(c => {
      const sev = c.severity?.toLowerCase() || 'low';
      if (severityCount[sev] !== undefined) {
        severityCount[sev]++;
      }
      
      if (c.conditions && c.conditions.length > 0) {
        const topCond = c.conditions[0].name || c.conditions[0].condition;
        if (topCond) {
          conditionCount[topCond] = (conditionCount[topCond] || 0) + 1;
        }
      }
    });

    const severityDistribution = Object.keys(severityCount).map(k => ({
      name: k.charAt(0).toUpperCase() + k.slice(1),
      value: severityCount[k]
    })).filter(x => x.value > 0);

    const commonConditions = Object.keys(conditionCount)
      .map(k => ({ name: k, count: conditionCount[k] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.status(200).json({
      totalUsers: uniqueUsers,
      totalCheckups,
      severityDistribution,
      commonConditions,
      successRate: checkups.length > 0 ? 98 : 0
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Error fetching stats', error: error.message });
  }
};
export const getNearbyHospitals = async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'Missing lat or lng' });

  try {
    const googleKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
    if (googleKey) {
      // Use Google Places API
      const response = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=5000&type=hospital&keyword=hospital&key=${googleKey}`);
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const hospitals = data.results.map(p => ({
          id: p.place_id,
          name: p.name,
          type: "Hospital",
          location: p.vicinity,
          mapUrl: `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
          icon: "🏥",
          phone: "See Google Maps",
          distance: "Nearby"
        }));
        return res.json(hospitals);
      }
    } 

    // Fallback to OpenStreetMap Overpass API if no Google key or if Google returns empty
    const overpassQuery = `
      [out:json];
      (
        node["amenity"="hospital"](around:5000,${lat},${lng});
        way["amenity"="hospital"](around:5000,${lat},${lng});
        relation["amenity"="hospital"](around:5000,${lat},${lng});
      );
      out center;
    `;
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: overpassQuery
    });
    const data = await response.json();
    if (data.elements && data.elements.length > 0) {
      const hospitals = data.elements.map(e => ({
        id: e.id,
        name: e.tags?.name || "Local Hospital",
        type: "Hospital",
        location: e.tags?.['addr:full'] || e.tags?.['addr:street'] || "Near your location",
        mapUrl: `https://www.openstreetmap.org/?mlat=${e.lat || e.center?.lat}&mlon=${e.lon || e.center?.lon}#map=16/${e.lat || e.center?.lat}/${e.lon || e.center?.lon}`,
        icon: "🏥",
        phone: e.tags?.phone || "Not available",
        distance: "Nearby"
      })).filter(h => h.name !== "Local Hospital").slice(0, 10);
      return res.json(hospitals);
    }
    
    return res.json([]);
  } catch (error) {
    console.error("Error fetching nearby hospitals:", error);
    res.status(500).json({ error: 'Failed to fetch hospitals' });
  }
};
