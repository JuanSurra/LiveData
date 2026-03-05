const { createClient } = require('@supabase/supabase-js');

async function sync() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const token = process.env.AMMONITOR_TOKEN;

  // Las 4 rutas más probables según el manual y tu configuración
  const targets = [
    'https://or.ammonit.com/api/v1/projects/PMXG/last-data/',
    'https://or.ammonit.com/api/projects/PMXG/last-data/',
    'https://or.ammonit.com/api/v1/devices/D223245/last-data/',
    'https://or.ammonit.com/api/devices/D223245/last-data/'
  ];

  console.log("--- BUSCANDO ENDPOINT VÁLIDO ---");

  for (let url of targets) {
    console.log(`\nProbando: ${url}`);
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { 
          'Authorization': `Token ${token}`,
          'Accept': 'application/json'
        }
      });

      console.log(`Respuesta: ${res.status} ${res.statusText}`);

      if (res.ok) {
        const data = await res.json();
        console.log("¡ÉXITO! Datos recibidos correctamente.");
        
        // Si tenemos datos, los guardamos en Supabase
        await saveToSupabase(supabase, data);
        return; // Salimos del bucle porque ya funcionó
      } else if (res.status === 403) {
        console.log("ERROR 403: El Token es válido pero no tienes permiso. Revisa '3rd party apps' en AmmonitOR.");
      }
    } catch (err) {
      console.log(`Error de red en esta URL: ${err.message}`);
    }
  }

  console.log("\n--- NINGUNA RUTA FUNCIONÓ ---");
  process.exit(1);
}

async function saveToSupabase(supabase, data) {
  // Intentamos extraer los valores, manejando posibles nombres de canales
  const channels = data.channels || {};
  
  const insertData = {
    timestamp: data.timestamp,
    station_name: "Estación Tecnovex PMXG",
    location: "Patagonia, AR",
    wind_speed: (channels['Wind Speed'] || channels['viento'] || {}).value || null,
    wind_dir_value: (channels['Wind Direction'] || channels['direccion'] || {}).value || null,
    wind_dir_label: (channels['Wind Direction'] || {}).label || "N/A",
    temperature: (channels['Temperature'] || channels['temp'] || {}).value || null,
    humidity: (channels['Humidity'] || channels['hum'] || {}).value || null,
    pressure: (channels['Pressure'] || channels['presion'] || {}).value || null,
    precipitation: (channels['Precipitation'] || channels['lluvia'] || {}).value || null
  };

  const { error } = await supabase.from('telemetria_live').insert([insertData]);
  if (error) throw error;
  console.log(`Dato de las ${data.timestamp} guardado en Supabase.`);
}

sync();
