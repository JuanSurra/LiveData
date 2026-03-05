const { createClient } = require('@supabase/supabase-js');

async function sync() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const token = process.env.AMMONITOR_TOKEN;

  // Probaremos las dos variaciones de URL más comunes de Ammonit
  const urls = [
    'https://or.ammonit.com/api/v1/projects/',
    'https://www.ammonit-or.com/api/v1/projects/'
  ];

  console.log("--- INICIANDO DIAGNÓSTICO DE CONEXIÓN ---");

  for (let baseUrl of urls) {
    console.log(`\nProbando base: ${baseUrl}`);
    try {
      const res = await fetch(baseUrl, {
        headers: { 'Authorization': `Token ${token}` }
      });

      const contentType = res.headers.get("content-type");
      const text = await res.text();

      if (res.ok && contentType.includes("application/json")) {
        const projects = JSON.parse(text);
        const project = projects.find(p => p.key === 'PMXG');
        
        if (project) {
          console.log(`¡ÉXITO! Proyecto PMXG encontrado con ID: ${project.id}`);
          
          // Ahora pedimos los datos reales
          const dataRes = await fetch(`${baseUrl}${project.id}/last-data/`, {
            headers: { 'Authorization': `Token ${token}` }
          });
          const weatherData = await dataRes.json();
          
          console.log("Datos recibidos. Guardando en Supabase...");
          await saveToSupabase(supabase, weatherData);
          return; // Terminamos con éxito
        }
      } else {
        console.log(`Respuesta no válida de ${baseUrl}`);
        console.log(`Status: ${res.status}`);
        console.log(`¿Es HTML?: ${text.includes('<html')}`);
        // Si es HTML, mostramos solo el título para no llenar el log
        if (text.includes('<title>')) {
            console.log("Título de la página recibida:", text.match(/<title>(.*?)<\/title>/)[1]);
        }
      }
    } catch (err) {
      console.log(`Error conectando a ${baseUrl}: ${err.message}`);
    }
  }
  
  console.log("\n--- NO SE PUDO CONECTAR ---");
  console.log("Revisa que el Token sea correcto y que la App tenga acceso en AmmonitOR.");
  process.exit(1);
}

async function saveToSupabase(supabase, data) {
  const { error } = await supabase.from('telemetria_live').insert([{
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
  }]);
  if (error) throw error;
  console.log("¡Dato guardado exitosamente!");
}

sync();
