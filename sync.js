const { createClient } = require('@supabase/supabase-js');

async function sync() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const token = process.env.AMMONITOR_TOKEN;
  
  // URL específica para capturar el chorro de datos que ves en el Dashboard
  const url = 'https://or.ammonit.com/api/v1/projects/PMXG/livedata/';

  console.log("Capturando datos del flujo en tiempo real...");

  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Token ${token}` }
    });

    if (!res.ok) throw new Error(`Error ${res.status}: No se pudo conectar al flujo Live.`);

    const data = await res.json();
    
    // El endpoint /livedata/ devuelve una lista de dispositivos. Buscamos el tuyo.
    const myDevice = data.find(d => d.serial === 'D223245');

    if (!myDevice || !myDevice.channels) {
      console.log("El dispositivo D223245 no tiene datos live en este momento.");
      console.log("Respuesta completa del servidor:", JSON.stringify(data));
      return;
    }

    const channels = myDevice.channels;
    console.log("¡DATOS CAPTURADOS! Sensores:", Object.keys(channels));

    // Función para extraer valores (buscamos los nombres que ves en el Dashboard)
    const extraer = (nombres) => {
      for (let n of nombres) {
        if (channels[n]) return channels[n].value;
      }
      return null;
    };

    // GUARDAR EN SUPABASE
    const { error } = await supabase.from('telemetria_live').insert([{
      timestamp: new Date().toISOString(), // Usamos la hora actual del servidor
      station_name: "Estación Tecnovex PMXG",
      location: "Patagonia, AR",
      // AJUSTA ESTOS NOMBRES según lo que leas en tu Dashboard negro
      wind_speed: extraer(['Wind Speed', 'viento', 'WS']), 
      wind_dir_value: extraer(['Wind Direction', 'dirección', 'WD']),
      wind_dir_label: channels['Wind Direction']?.label || "N/A",
      temperature: extraer(['Temperature', 'temp', 'T']),
      humidity: extraer(['Humidity', 'hum', 'H']),
      pressure: extraer(['Pressure', 'presion', 'P']),
      precipitation: extraer(['Precipitation', 'lluvia', 'Rain'])
    }]);

    if (error) throw error;
    console.log("¡ÉXITO! Los datos del Dashboard ya están en tu Supabase.");

  } catch (err) {
    console.error("ERROR:");
    console.error(err.message);
    process.exit(1);
  }
}

sync();
