const { createClient } = require('@supabase/supabase-js');

async function sync() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const token = process.env.AMMONITOR_TOKEN;
  const url = 'https://or.ammonit.com/api/PMXG/D223245/';

  console.log("Consultando AmmonitOR...");

  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Token ${token}` }
    });

    if (!res.ok) throw new Error(`Error de AmmonitOR: ${res.status}`);

    const data = await res.json();
    
    // ESTA PARTE ES PARA DETECTAR TUS SENSORES
    const measurements = data.last_data || data;
    const channels = measurements.channels || {};
    const nombresDeSensores = Object.keys(channels);

    console.log("--- SENSORES DETECTADOS EN TU METEO-40 ---");
    console.log(nombresDeSensores); 
    console.log("------------------------------------------");

    // Intentamos guardar lo que encontremos
    // Si los nombres no coinciden, aquí es donde pondremos los nombres reales después
    const { error } = await supabase.from('telemetria_live').insert([{
      timestamp: measurements.timestamp,
      station_name: "Estación Tecnovex PMXG",
      location: "Patagonia, AR",
      // Aquí intentamos buscar nombres comunes, pero el log nos dirá los de verdad
      wind_speed: (channels['Wind Speed'] || channels['viento'] || channels['WS_1'] || {}).value || null,
      wind_dir_value: (channels['Wind Direction'] || channels['direccion'] || {}).value || null,
      wind_dir_label: (channels['Wind Direction'] || {}).label || "N/A",
      temperature: (channels['Temperature'] || channels['temp'] || channels['T_1'] || {}).value || null,
      humidity: (channels['Humidity'] || channels['hum'] || {}).value || null,
      pressure: (channels['Pressure'] || channels['presion'] || {}).value || null,
      precipitation: (channels['Precipitation'] || channels['lluvia'] || {}).value || null
    }]);

    if (error) throw error;
    console.log("¡Proceso terminado! Revisa el log arriba para ver los nombres de los sensores.");

  } catch (err) {
    console.error("ERROR:");
    console.error(err.message);
    process.exit(1);
  }
}

sync();
