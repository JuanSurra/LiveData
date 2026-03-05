const { createClient } = require('@supabase/supabase-js');

async function sync() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const token = process.env.AMMONITOR_TOKEN;

  // RUTAS OFICIALES SEGÚN TU MANUAL DE PYTHON
  // 1. Intentamos la ruta de "last-data" (la más probable para el Dashboard)
  // 2. Intentamos la ruta de "device" (la que funcionó antes pero venía vacía)
  const rutas = [
    'https://or.ammonit.com/api/PMXG/D223245/last-data/',
    'https://or.ammonit.com/api/PMXG/D223245/'
  ];

  console.log("--- INICIANDO CAPTURA DE DATOS ---");

  for (let url of rutas) {
    console.log(`Probando ruta: ${url}`);
    try {
      const res = await fetch(url, {
        headers: { 'Authorization': `Token ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        const channels = data.channels || (data.last_data ? data.last_data.channels : null);

        if (channels && Object.keys(channels).length > 0) {
          console.log("¡DATOS ENCONTRADOS! Sensores:", Object.keys(channels));
          await guardarEnSupabase(supabase, data, channels);
          return; // Éxito, salimos del bucle
        } else {
          console.log("Conectado, pero la lista de sensores sigue vacía.");
        }
      } else {
        console.log(`Ruta no disponible (Error ${res.status})`);
      }
    } catch (e) {
      console.log(`Error de conexión: ${e.message}`);
    }
  }

  console.log("--- NO SE PUDIERON OBTENER LOS VALORES ---");
  console.log("Si el Dashboard negro tiene números pero aquí no salen, haz esto:");
  console.log("En AmmonitOR web, ve a tu Proyecto -> 3rd party apps -> TecnovexAPI y asegúrate de que tenga permiso de 'READ LIVE DATA'.");
}

async function guardarEnSupabase(supabase, rawData, channels) {
  // Buscador de valores flexible
  const getVal = (tags) => {
    for (let t of tags) {
      const key = Object.keys(channels).find(k => k.toLowerCase().includes(t.toLowerCase()));
      if (key) return channels[key].value;
    }
    return null;
  };

  const { error } = await supabase.from('telemetria_live').insert([{
    timestamp: rawData.timestamp || new Date().toISOString(),
    station_name: "Estación Tecnovex PMXG",
    location: "Patagonia, AR",
    wind_speed: getVal(['Wind Speed', 'viento', 'WS']),
    wind_dir_value: getVal(['Wind Direction', 'dirección', 'WD']),
    wind_dir_label: channels['Wind Direction']?.label || "N/A",
    temperature: getVal(['Temperature', 'temp', 'T']),
    humidity: getVal(['Humidity', 'hum', 'H']),
    pressure: getVal(['Pressure', 'presion', 'P']),
    precipitation: getVal(['Precipitation', 'lluvia', 'Rain'])
  }]);

  if (error) throw error;
  console.log("¡Supabase actualizado con éxito!");
}

sync();
