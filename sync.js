const { createClient } = require('@supabase/supabase-js');

async function sync() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const token = process.env.AMMONITOR_TOKEN;
  
  // Esta es la URL que suele contener las mediciones en vivo
  const url = 'https://or.ammonit.com/api/PMXG/D223245/last-data/';

  console.log("Consultando mediciones en vivo...");

  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Token ${token}` }
    });

    if (!res.ok) {
      throw new Error(`Error ${res.status}: No se pudo acceder a las mediciones.`);
    }

    const data = await res.json();
    
    // Imprimimos para confirmar qué sensores hay
    console.log("--- DATOS RECIBIDOS ---");
    console.log("Fecha del dato:", data.timestamp);
    console.log("Sensores encontrados:", Object.keys(data.channels || {}));
    
    if (!data.timestamp) {
      console.log("El JSON no tiene timestamp. Contenido recibido:", JSON.stringify(data));
      return;
    }

    const channels = data.channels || {};

    // GUARDAR EN SUPABASE
    // Nota: He puesto nombres de canales comunes. Si en el log ves nombres distintos, los cambiaremos.
    const { error } = await supabase.from('telemetria_live').insert([{
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
