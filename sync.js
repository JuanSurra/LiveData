const { createClient } = require('@supabase/supabase-js');

async function sync() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const token = process.env.AMMONITOR_TOKEN;
  
  // URL CORRECTA SEGÚN EL MANUAL: /api/PROYECTO/SERIAL/
  const url = 'https://or.ammonit.com/api/PMXG/D223245/';

  console.log("Conectando a AmmonitOR...");

  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Token ${token}` }
    });

    // Verificamos si la respuesta es exitosa
    if (!res.ok) {
      throw new Error(`Error del servidor Ammonit: ${res.status}`);
    }

    const data = await res.json();
    
    // En AmmonitOR, cuando el Live Data está activo, 
    // las mediciones vienen dentro de 'last_data' o directamente en la raíz
    const measurements = data.last_data || data;
    const channels = measurements.channels || {};

    if (Object.keys(channels).length === 0) {
      console.log("AVISO: Conexión exitosa pero no hay canales de datos activos.");
      return;
    }

    // Mapeo de datos para PostgreSQL (Supabase)
    // Usamos los nombres de canales que suelen venir por defecto
    const insertData = {
      timestamp: measurements.timestamp || new Date().toISOString(),
      station_name: "Estación Tecnovex PMXG",
      location: "Patagonia, AR",
      wind_speed: channels['Wind Speed']?.value || channels['WS_1']?.value || null,
      wind_dir_value: channels['Wind Direction']?.value || channels['WD_1']?.value || null,
      wind_dir_label: channels['Wind Direction']?.label || "N/A",
      temperature: channels['Temperature']?.value || channels['T_1']?.value || null,
      humidity: channels['Humidity']?.value || channels['H_1']?.value || null,
      pressure: channels['Pressure']?.value || channels['P_1']?.value || null,
      precipitation: channels['Precipitation']?.value || channels['Rain']?.value || null
    };

    console.log("Guardando en Supabase...");
    const { error } = await supabase.from('telemetria_live').insert([insertData]);

    if (error) throw error;

    console.log("¡Sincronización exitosa! Datos guardados.");

  } catch (err) {
    console.error("ERROR CRÍTICO:");
    console.error(err.message);
    process.exit(1);
  }
}

sync();
