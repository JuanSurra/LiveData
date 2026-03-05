const { createClient } = require('@supabase/supabase-js');

async function sync() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const token = process.env.AMMONITOR_TOKEN;
  
  // Ruta directa al dispositivo D223245
  const url = 'https://or.ammonit.com/api/PMXG/D223245/';

  console.log("Consultando datos del dispositivo directamente...");

  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Token ${token}` }
    });

    const device = await res.json();
    
    // Imprimimos las llaves para ver dónde están los datos de los CSV
    console.log("--- ESTRUCTURA DETECTADA ---");
    console.log("Llaves del JSON:", Object.keys(device));
    
    // Buscamos los datos en last_data (donde caen los CSV procesados)
    const data = device.last_data;

    if (!data) {
      console.log("AVISO: AmmonitOR tiene los archivos pero aún no ha extraído los datos a la base de datos.");
      console.log("Espera 5 minutos o verifica en AmmonitOR -> Data Tables si hay números.");
      return;
    }

    console.log("¡DATO ENCONTRADO!");
    console.log("Fecha del dato:", data.timestamp);
    const channels = data.channels || {};
    console.log("Canales disponibles:", Object.keys(channels));

    // Función para extraer valores buscando por nombres comunes
    const extraer = (tags) => {
      const key = Object.keys(channels).find(k => tags.some(t => k.toLowerCase().includes(t.toLowerCase())));
      return key ? channels[key].value : null;
    };

    // 2. INSERTAR EN SUPABASE
    const { error } = await supabase.from('telemetria_live').insert([{
      timestamp: data.timestamp,
      station_name: "Estación Tecnovex PMXG",
      location: "Patagonia, AR",
      wind_speed: extraer(['wind speed', 'viento', 'ws', 'speed']),
      wind_dir_value: extraer(['wind direction', 'dirección', 'wd', 'dir']),
      wind_dir_label: extraer(['wind direction', 'wd'])?.label || "N/A",
      temperature: extraer(['temperature', 'temp', 't']),
      humidity: extraer(['humidity', 'hum', 'h']),
      pressure: extraer(['pressure', 'presion', 'p']),
      precipitation: extraer(['precipitation', 'lluvia', 'rain'])
    }]);

    if (error) throw error;
    console.log("¡ÉXITO! Supabase actualizado con datos del CSV.");

  } catch (err) {
    console.error("ERROR:", err.message);
    process.exit(1);
  }
}

sync();
