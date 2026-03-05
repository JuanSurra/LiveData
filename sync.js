const { createClient } = require('@supabase/supabase-js');

async function sync() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const token = process.env.AMMONITOR_TOKEN;

  console.log("Intentando conectar con el dispositivo D223245...");

  try {
    // Probamos la URL directa del dispositivo
    const res = await fetch('https://or.ammonit.com/api/v1/devices/D223245/last-data/', {
      headers: { 'Authorization': `Token ${token}` }
    });

    if (!res.ok) {
        // Si falla la del dispositivo, probamos una vez más la del proyecto por si acaso
        console.log("Fallo dispositivo, probando por proyecto PMXG...");
        const resAlt = await fetch('https://or.ammonit.com/api/v1/projects/PMXG/last-data/', {
            headers: { 'Authorization': `Token ${token}` }
        });
        if (!resAlt.ok) throw new Error(`AmmonitOR respondió con error ${resAlt.status}`);
        var data = await resAlt.json();
    } else {
        var data = await res.json();
    }

    console.log("¡Datos recibidos! Timestamp:", data.timestamp);

    // Mapeo de canales (Ajusta los nombres si en tu AmmonitOR se llaman distinto)
    const { error } = await supabase.from('telemetria_live').insert([{
      timestamp: data.timestamp,
      station_name: "Estación Tecnovex PMXG",
      location: "Ubicación Estación",
      wind_speed: data.channels['Wind Speed']?.value || null,
      wind_dir_value: data.channels['Wind Direction']?.value || null,
      wind_dir_label: data.channels['Wind Direction']?.label || "N",
      temperature: data.channels['Temperature']?.value || null,
      humidity: data.channels['Humidity']?.value || null,
      pressure: data.channels['Pressure']?.value || null,
      precipitation: data.channels['Precipitation']?.value || null
    }]);

    if (error) throw error;
    console.log("Dato guardado con éxito en Supabase.");

  } catch (err) {
    console.error("ERROR CRÍTICO:");
    console.error(err.message);
    process.exit(1);
  }
}

sync();
