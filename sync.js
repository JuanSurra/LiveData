const { createClient } = require('@supabase/supabase-js');

async function sync() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const token = process.env.AMMONITOR_TOKEN;
  const url = 'https://or.ammonit.com/api/PMXG/D223245/';

  try {
    const res = await fetch(url, { headers: { 'Authorization': `Token ${token}` } });
    const device = await res.json();
    
    // Buscamos las mediciones
    const measurements = device.last_data || device;
    const channels = measurements.channels || {};
    
    console.log("Sensores detectados:", Object.keys(channels));

    if (Object.keys(channels).length === 0) {
      console.log("AVISO: No hay sensores en el Livedata. Ve a 'Medición -> Canales' y marca 'Livedata' en cada uno.");
      return;
    }

    // Función para encontrar el valor sin importar el nombre exacto
    const getVal = (keys) => {
      for (let k of keys) {
        const found = Object.keys(channels).find(c => c.toLowerCase().includes(k.toLowerCase()));
        if (found) return channels[found].value;
      }
      return null;
    };

    const { error } = await supabase.from('telemetria_live').insert([{
      timestamp: measurements.timestamp,
      station_name: "Estación Tecnovex PMXG",
      location: "Patagonia, AR",
      wind_speed: getVal(['Wind Speed', 'viento', 'WS']),
      wind_dir_value: getVal(['Wind Direction', 'direccion', 'WD']),
      wind_dir_label: "N/A",
      temperature: getVal(['Temperature', 'temp', 'T']),
      humidity: getVal(['Humidity', 'hum', 'H']),
      pressure: getVal(['Pressure', 'presion', 'P']),
      precipitation: getVal(['Precipitation', 'lluvia', 'Rain'])
    }]);

    if (error) throw error;
    console.log(`¡ÉXITO! Datos de las ${measurements.timestamp} guardados.`);

  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}
sync();
