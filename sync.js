const { createClient } = require('@supabase/supabase-js');

async function sync() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const token = process.env.AMMONITOR_TOKEN;
  
  // RUTA OFICIAL DEL MANUAL DE PYTHON
  const url = 'https://or.ammonit.com/api/PMXG/loggers-list/';

  console.log("Consultando la base de datos de AmmonitOR...");

  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Token ${token}` }
    });

    if (!res.ok) throw new Error(`Error ${res.status}: No se pudo acceder a la API.`);

    const loggers = await res.json();
    const myLogger = loggers.find(l => l.serial === 'D223245');

    if (!myLogger || !myLogger.last_data) {
      console.log("AVISO: AmmonitOR no tiene datos procesados para el equipo D223245.");
      console.log("Esto pasa porque los archivos CSV en AmmonitOR están marcados como 'Erroneous'.");
      console.log("Respuesta del servidor:", JSON.stringify(myLogger));
      return;
    }

    const data = myLogger.last_data;
    const channels = data.channels || {};
    
    console.log("¡DATO ENCONTRADO! Fecha:", data.timestamp);

    // Buscador flexible de sensores
    const getVal = (tags) => {
      const key = Object.keys(channels).find(k => tags.some(t => k.toLowerCase().includes(t.toLowerCase())));
      return key ? channels[key].value : null;
    };

    // 2. PREPARAR EL JSON PARA POSTGRESQL (CUMPLIENDO EL PDF)
    const insertData = {
      timestamp: data.timestamp,
      station_name: "Estación Tecnovex PMXG",
      location: "Patagonia, AR",
      wind_speed: getVal(['wind speed', 'viento', 'ws']),
      wind_dir_value: getVal(['wind direction', 'dirección', 'wd']),
      wind_dir_label: channels['Wind Direction']?.label || "N/A",
      temperature: getVal(['temperature', 'temp', 't']),
      humidity: getVal(['humidity', 'hum', 'h']),
      pressure: getVal(['pressure', 'presion', 'p']),
      precipitation: getVal(['precipitation', 'lluvia', 'rain'])
    };

    // 3. ENVIAR A SUPABASE (Usamos upsert para evitar duplicados si el dato ya existe)
    const { error } = await supabase
      .from('telemetria_live')
      .upsert([insertData], { onConflict: 'timestamp' });

    if (error) throw error;

    console.log("¡ÉXITO! El dato se ha sincronizado con Supabase.");

  } catch (err) {
    console.error("ERROR:");
    console.error(err.message);
    process.exit(1);
  }
}

sync();
