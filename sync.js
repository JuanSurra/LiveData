const { createClient } = require('@supabase/supabase-js');

async function sync() {
  // 1. Configurar conexión a Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  console.log("Conectando a AmmonitOR...");
  
  try {
    // 2. Pedir datos a AmmonitOR (Usando tu Project Key PMXG)
    const res = await fetch('https://or.ammonit.com/api/v1/projects/PMXG/last-data/', {
      headers: { 'Authorization': `Token ${process.env.AMMONITOR_TOKEN}` }
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Error AmmonitOR: ${res.status} - ${errorText}`);
    }
    
    const data = await res.json();
    console.log("Datos recibidos de AmmonitOR:", data.timestamp);

    // 3. Insertar en Supabase (Tabla telemetria_live)
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
    
    console.log("¡Éxito! El dato se guardó en Supabase correctamente.");

  } catch (err) {
    console.error("ERROR EN LA SINCRONIZACIÓN:");
    console.error(err.message);
    process.exit(1); // Forzar que GitHub Actions marque error si algo falla
  }
}

sync();
