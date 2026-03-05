const { createClient } = require('@supabase/supabase-js');

async function sync() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const token = process.env.AMMONITOR_TOKEN;
  
  // Usamos la ruta oficial del manual: loggers-list
  const url = 'https://or.ammonit.com/api/PMXG/loggers-list/';

  console.log("Consultando lista de equipos en proyecto PMXG...");

  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Token ${token}` }
    });

    if (!res.ok) {
      throw new Error(`Error ${res.status}: No se pudo obtener la lista de equipos.`);
    }

    const loggers = await res.json();
    
    // Buscamos tu equipo D223245 en la lista
    const myLogger = loggers.find(l => l.serial === 'D223245');

    if (!myLogger) {
      console.log("No se encontró el equipo D223245 en la lista. Equipos disponibles:", loggers.map(l => l.serial));
      return;
    }

    // En loggers-list, los datos suelen venir en 'last_data' o directamente en el objeto
    const measurements = myLogger.last_data || myLogger;
    
    if (!measurements.timestamp) {
      console.log("El equipo no tiene mediciones recientes. Contenido del equipo:", JSON.stringify(myLogger).substring(0, 200));
      return;
    }

    console.log("¡Datos encontrados! Fecha:", measurements.timestamp);
    const channels = measurements.channels || {};

    // GUARDAR EN SUPABASE
    const { error } = await supabase.from('telemetria_live').insert([{
      timestamp: measurements.timestamp,
      station_name: "Estación Tecnovex PMXG",
      location: "Patagonia, AR",
      wind_speed: (channels['Wind Speed'] || channels['viento'] || {}).value || null,
      wind_dir_value: (channels['Wind Direction'] || channels['direccion'] || {}).value || null,
      wind_dir_label: (channels['Wind Direction'] || {}).label || "N/A",
      temperature: (channels['Temperature'] || channels['temp'] || {}).value || null,
      humidity: (channels['Humidity'] || channels['hum'] || {}).value || null,
      pressure: (channels['Pressure'] || channels['presion'] || {}).value || null,
      precipitation: (channels['Precipitation'] || channels['lluvia'] || {}).value || null
    }]);

    if (error) throw error;
    console.log("¡ÉXITO! El dato se guardó correctamente en Supabase.");

  } catch (err) {
    console.error("ERROR:");
    console.error(err.message);
    process.exit(1);
  }
}

sync();
