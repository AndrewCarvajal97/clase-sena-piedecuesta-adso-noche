import { MockProvider } from "./llm/providers/mock.js";

// Script de prueba TEMPORAL: lo borraremos en el paso 2.
const llm = new MockProvider();

const respuesta = await llm.chat([{ rol: "user", contenido: "Hola, me llamo Camila" }]);
console.log(respuesta);
