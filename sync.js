const { createClient } = require('@supabase/supabase-js');

async function sync() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const token = process.env.AMMONITOR_TOKEN;

  try {
    console.log("1. Buscando ID del proyecto PMXG...");
    const resProj = await fetch('https://or.ammonit.com/api/v1/projects/', {
      headers: { 'Authorization': `Token ${token}` }
    });
    const projects = await resProj.json();
    
    // Buscamos el proyecto que tenga la clave PMXG
    const project = projects.find(p => p.key === 'PMXG');
    if (!project) throw new Error("No se encontró el proyecto PMXG en tu cuenta.");
    
    const projectID = project.id;
    console.log(`Proyecto encontrado. ID: ${projectID}`);

    console.log("2. Obteniendo últimos datos...");
    const resData = await fetch(`https://or.ammonit.com/api/v1/projects/${projectID}/last-data/`, {
      headers: { 'Authorization': `Token ${token}` }
    });
    const data = await resData.json();

    if (!data.channels) throw new Error("No se recibieron canales de datos.");

    console.log("3. Guardando en Supabase...");
    
    // Mapeo dinámico de canales (AmmonitOR usa nombres como 'Wind Speed')
    // Si tus sensores tienen nombres distintos, cámbialos aquí:
    const insertData = {
      timestamp: data.timestamp,
      station_name: "Estación Tecnovex PMXG",
      location: "Patagonia, AR",
      wind_speed: data.channels['Wind Speed']?.value || null,
      wind_dir_value: data.channels['Wind Direction']?.value || null,
      wind_dir_label: data.channels['Wind Direction']?.label || "N/A",
      temperature: data.channels['Temperature']?.value || null,
      humidity: data.channels['Humidity']?.value || null,
      pressure: data.channels['Pressure']?.value || null,
      precipitation: data.channels['Precipitation']?.value || null
    };

    const { error } = await supabase.from('telemetria_live').insert([insertData]);

    if (error) throw error;

    console.log("--- ¡ÉXITO! ---");
    console.log(`Dato de las ${data.timestamp} guardado correctamente.`);

  } catch (err) {
    console.error("ERROR EN EL PROCESO:");
    console.error(err.message);
    process.exit(1);
  }
}

sync();
