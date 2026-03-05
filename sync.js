const { createClient } = require('@supabase/supabase-js');

async function sync() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const token = process.env.AMMONITOR_TOKEN;
  
  // Esta es la URL que contiene el resumen de todos los equipos con su ULTIMO DATO
  const url = 'https://or.ammonit.com/api/PMXG/loggers-list/';

  console.log("Buscando datos en el resumen del proyecto PMXG...");

  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Token ${token}` }
    });

    if (!res.ok) throw new Error(`Error ${res.status}: No se pudo acceder a la lista.`);

    const loggers = await res.json();
    
    // Buscamos tu equipo D223245 en la lista
    const myLogger = loggers.find(l => l.serial === 'D223245');

    if (!myLogger) {
      console.log("No se encontró el equipo D223245. Equipos en este proyecto:", loggers.map(l => l.serial));
      return;
    }

    // Los datos reales están en 'last_data'
    const data = myLogger.last_data;

    if (!data || !data.channels) {
      console.log("El equipo está en la lista pero no tiene 'last_data'.");
      console.log("Asegúrate de que el Live Dashboard negro tenga números moviéndose ahora mismo.");
      return;
    }

    console.log("¡DATOS ENCONTRADOS! Fecha:", data.timestamp);
    const channels = data.channels;

    // Función para buscar el valor sin importar si el nombre tiene espacios o mayúsculas
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
      wind_dir_label: getVal(['wind direction', 'wd'])?.label || "N/A",
      temperature: getVal(['temperature', 'temp', 't']),
      humidity: getVal(['humidity', 'hum', 'h']),
      pressure: getVal(['pressure', 'presion', 'p']),
      precipitation: getVal(['precipitation', 'lluvia', 'rain'])
    };

    // 3. ENVIAR A SUPABASE
    const { error } = await supabase.from('telemetria_live').insert([insertData]);

    if (error) throw error;

    console.log("¡ÉXITO TOTAL! Los datos ya están en Supabase.");

  } catch (err) {
    console.error("ERROR:");
    console.error(err.message);
    process.exit(1);
  }
}

sync();
