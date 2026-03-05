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

    const device = await res.json();
    
    // Buscamos las mediciones en last_data o en la raíz
    const measurements = device.last_data || device;
    const channels = measurements.channels || {};
    
    if (!measurements.timestamp || Object.keys(channels).length === 0) {
      console.log("AVISO: El equipo está conectado pero AmmonitOR aún no tiene mediciones.");
      console.log("Asegúrate de haber pulsado 'Iniciar ahora' en el Calendario del Meteo-40.");
      return;
    }

    console.log(`¡Datos detectados! Fecha del equipo: ${measurements.timestamp}`);

    const { error } = await supabase.from('telemetria_live').insert([{
      timestamp: measurements.timestamp,
      station_name: "Estación Tecnovex PMXG",
      location: "Patagonia, AR",
      // Mapeo de canales (ajusta los nombres si en AmmonitOR se llaman distinto)
      wind_speed: (channels['Wind Speed'] || {}).value || null,
      wind_dir_value: (channels['Wind Direction'] || {}).value || null,
      wind_dir_label: (channels['Wind Direction'] || {}).label || "N/A",
      temperature: (channels['Temperature'] || {}).value || null,
      humidity: (channels['Humidity'] || {}).value || null,
      pressure: (channels['Pressure'] || {}).value || null,
      precipitation: (channels['Precipitation'] || {}).value || null
    }]);

    if (error) throw error;
    console.log("¡ÉXITO! El dato se guardó correctamente en Supabase.");

  } catch (err) {
    console.error("ERROR:", err.message);
    process.exit(1);
  }
}

sync();
