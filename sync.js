async function sync() {
  const token = process.env.AMMONITOR_TOKEN;
  const url = 'https://or.ammonit.com/api/PMXG/D223245/';

  console.log("Consultando AmmonitOR...");

  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Token ${token}` }
    });

    const data = await res.json();
    
    console.log("--- CONTENIDO COMPLETO DEL JSON ---");
    console.log(JSON.stringify(data, null, 2)); 
    console.log("--- FIN DEL CONTENIDO ---");

    // Imprimimos también los nombres de las llaves principales por si el JSON es muy largo
    console.log("Llaves principales encontradas:", Object.keys(data));

  } catch (err) {
    console.error("ERROR:", err.message);
  }
}

sync();
