const { createClient } = require('@supabase/supabase-js');

async function sync() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const token = process.env.AMMONITOR_TOKEN;
  
  // Esta ruta pide las últimas mediciones de la tabla de datos (los CSV ya procesados)
  const url = 'https://or.ammonit.com/api/PMXG/D223245/data/';

  console.log("Consultando la tabla de datos procesados...");

  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Token ${token}` }
    });

    if (!res.ok) {
      console.log(`La ruta /data/ no respondió (Error ${res.status}). Probando ruta /values/...`);
      // Plan B: Algunas versiones usan /values/ en lugar de /data/
      const resAlt = await fetch('https://or.ammonit.com/api/PMXG/D223245/values/', {
        headers: { 'Authorization': `Token ${token}` }
      });
      var data = await resAlt.json();
    } else {
      var data = await res.json();
    }

    // 'data' ahora debería ser una LISTA de mediciones
    const rows = Array.isArray(data) ? data : (data.results || []);

    if (rows.length === 0) {
      console.log("AVISO: La tabla de datos está vacía en AmmonitOR.");
      console.log("Verifica en la web de AmmonitOR -> Data Tables si realmente hay números.");
      return;
    }

    console.log(`¡Se encontraron ${rows.length} filas! Sincronizando...`);

    // Función para buscar sensores
    const getVal = (channels, tags) => {
      const key = Object.keys(channels || {}).find(k => tags.some(t => k.toLowerCase().includes(t.toLowerCase())));
      return key ? channels[key].value : null;
    };

    // Preparamos las filas para Supabase
    const rowsToInsert = rows.map(row => ({
      timestamp: row.timestamp,
      station_name: "Estación Tecnovex PMXG",
      location: "Patagonia, AR",
      wind_speed: getVal(row.channels, ['wind speed', 'viento', 'ws']),
      temperature: getVal(row.channels, ['temperature', 'temp', 't']),
      humidity: getVal(row.channels, ['humidity', 'hum', 'h']),
      pressure: getVal(row.channels, ['pressure', 'presion', 'p']),
      precipitation: getVal(row.channels, ['precipitation', 'lluvia', 'rain']),
      wind_dir_label: row.channels?.['Wind Direction']?.label || "N/A"
    }));

    // Usamos 'upsert' para que si el dato ya existe, no se duplique
    const { error } = await supabase
      .from('telemetria_live')
      .upsert(rowsToInsert, { onConflict: 'timestamp' });

    if (error) throw error;

    console.log("¡ÉXITO! Se han cargado los datos históricos y actuales en Supabase.");

  } catch (err) {
    console.error("ERROR:", err.message);
    process.exit(1);
  }
}

sync();
