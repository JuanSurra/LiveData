const { createClient } = require('@supabase/supabase-js');

async function sync() {
  // 1. Configurar conexión a Supabase
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const token = process.env.AMMONITOR_TOKEN;

  // URL de AmmonitOR (Ajustada a tu proyecto y equipo)
  const url = 'https://or.ammonit.com/api/PMXG/D223245/last-data/';

  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Token ${token}` }
    });
    const data = await res.json();

    // 2. Mapeo de datos: Extraemos los valores de los canales de AmmonitOR
    // Si el canal no existe, se guarda como null automáticamente
    const channels = data.channels || {};

    // Este es el objeto JSON que se enviará a PostgreSQL
    const insertData = {
      timestamp: data.timestamp, // Fecha y hora de la lectura
      station_name: "Estación Tecnovex PMXG",
      location: "Patagonia, AR",
      wind_speed: channels['Wind Speed']?.value ?? null,
      wind_dir_value: channels['Wind Direction']?.value ?? null,
      wind_dir_label: channels['Wind Direction']?.label ?? "N/A",
      temperature: channels['Temperature']?.value ?? null,
      humidity: channels['Humidity']?.value ?? null,
      pressure: channels['Pressure']?.value ?? null,
      precipitation: channels['Precipitation']?.value ?? null
    };

    console.log("Enviando el siguiente JSON a PostgreSQL:", JSON.stringify(insertData, null, 2));

    // 3. Inserción en la tabla telemetria_live
    const { error } = await supabase
      .from('telemetria_live')
      .insert([insertData]);

    if (error) throw error;

    console.log("¡Sincronización exitosa! Dato guardado en la base de datos centralizada.");

  } catch (err) {
    console.error("Error en la sincronización:", err.message);
    process.exit(1);
  }
}

sync();
