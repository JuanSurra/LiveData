const { createClient } = require('@supabase/supabase-js');

async function sync() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const token = process.env.AMMONITOR_TOKEN;

  // Según el script de Python: /api/{project_key}/{device_serial}/
  // Probaremos la ruta de metadatos del dispositivo que suele traer el último dato
  const url = 'https://or.ammonit.com/api/PMXG/D223245/';

const data = await res.json();
    console.log("--- LISTA DE SENSORES DETECTADOS ---");
    console.log(Object.keys(data.last_data?.channels || data.channels || {}));
    console.log("------------------------------------");

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 
        'Authorization': `Token ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Error ${res.status}: ${errorText.substring(0, 100)}`);
    }

    const data = await res.json();
    console.log("¡Conexión exitosa! Datos recibidos.");

    // AmmonitOR en esta vista suele devolver un objeto con 'last_data' o similar
    // Vamos a mapear los datos. Si 'data.channels' no existe, usaremos lo que venga
    const measurements = data.last_data || data; 
    const channels = measurements.channels || {};

    const insertData = {
      timestamp: measurements.timestamp || new Date().toISOString(),
      station_name: "Estación Tecnovex PMXG",
      location: data.location || "Patagonia, AR",
      wind_speed: (channels['Wind Speed'] || {}).value || null,
      wind_dir_value: (channels['Wind Direction'] || {}).value || null,
      wind_dir_label: (channels['Wind Direction'] || {}).label || "N/A",
      temperature: (channels['Temperature'] || {}).value || null,
      humidity: (channels['Humidity'] || {}).value || null,
      pressure: (channels['Pressure'] || {}).value || null,
      precipitation: (channels['Precipitation'] || {}).value || null
    };

    const { error } = await supabase.from('telemetria_live').insert([insertData]);
    
    if (error) throw error;
    console.log(`Dato guardado en Supabase. Timestamp: ${insertData.timestamp}`);

  } catch (err) {
    console.error("FALLO EN LA SINCRONIZACIÓN:");
    console.error(err.message);
    process.exit(1);
  }
}

sync();
