const { createClient } = require('@supabase/supabase-js');

async function sync() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const token = process.env.AMMONITOR_TOKEN;
  
  // Esta ruta contiene el resumen de los últimos datos procesados desde los CSV
  const url = 'https://or.ammonit.com/api/PMXG/loggers-list/';

  console.log("Buscando el último dato estadístico procesado...");

  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Token ${token}` }
    });

    const loggers = await res.json();
    const myLogger = loggers.find(l => l.serial === 'D223245');

    if (!myLogger || !myLogger.last_data) {
      console.log("AVISO: AmmonitOR aún no ha procesado el primer archivo CSV.");
      console.log("Asegúrate de que en el Meteo-40 -> Calendario -> AmmonitOR diga 'Success'.");
      return;
    }

    const data = myLogger.last_data;
    const channels = data.channels || {};
    
    console.log("¡Dato estadístico encontrado! Fecha:", data.timestamp);

    // Función para extraer valores (Viento, Temp, etc.)
    const getVal = (tags) => {
      const key = Object.keys(channels).find(k => tags.some(t => k.toLowerCase().includes(t.toLowerCase())));
      return key ? channels[key].value : null;
    };

    // 3. INSERTAR EN POSTGRESQL (SUPABASE)
    const { error } = await supabase.from('telemetria_live').insert([{
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
    }]);

    if (error) throw error;
    console.log("¡ÉXITO! El dato estadístico ya está en tu base de datos.");

  } catch (err) {
    console.error("ERROR:", err.message);
    process.exit(1);
  }
}

sync();
