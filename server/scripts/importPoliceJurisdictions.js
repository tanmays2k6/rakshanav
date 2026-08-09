import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importJurisdictions() {
  const geojsonPath = path.resolve(__dirname, '../data/bengaluru_police_jurisdictions.geojson');
  
  if (!fs.existsSync(geojsonPath)) {
    console.error(`GeoJSON file not found at ${geojsonPath}`);
    console.error(`Please download the dataset from OpenCity and place it there.`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
  const features = data.features;
  
  console.log(`Found ${features.length} features. Importing...`);
  
  let successCount = 0;
  let failCount = 0;

  for (const feature of features) {
    const props = feature.properties;
    // Handle geometry for PostGIS
    // Supabase JS doesn't natively insert GeoJSON to PostGIS Geometry without PostGIS functions.
    // Instead of raw insert, we use an RPC, OR we pass GeoJSON as a string and cast it in Postgres.
    // Actually, Supabase lets you pass GeoJSON direct to a GEOMETRY column using the ST_GeomFromGeoJSON in SQL, 
    // but via the API, the easiest way is to pass it as a raw string and let Postgres cast it if configured, 
    // or use a custom RPC like `insert_police_jurisdiction(name, geom_json)`.
    // For this script, we assume the user might need an RPC, but since we are just scaffolding the script:
    
    const stationName = props.Name || props.ps_name || props.station || 'Unknown Station';
    const division = props.Division || props.division || null;
    const zone = props.Zone || props.zone || null;
    
    // Convert feature.geometry to string
    const geomStr = JSON.stringify(feature.geometry);

    try {
      const { data: newId, error } = await supabase.rpc('insert_police_jurisdiction', {
        p_station_name: stationName,
        p_division: division,
        p_zone: zone,
        p_geom_json: feature.geometry,
        p_source: 'OpenCity',
        p_source_url: 'https://data.opencity.in/dataset/police-jurisdiction-maps-for-major-cities-of-india'
      });
      
      if (error) throw error;
      successCount++;
    } catch (err) {
      console.error(`Failed to insert ${stationName}:`, err.message);
      failCount++;
    }
  }
  
  console.log(`Import complete. Success: ${successCount}, Failed: ${failCount}`);
}

importJurisdictions();
