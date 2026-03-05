const { createClient } = require('@supabase/supabase-js');

async function sync() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const token = process.env.AMMONITOR_TOKEN;

  // Las 3 rutas posibles para el "Chorro" que ves en el Dashboard
  const rutasLive = [
    'https://or.ammonit.com/api/v1/livedata/?project_key=PMXG',
    'https://or.ammonit.com/api/v1/projects/PMXG/livedata/',
    'https://or.ammonit.com/api/PMXG/D223245/livedata/'
  ];

  console.log("--- BUSCANDO EL CHORRO DEL DASHBOARD ---");

  for (let url of rutasLive) {
    console.log(`Probando ruta: ${url}`);
    try {
      const res = await fetch(url, {
        headers: { 'Authorization': `Token ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        console.log("¡CONEXIÓN EXITOSA CON EL FLUJO LIVE!");
        
        // El JSON de Livedata suele ser un array o un objeto con los seriales
        const myData = Array.isArray(data) ? data.find(d => d.serial === 'D223245') : data['D223245'] || data;

        if (myData && myData.channels) {
          console.log("Datos encontrados. Guardando...");
          await saveToSupabase(supabase, myData);
          return; // Salir si funciona
        } else {
          console.log("Ruta conectada pero no hay canales. Respuesta:", JSON.stringify(data).substring(0, 100));
        }
      } else {
        console.log(`Ruta fallida (Status ${res.status})`);
      }
    } catch (e) {
      console.log(`Error de red: ${e.message}`);
    }
  }

  console.log("--- NO SE ENCONTRÓ LA RUTA ---");
  console.log("Si ves datos en el Dashboard, intenta esto: En AmmonitOR, ve a tu Perfil -> API y asegúrate de que el Token tenga permisos de 'Live Data'.");
}

async function saveToSupabase(supabase, myData) {
  const channels = myData.channels;
  // Buscamos los nombres que ves en el Dashboard negro
  const getVal = (tags) => {
    for (let t of tags) {
      const key = Object.keys(channels).find(k => k.toLowerCase().includes(t.toLowerCase()));
      if (key) return channels[key].value;
    }
    return null;
  };

  const { error } = await supabase.from('telemetria_live').insert([{
    timestamp: myData.timestamp || new Date().toISOString(),
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
