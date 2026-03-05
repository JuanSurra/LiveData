const { createClient } = require('@supabase/supabase-js');

async function sync() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const token = process.env.AMMONITOR_TOKEN;
  
  // Probamos la ruta que nos devolvió la ficha técnica antes, pero con el buscador de canales
  const url = 'https://or.ammonit.com/api/PMXG/D223245/';

  console.log("Extrayendo datos en tiempo real...");

  try {
    const res = await fetch(url, { headers: { 'Authorization': `Token ${token}` } });
    const device = await res.json();
    
    // Buscamos los canales en cualquier lugar del JSON (last_data o raíz)
    const channels = device.last_data?.channels || device.channels || {};
    const timestamp = device.last_data?.timestamp || device.timestamp || new Date().toISOString();

    console.log("Canales encontrados:", Object.keys(channels));

    if (Object.keys(channels).length === 0) {
      console.log("AVISO: AmmonitOR reconoce el equipo pero no ve los canales. Revisa en el Meteo-40: Medición -> Canales -> (Tu sensor) -> Marca la casilla 'Livedata'.");
      return;
    }

    // Función mágica para encontrar valores sin importar el nombre exacto
    const extraer = (tags) => {
      for (let tag of tags) {
        const key = Object.keys(channels).find(c => c.toLowerCase().includes(tag.toLowerCase()));
        if (key && channels[key].value !== undefined) return channels[key].value;
      }
      return null;
    };

    const { error } = await supabase.from('telemetria_live').insert([{
      timestamp: timestamp,
      station_name: "Estación Tecnovex PMXG",
      location: "Patagonia, AR",
      wind_speed: extraer(['Wind Speed', 'viento', 'WS', 'Speed']),
      wind_dir_value: extraer(['Wind Direction', 'dirección', 'WD', 'Dir']),
      wind_dir_label: "N/A",
      temperature: extraer(['Temperature', 'temp', 'T']),
      humidity: extraer(['Humidity', 'hum', 'H']),
      pressure: extraer(['Pressure', 'presion', 'P', 'Baro']),
      precipitation: extraer(['Precipitation', 'lluvia', 'Rain', 'Precip'])
    }]);

    if (error) throw error;
    console.log(`¡EXITO! Datos guardados correctamente. Fecha: ${timestamp}`);

  } catch (err) {
    console.error("ERROR:", err.message);
    process.exit(1);
  }
}
sync();
