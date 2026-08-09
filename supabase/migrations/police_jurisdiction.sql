-- 1. Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Create Police Jurisdictions Table
CREATE TABLE IF NOT EXISTS public.police_jurisdictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_name TEXT NOT NULL,
  division TEXT,
  zone TEXT,
  geom GEOMETRY(MultiPolygon, 4326),
  source TEXT DEFAULT 'OpenCity',
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS police_jurisdictions_geom_idx 
  ON public.police_jurisdictions USING GIST (geom);

ALTER TABLE public.police_jurisdictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view police jurisdictions" 
  ON public.police_jurisdictions FOR SELECT USING (true);

-- 3. Create Crime Statistics Table
CREATE TABLE IF NOT EXISTS public.crime_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_id UUID REFERENCES public.police_jurisdictions(id) ON DELETE SET NULL,
  division TEXT, -- Populated if data is division-level
  crime_category TEXT NOT NULL,
  year INTEGER NOT NULL,
  reported_count INTEGER,
  detected_count INTEGER,
  data_level TEXT NOT NULL CHECK (data_level IN ('police_station', 'division', 'citywide')),
  source TEXT DEFAULT 'Bengaluru City Police',
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.crime_statistics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view crime statistics" 
  ON public.crime_statistics FOR SELECT USING (true);

-- 4. Create PostGIS RPC to Lookup Jurisdiction by Lat/Lng
CREATE OR REPLACE FUNCTION public.get_jurisdiction_by_location(lat FLOAT, lng FLOAT)
RETURNS TABLE (
  id UUID,
  station_name TEXT,
  division TEXT,
  zone TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pj.id,
    pj.station_name,
    pj.division,
    pj.zone
  FROM public.police_jurisdictions pj
  WHERE ST_Contains(pj.geom, ST_SetSRID(ST_MakePoint(lng, lat), 4326))
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create RPC to fetch all jurisdictions intersecting a Route Polyline (GeoJSON LineString)
-- Input: route_geojson JSONB representing a GeoJSON LineString
CREATE OR REPLACE FUNCTION public.get_jurisdictions_by_route(route_geojson JSONB)
RETURNS TABLE (
  id UUID,
  station_name TEXT,
  division TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    pj.id,
    pj.station_name,
    pj.division
  FROM public.police_jurisdictions pj
  WHERE ST_Intersects(pj.geom, ST_GeomFromGeoJSON(route_geojson))
  ORDER BY pj.station_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create RPC for safe GeoJSON insertion
CREATE OR REPLACE FUNCTION public.insert_police_jurisdiction(
  p_station_name TEXT,
  p_division TEXT,
  p_zone TEXT,
  p_geom_json JSONB,
  p_source TEXT,
  p_source_url TEXT
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.police_jurisdictions (
    station_name, division, zone, geom, source, source_url
  ) VALUES (
    p_station_name, 
    p_division, 
    p_zone, 
    ST_Multi(ST_GeomFromGeoJSON(p_geom_json)), 
    p_source, 
    p_source_url
  )
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Trigger for updated_at on police_jurisdictions
CREATE TRIGGER update_police_jurisdictions_modtime
BEFORE UPDATE ON public.police_jurisdictions
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
