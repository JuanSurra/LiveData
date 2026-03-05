const { createClient } = require('@supabase/supabase-js');

async function sync() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const token = process.env.AMMONITOR_TOKEN;

  console.log("Conectando con la API de Proyecto PMXG...");

  try {
    // Paso 1: Obtener el ID numérico del proyecto (la clave PMXG a veces no basta)
    const resProj = await fetch('https://or.ammonit.com/api/v1/projects/', {
      headers: { 'Authorization': `Token ${token}` }
    });
    const projects = await resProj.json();
    const myProject = projects.find(p => p.key === 'PMXG');

    if (!myProject) throw new Error("No se encontró el proyecto PMXG. Revisa los permisos del Token.");
    
    const projectID = myProject.id;
    console.log(`ID de proyecto detectado: ${projectID}`);

    // Paso 2: Consultar el 'last-data' usando el ID numérico
    // Esta es la ruta que Ammonit actualiza con el Live Data
    const urlData = `https://or.ammonit.com/api/v1/projects/${projectID}/last-data/`;
    const resData = await fetch(urlData, {
      headers: { 'Authorization': `Token ${token}` }
    });

    if (!resData.ok) throw new Error(`Error al pedir datos: ${resData.status}`);
    const data = await resData.json();

    // Paso 3: Extraer los valores de los canales
    const channels = data.channels || {};
    console.log("Canales detectados en el chorro Live:", Object.keys(channels));

    if (Object.keys(channels).length === 0) {
      console.log("AVISO: El proyecto no tiene datos Live. Verifica que en el Meteo-40 la opción 'Permitir acceso a los datos sin restricciones' esté marcada.");
      return;
    }

    // Función para buscar valores (Viento, Temp, etc.)
    const getVal = (tags) => {
      for (let t of tags) {
        const key = Object.keys(channels).find(k => k.toLowerCase().includes(t.toLowerCase()));
        if (key) return channels[key].value;
      }
      return null;
    };

    // Paso 4: Guardar en Supabase (Cumpliendo el PDF de Tecnovex)
    const { error } = await supabase.from('telemetria_live').insert([{
      timestamp: data.timestamp || new Date().toISOString(),
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
    console.log("¡LOGRADO! Datos de Ammonit Live guardados en Supabase.");

  } catch (err) {
    console.error("ERROR:");
    console.error(err.message);
    process.exit(1);
  }
}

sync();
