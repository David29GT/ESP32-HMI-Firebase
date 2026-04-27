String formatearJSON(float* datos, int tamano) {
  String jsonArray = "[";
  for (int i = 0; i < tamano; i++) {
    jsonArray += String(datos[i]);
    if (i < tamano - 1) jsonArray += ",";
  }
  jsonArray += "]";
  return jsonArray;
}

// Aquí podrías agregar en el futuro la lectura real del sensor:
// float leerSensor() { return (analogRead(34) / 4095.0) * 100.0; }