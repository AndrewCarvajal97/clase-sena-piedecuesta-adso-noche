/**
 * CONTENIDO DIDÁCTICO del tutorial paso a paso.
 * El código de cada archivo NO se escribe aquí: lo toma el generador del proyecto real (../../codigo).
 * Aquí solo va lo que explica: por qué existe cada cosa y qué problema resuelve.
 *
 * Campos de cada paso:
 *   archivos[ruta] = { porque, mira[] }   → obligatorio para todo archivo nuevo o modificado
 *   ejecutar[]     = { cmd, run?, nota, variable?, manual? }
 *                    run = comando real que el generador ejecuta para capturar la salida
 *                    manual = no se ejecuta (necesita internet, claves o instalación)
 */

export const inicio = {
  titulo: "Crear agentes de IA desde cero, paso a paso",
  subtitulo: "De un script vacío a un equipo de agentes: TypeScript + Node + Strategy (Gemini · Cohere · Groq)",
  comoUsar: [
    {
      t: "Modo A · Programar en vivo (recomendado)",
      d: "Crea la carpeta del proyecto y avanza paso a paso: lee la sección «Qué problema resuelve», escribe los archivos de «Qué crear» (puedes copiarlos con el botón) y ejecuta los comandos. Compara tu salida con «Debes ver».",
    },
    {
      t: "Modo B · Checkpoints (para no quedarte atrás)",
      d: "La carpeta checkpoints/paso-NN contiene el proyecto COMPLETO tal como queda al terminar cada paso. Si un aprendiz se pierde, copia el checkpoint, ejecuta npm install y continúa desde ahí.",
    },
    {
      t: "Modo C · Solo lectura",
      d: "Cada paso explica el porqué de cada archivo con las líneas importantes señaladas. Sirve para repasar o para preparar tu clase.",
    },
  ],
  principios: [
    ["Un paso = una capacidad nueva", "Cada paso agrega UNA idea y termina con algo que se ejecuta y se ve funcionando."],
    ["Primero el problema, luego el código", "Antes de escribir nada se explica qué duele sin esa pieza. Así el código se entiende como solución, no como magia."],
    ["Siempre sin claves", "Todo funciona con LLM_PROVIDER=mock (sin internet ni gastar cuota). Los proveedores reales se conectan en el paso 3 y no cambian ni una línea de los agentes."],
    ["Sin frameworks", "Solo TypeScript, Node y fetch. Así se ve qué hace realmente un agente por dentro."],
    ["Cada paso está verificado", "Un generador construye cada checkpoint, comprueba que compile con tsc y ejecuta los comandos para capturar la salida real que ves en cada paso."],
  ],
  mapa: [
    ["Preparación", "0", "Entorno, TypeScript y estructura base"],
    ["Nivel 0 · Llamada simple", "1 – 2", "Contrato LLMProvider, mock, fábrica, medidor"],
    ["Infraestructura de proveedores", "3 – 4", "Gemini, Cohere, Groq, reintentos y Fallback"],
    ["Nivel 1 · Chatbot con memoria", "5", "Rol (system prompt) y memoria como Strategy"],
    ["Nivel 2 · Agente con herramientas", "6 – 7", "Tools, calculadora segura, protocolo JSON, ToolAgent"],
    ["Nivel 3 · ReAct", "8", "El bucle pensar → actuar → observar y sus defensas"],
    ["Nivel 3b · Skills", "9", "Conocimiento experto en SKILL.md cargado bajo demanda"],
    ["Nivel 4 · Planificador", "10", "Plan → ejecutar → sintetizar"],
    ["Nivel 5 · Multi-agente", "11", "Orquestador, especialistas y tablero de administración"],
    ["Retos", "12", "Extender el sistema sin tocar los agentes"],
  ],
  /** Estructura final del proyecto y por qué existe cada carpeta. */
  estructura: [
    { ruta: "agentes-desde-cero/", que: "Raíz del proyecto", porque: "Todo lo que se instala y ejecuta vive aquí.", paso: 0 },
    { ruta: "package.json · tsconfig.json", que: "Identidad del proyecto y reglas de TypeScript", porque: "Hacen que todos tengan el mismo entorno y que los errores aparezcan al escribir.", paso: 0 },
    { ruta: ".env.example → .env", que: "Configuración y secretos", porque: "Las claves y el proveedor elegido no se escriben en el código ni se suben a GitHub.", paso: 2 },
    { ruta: "skills/", que: "Conocimiento experto en Markdown (SKILL.md)", porque: "Enseña al agente CÓMO hacer tareas sin recompilar código.", paso: 9 },
    { ruta: "src/llm/", que: "Todo lo que habla con modelos de lenguaje", porque: "Aísla a los agentes de los proveedores: aquí vive el patrón Strategy.", paso: 1 },
    { ruta: "src/llm/types.ts", que: "El contrato LLMProvider", porque: "La interfaz común que todo proveedor cumple.", paso: 1 },
    { ruta: "src/llm/providers/", que: "Una clase por proveedor", porque: "Gemini, Cohere, Groq, Mock y Fallback: intercambiables.", paso: 1 },
    { ruta: "src/llm/factory.ts · medido.ts", que: "Fábrica, Singleton y medidor", porque: "Elegir y reutilizar el proveedor desde .env, y controlar llamadas/tokens (Decorator).", paso: 2 },
    { ruta: "src/tools/", que: "Las «manos» del agente", porque: "Funciones normales con una descripción que el LLM lee.", paso: 6 },
    { ruta: "src/agentes/", que: "Los «cerebros» (niveles 1 al 5)", porque: "ChatAgent, ToolAgent, ReActAgent, Planificador y Orquestador, más memoria, protocolo y eventos.", paso: 5 },
    { ruta: "src/skills/", que: "Cargador de skills", porque: "Lee skills/*/SKILL.md y las entrega por demanda.", paso: 9 },
    { ruta: "src/util/", que: "Utilidades pequeñas", porque: "HTTP con reintentos, extracción de JSON y colores de consola.", paso: 2 },
    { ruta: "src/niveles/", que: "Los ejecutables de la clase", porque: "Un script por nivel: lo que se corre y se muestra a los aprendices.", paso: 2 },
    { ruta: "src/soluciones/", que: "Retos resueltos", porque: "Muestran cómo extender el sistema sin tocar los agentes.", paso: 12 },
    { ruta: "src/bootstrap.ts · config.ts", que: "Arranque compartido", porque: "Crear el LLM, cargar .env y manejar errores igual en todos los scripts.", paso: 2 },
    { ruta: "src/verificar.ts", que: "Pruebas sin internet", porque: "Red de seguridad que usa el Mock: crece con cada paso.", paso: 2 },
  ],
};

export const pasos = [
  // =====================================================================================
  {
    id: 0, slug: "preparar-proyecto", titulo: "Preparar el proyecto", nivel: "Preparación", minutos: 10,
    objetivo: "Tener una carpeta con Node, TypeScript y tsx funcionando, y comprobarlo con un «Hola».",
    problema:
      "Antes de escribir un solo agente necesitas un entorno que sea IGUAL para todos los aprendices y que te avise de los errores mientras escribes (no cuando ya está en producción). Sin esto, el 30 % de la clase se pierde en «a mí no me corre».",
    conceptos: [
      { t: "Node.js + ESM", d: "Con \"type\": \"module\" usamos import/export (el estándar moderno) en vez de require()." },
      { t: "TypeScript estricto", d: "JavaScript con tipos. Con strict activado, el editor marca errores como «esto puede ser undefined» antes de ejecutar." },
      { t: "tsx", d: "Ejecuta archivos .ts directamente, sin compilar a mano. Es lo que usan todos los npm run de este proyecto." },
    ],
    antes: ["mkdir agentes-desde-cero", "cd agentes-desde-cero", "mkdir src", "node -v    # debe ser v20.12 o superior (recomendado 22)"],
    archivos: {
      "package.json": {
        porque: "La tarjeta de identidad del proyecto: nombre, scripts y dependencias. `npm install` lee las dependencias de aquí.",
        mira: [
          "\"type\": \"module\" → habilita import/export modernos (ESM).",
          "\"engines\" avisa si tu Node es demasiado viejo (más adelante usaremos process.loadEnvFile, de Node 20.12+).",
          "Solo 3 dependencias de desarrollo: typescript, tsx y @types/node. NO hay frameworks: construiremos todo desde cero.",
          "\"typecheck\": revisa tipos sin ejecutar. Cada paso agregará sus propios scripts.",
        ],
      },
      "tsconfig.json": {
        porque: "Le dice a TypeScript qué tan estricto ser. Queremos detectar errores al escribir, no con un cliente enojado.",
        mira: [
          "\"strict\": true → activa todas las comprobaciones fuertes de tipos.",
          "\"noUncheckedIndexedAccess\": true → obliga a tratar `lista[0]` como posiblemente undefined (evita muchos bugs).",
          "\"moduleResolution\": \"Bundler\" → permite escribir imports con extensión .js aunque el archivo sea .ts.",
          "\"noEmit\": true → tsc solo revisa; quien ejecuta es tsx.",
        ],
      },
      ".gitignore": {
        porque: "Evita subir al repositorio lo que NUNCA debe subirse: tus claves y las dependencias pesadas.",
        mira: ["`.env` contendrá tus API keys: jamás debe llegar a GitHub.", "`node_modules/` se regenera con npm install."],
      },
      "src/hola.ts": {
        porque: "Prueba de humo: si esto corre, Node + TypeScript + tsx funcionan y podemos construir encima. Lo borraremos en el paso 1.",
        mira: ["`const nombre: string` ya es TypeScript: si le asignas un número, el editor te marca error."],
      },
    },
    ejecutar: [
      { cmd: "npm install", manual: true, nota: "Descarga TypeScript, tsx y @types/node dentro de node_modules/." },
      { cmd: "npm run typecheck", run: "npm run -s typecheck", nota: "No imprime nada cuando todo está bien (silencio = éxito)." },
      { cmd: "npx tsx src/hola.ts", run: "npx tsx src/hola.ts", nota: "Tu versión de Node puede variar." , variable: true },
    ],
    checkpoint: "El comando `npx tsx src/hola.ts` imprime el saludo y `npm run typecheck` no muestra errores.",
    preguntas: [
      "¿Por qué usamos tsx en vez de compilar con tsc y ejecutar el JavaScript resultante?",
      "¿Qué ventaja tiene que `strict` esté activado desde el primer día?",
    ],
    errores: [
      { s: "'tsx' no se reconoce como un comando", c: "No ejecutaste npm install, o estás en otra carpeta. Verifica con `ls` que ves package.json." },
      { s: "Cannot use import statement outside a module", c: "Falta \"type\": \"module\" en package.json." },
    ],
    siguiente: "En el paso 1 definimos el contrato que hará que nuestros agentes funcionen con CUALQUIER modelo de lenguaje.",
  },

  // =====================================================================================
  {
    id: 1, slug: "contrato-llmprovider", titulo: "El contrato LLMProvider y un LLM de mentira", nivel: "Nivel 0 · parte 1", minutos: 15,
    objetivo: "Definir la interfaz común de todos los LLM y crear el primer «proveedor»: un mock que funciona sin internet.",
    problema:
      "Cada proveedor (Gemini, Cohere, Groq) usa un formato distinto. Si tu agente habla directamente con uno, cambiar de proveedor significa reescribir todo, y no puedes practicar sin internet ni gastar cuota. La solución es definir UNA interfaz y que todo dependa de ella: el patrón Strategy.",
    conceptos: [
      { t: "Patrón Strategy", d: "Varias clases intercambiables que cumplen la misma interfaz. El agente solo conoce la interfaz, nunca la clase concreta." },
      { t: "Mensaje y roles", d: "Una conversación es una lista de mensajes con rol: system (reglas), user (la persona) y assistant (el modelo)." },
      { t: "Mock", d: "Un «LLM falso» con reglas simples. Permite desarrollar, probar y dar la clase sin claves ni internet." },
    ],
    archivos: {
      "src/llm/types.ts": {
        porque: "El contrato. Define cómo se ve un mensaje y qué debe saber hacer cualquier LLM: recibir mensajes y devolver texto.",
        mira: [
          "`Mensaje { rol, contenido }` es NUESTRO formato único. Cada proveedor lo traducirá al suyo.",
          "`LLMProvider` solo tiene dos miembros: `nombre` y `chat()`. Entra una lista de mensajes, sale TEXTO. Es todo lo que un agente necesita.",
          "`OpcionesChat`: temperatura, maxTokens y json, que casi todos los modelos entienden.",
          "`ErrorLLM`: un error propio para distinguir fallos de red/API de nuestros bugs (lo usaremos en reintentos y fallback).",
        ],
      },
      "src/llm/providers/mock.ts": {
        porque: "Nuestra primera estrategia concreta. No es inteligente: responde con reglas simples. Sirve para desarrollar sin internet, hacer pruebas repetibles y no gastar cuota.",
        mira: [
          "`implements LLMProvider`: TypeScript obliga a cumplir el contrato; si olvidas `chat()` no compila.",
          "`conversar()`: si en el historial hay «me llamo X» y preguntan «¿cómo me llamo?», responde X. Así demostraremos que la «memoria» es el historial que TÚ reenvías.",
          "Por ahora solo conversa. El mock crecerá en cada paso para entender cada nueva capacidad.",
        ],
      },
      "src/probar.ts": {
        porque: "Un script de prueba temporal para ver nuestro mock en acción. Lo borraremos en el paso 2 cuando exista el primer nivel real.",
        mira: ["Usa `await` en el nivel superior (posible porque el proyecto es ESM).", "Fíjate: el código que llama no sabe nada de cómo responde el mock; solo usa `chat()`."],
      },
    },
    ejecutar: [
      { cmd: "npx tsx src/probar.ts", run: "npx tsx src/probar.ts", nota: "Debe imprimir el saludo del mock." },
      { cmd: "npm run typecheck", run: "npm run -s typecheck", nota: "Sin errores." },
    ],
    checkpoint: "Ves el saludo «Soy un LLM simulado (mock)». Ya tenemos un contrato y una implementación.",
    preguntas: [
      "Mañana quieres usar Gemini: ¿qué archivo del «agente» tendrías que modificar? (Ninguno: solo crear otra clase que implemente LLMProvider.)",
      "¿Por qué `chat()` devuelve un string y no un objeto complejo?",
    ],
    errores: [
      { s: "Cannot find module './llm/providers/mock.js'", c: "En ESM con TypeScript se importa con extensión .js aunque el archivo sea .ts. Es normal." },
      { s: "Class 'MockProvider' incorrectly implements interface 'LLMProvider'", c: "Falta `nombre` o `chat()`, o su firma no coincide con el contrato." },
    ],
    siguiente: "En el paso 2 elegimos el proveedor desde un archivo .env, medimos cada llamada y construimos el Nivel 0.",
  },

  // =====================================================================================
  {
    id: 2, slug: "nivel0-config-fabrica-medidor", titulo: "Configuración, fábrica, medidor y el Nivel 0", nivel: "Nivel 0 · parte 2", minutos: 20,
    objetivo: "Elegir el proveedor desde .env, medir llamadas y tokens, y demostrar con código que un LLM NO tiene memoria.",
    problema:
      "Ya hay contrato, pero faltan tres cosas: (1) elegir el proveedor desde configuración y no desde el código; (2) saber cuánto cuesta cada llamada antes de que llegue la factura; (3) ver con tus propios ojos que cada llamada nace de cero.",
    conceptos: [
      { t: ".env y process.loadEnvFile", d: "Variables de configuración y secretos fuera del código. Node 20.12+ las lee sin instalar «dotenv»." },
      { t: "Fábrica + Singleton", d: "La fábrica elige el proveedor y conserva una instancia por proveedor durante la ejecución. Así se reutilizan clientes sin compartir el presupuesto del medidor." },
      { t: "Decorator (LLMMedido)", d: "Envuelve cualquier proveedor y le agrega métricas y un tope de llamadas sin modificarlo." },
      { t: "Sin estado (stateless)", d: "Cada llamada es independiente. La «memoria» es reenviar mensajes anteriores." },
    ],
    antes: ["copy .env.example .env     # Mac/Linux: cp .env.example .env   (lo crearás tras escribir el archivo)"],
    archivos: {
      "src/config.ts": {
        porque: "Carga el archivo .env al arrancar y ofrece `env()` para leer variables. Centraliza la configuración en un solo punto.",
        mira: ["`process.loadEnvFile` viene incluido en Node 20.12+: cero dependencias extra.", "`env(nombre)` devuelve undefined si la variable está vacía, para poder usar `??` con valores por defecto."],
      },
      "src/util/consola.ts": {
        porque: "Colores y un título para que la salida en consola sea legible en clase. Puro «azúcar» de presentación.",
        mira: ["Los códigos \\x1b[...m son secuencias ANSI que cualquier terminal moderna entiende."],
      },
      "src/llm/factory.ts": {
        porque: "La fábrica de estrategias con caché Singleton por proveedor. Lee LLM_PROVIDER, crea el proveedor una sola vez por proceso y entrega siempre esa misma instancia.",
        mira: [
          "El resto del proyecto llamará a `crearProveedor()` y recibirá un `LLMProvider`: no sabrá qué hay detrás.",
          "La caché usa el nombre normalizado (`mock` y `MOCK` comparten instancia).",
          "El Singleton se aplica al proveedor, que es el cliente reutilizable; `LLMMedido` sigue siendo nuevo por ejecución para no mezclar métricas ni presupuestos.",
          "El valor por defecto es «mock»: si olvidas configurar, nada se rompe ni se gasta dinero.",
          "Si el nombre no existe, el error dice cuáles existen: mensajes de error útiles ahorran preguntas.",
        ],
      },
      "src/llm/medido.ts": {
        porque: "Un contador de llamadas, tokens y tiempo, con tope de seguridad. Si un agente se descontrola, el tope lo detiene antes de gastar tu cuota.",
        mira: [
          "Patrón Decorator: recibe un `LLMProvider` y TAMBIÉN es un `LLMProvider`. Por eso se puede poner sobre cualquier proveedor.",
          "`estimarTokens`: ≈ 4 caracteres por token. No es exacto, pero basta para vigilar costos.",
          "`maxLlamadas`: lanza «Presupuesto agotado» al pasarse. Es nuestro primer límite de administración.",
          "El `finally` mide el tiempo incluso cuando la llamada falla.",
        ],
      },
      "src/bootstrap.ts": {
        porque: "Lo que todos los scripts necesitan al arrancar: crear el LLM (ya medido) y mostrar errores de forma amable.",
        mira: ["`crearLLM()` = fábrica + medidor con un solo llamado.", "`manejarErrorFatal` evita pantallas de stack-trace gigantes frente a los aprendices y sugiere usar el mock."],
      },
      "src/niveles/nivel0-llamada.ts": {
        porque: "El Nivel 0: una llamada simple. Aquí demostramos en vivo que el LLM no recuerda y que la memoria la creamos nosotros.",
        mira: [
          "Llamada 1: «me llamo Camila». Llamada 2: «¿cómo me llamo?» SIN historial → no lo sabe.",
          "Llamada 3: reenviamos el historial → ahora sí. La memoria es un truco nuestro, no del modelo.",
          "Al final imprime `llm.resumen()`: llamadas, tokens y tiempo.",
        ],
      },
      ".env.example": {
        porque: "Plantilla de configuración que SÍ se sube a GitHub (sin secretos). Cada persona la copia a `.env` y pone lo suyo.",
        mira: ["`LLM_PROVIDER=mock` → todo funciona sin claves.", "El `.env` real está en .gitignore."],
      },
      "src/verificar.ts": {
        porque: "Nuestras pruebas automáticas, sin internet (usan el mock). Nacen aquí y crecerán con cada paso: así nunca avanzas sobre código roto.",
        mira: ["La función `prueba()` ejecuta un bloque y muestra ✅ o ❌ sin detener las demás.", "La prueba de Factory + Singleton comprueba identidad (`===`) al pedir `mock` con distinta capitalización.", "El presupuesto del LLMMedido corta la tercera llamada."],
      },
    },
    ejecutar: [
      { cmd: "npm run nivel0", run: "npm run -s nivel0", nota: "Observa las tres llamadas y el resumen final.", variable: true },
      { cmd: "npm test", run: "npm run -s test", nota: "Primera prueba automática." },
    ],
    checkpoint: "El Nivel 0 muestra «No lo sé» en la llamada 2 y «Te llamas Camila» en la 3. Además, la prueba confirma que la Factory reutiliza la misma instancia de proveedor.",
    preguntas: [
      "¿Por qué la llamada 2 no sabe el nombre y la 3 sí? ¿Qué cambió?",
      "Si el historial crece a 100 mensajes, ¿qué pasa con los tokens enviados y con el costo?",
      "¿Por qué el tope `maxLlamadas` es una medida de seguridad y no solo de ahorro?",
    ],
    errores: [
      { s: "process.loadEnvFile is not a function", c: "Tu Node es anterior a 20.12. Actualiza a Node 22 LTS." },
      { s: "Proveedor desconocido: \"xyz\"", c: "Escribiste mal LLM_PROVIDER en .env. Por ahora el único válido es mock." },
    ],
    siguiente: "En el paso 3 conectamos modelos reales (Gemini, Cohere y Groq) sin tocar ni una línea del Nivel 0.",
  },

  // =====================================================================================
  {
    id: 3, slug: "proveedores-reales", titulo: "Proveedores reales: Gemini, Cohere y Groq", nivel: "Infraestructura", minutos: 20,
    objetivo: "Agregar tres estrategias reales y un cliente HTTP con reintentos, y elegirlas desde .env.",
    problema:
      "El mock sirve para practicar, pero un agente real necesita un LLM real. Cada API tiene su propio formato (nombres de roles, URL, autenticación, forma de la respuesta). Si mezclas eso dentro del agente lo contaminas para siempre. La solución: un ADAPTADOR por proveedor que traduce nuestro formato al suyo, todo escondido tras LLMProvider.",
    conceptos: [
      { t: "Adaptador", d: "Cada clase traduce Mensaje[] → formato del proveedor → texto. Las diferencias quedan encapsuladas en un solo archivo." },
      { t: "REST sin SDK", d: "Usamos fetch directamente. Cero dependencias, y se ve exactamente qué se envía y se recibe." },
      { t: "Reintentos con espera exponencial", d: "Si el proveedor responde 429 (cuota) o 5xx (caída), se reintenta esperando cada vez más. No se reintenta un 401: no se arregla solo." },
      { t: "API «compatible con OpenAI»", d: "Groq usa el mismo formato que OpenAI. El mismo código sirve para muchos proveedores cambiando URL y clave." },
    ],
    archivos: {
      "src/util/http.ts": {
        porque: "Un único lugar para hacer POST con JSON, con timeout y reintentos. Los tres proveedores lo reutilizan.",
        mira: [
          "Reintenta SOLO 429 y errores 5xx; un 401/403/404 falla de inmediato (reintentar no lo arregla).",
          "`AbortSignal.timeout`: una llamada colgada no bloquea tu agente para siempre.",
          "Espera exponencial: 800 ms, 1,6 s… para no martillar a un servicio ya saturado.",
        ],
      },
      "src/llm/providers/gemini.ts": {
        porque: "Adaptador de Google Gemini. Traduce nuestro formato al de Gemini.",
        mira: [
          "Gemini separa el `system` (campo systemInstruction) del resto de mensajes.",
          "Llama «model» al asistente: traducimos `assistant` → `model`.",
          "La clave va en un header (`x-goog-api-key`), nunca en la URL: las URLs quedan en logs.",
          "La respuesta viene en candidates[0].content.parts: aquí se extrae el texto.",
        ],
      },
      "src/llm/providers/cohere.ts": {
        porque: "Adaptador de Cohere (API v2). Es el más parecido a nuestro formato.",
        mira: ["Acepta los roles system/user/assistant tal cual.", "Autenticación con `Authorization: Bearer <clave>`.", "El texto llega en message.content[].text."],
      },
      "src/llm/providers/groq.ts": {
        porque: "Adaptador de Groq: modelos abiertos (Llama) con hardware muy rápido, usando la API compatible con OpenAI.",
        mira: ["La respuesta está en choices[0].message.content (formato OpenAI).", "Si mañana quieres otro proveedor compatible con OpenAI, copias este archivo y cambias URL y clave."],
      },
      "src/llm/factory.ts": {
        porque: "La fábrica ahora también conoce a Gemini, Cohere y Groq. Es el único archivo que cambia para «enchufar» proveedores.",
        mira: ["`clave()` valida que exista la variable y dice exactamente cuál falta.", "Los agentes (que aún ni existen) no sabrán que hay tres proveedores nuevos."],
      },
      ".env.example": {
        porque: "Ahora incluye las claves y los modelos opcionales. Cada aprendiz copia el archivo y pega SU clave.",
        mira: ["Cada clave cuesta cero en los planes gratuitos, pero es personal: no se comparte por chat.", "`GEMINI_MODEL`, `COHERE_MODEL` y `GROQ_MODEL` permiten cambiar de modelo sin tocar código (los nombres cambian con el tiempo)."],
      },
    },
    ejecutar: [
      { cmd: "npm run typecheck", run: "npm run -s typecheck", nota: "Todo compila." },
      { cmd: "npm run nivel0", run: "npm run -s nivel0", nota: "Sigue usando mock: nada se rompió.", variable: true },
      {
        cmd: "# En .env:  LLM_PROVIDER=groq  y  GROQ_API_KEY=tu_clave\nnpm run nivel0", manual: true,
        nota: "Con una clave real el MISMO Nivel 0 responde con un modelo de verdad. Claves gratis: aistudio.google.com/apikey · dashboard.cohere.com/api-keys · console.groq.com/keys.",
      },
    ],
    checkpoint: "Con mock todo sigue igual. Con una clave real, el Nivel 0 responde con el modelo elegido sin cambiar código.",
    preguntas: [
      "¿Cuántas líneas del Nivel 0 cambiaron al pasar de mock a Groq? (Cero.)",
      "¿Por qué la clave de Gemini va en un header y no en la URL?",
      "¿Por qué no se reintenta un error 401?",
    ],
    errores: [
      { s: "Falta GROQ_API_KEY en tu archivo .env", c: "No pusiste la clave, o estás en una carpeta distinta a la del .env." },
      { s: "HTTP 401 / 403", c: "Clave incorrecta, vencida o con espacios/comillas." },
      { s: "HTTP 429", c: "Cuota gratuita agotada: espera un minuto o usa otro proveedor (el paso 4 lo automatiza)." },
      { s: "HTTP 404 (modelo no encontrado)", c: "El proveedor renombró el modelo: define GEMINI_MODEL / COHERE_MODEL / GROQ_MODEL en .env con uno vigente." },
    ],
    siguiente: "En el paso 4 hacemos que el sistema sobreviva cuando un proveedor se cae.",
  },

  // =====================================================================================
  {
    id: 4, slug: "fallback-y-comparar", titulo: "Resiliencia: Fallback y comparar proveedores", nivel: "Infraestructura", minutos: 15,
    objetivo: "Crear una estrategia compuesta que prueba varios proveedores en orden y comparar la misma pregunta entre todos.",
    problema:
      "Los proveedores fallan: se acaba la cuota (429), hay caídas (503) o van lentos. Si tu agente depende de uno solo, tu sistema se cae con él. La solución es una estrategia COMPUESTA: prueba varios en orden y, como también implementa LLMProvider, el agente ni se entera.",
    conceptos: [
      { t: "Composite / Fallback", d: "Una estrategia que contiene otras estrategias y las prueba en cadena." },
      { t: "Bitácora", d: "Registro de a quién se le pidió y qué pasó. Imprescindible para entender por qué una respuesta vino de donde vino." },
      { t: "Fallos simulados", d: "El mock ahora puede fallar a propósito para practicar la resiliencia sin esperar a que un proveedor real se caiga." },
    ],
    archivos: {
      "src/llm/providers/fallback.ts": {
        porque: "Recibe una lista de proveedores y le pide a cada uno en orden hasta que uno responda. Si todos fallan, lanza un error que explica cada falla.",
        mira: [
          "`implements LLMProvider`: se usa EXACTAMENTE igual que un proveedor normal.",
          "`bitacora`: guarda ✅/❌ por cada intento, útil para mostrar en clase.",
          "El error final junta los mensajes de todos los intentos: depurar sin adivinar.",
        ],
      },
      "src/niveles/comparar-proveedores.ts": {
        porque: "Demuestra Strategy en vivo: MISMA pregunta, distintos proveedores, mismo código. Luego demuestra el Fallback con un proveedor caído.",
        mira: [
          "Solo prueba los proveedores que tengan clave en .env (más el mock).",
          "La función `probar()` recibe un `LLMProvider`: no distingue cuál es. Eso es Strategy.",
          "La demo del fallback pone primero un `MockProvider({ fallar: true })` y el sistema igual responde.",
        ],
      },
      "src/llm/factory.ts": {
        porque: "Se suma la opción `fallback`: construye la cadena según FALLBACK_ORDER usando solo los proveedores que tienen clave.",
        mira: ["Omite sin ruido los proveedores sin clave: un aprendiz con solo Groq también puede usar «fallback».", "Para el agente, `LLM_PROVIDER=fallback` es solo otro nombre más."],
      },
      "src/llm/providers/mock.ts": {
        porque: "El mock aprende a fallar y a ser lento a voluntad, para poder practicar el fallback sin depender de un servicio real.",
        mira: ["`fallar: true` lanza un ErrorLLM 503 simulado.", "`latenciaMs` simula un proveedor lento.", "`etiqueta` permite distinguir varios mocks en la bitácora."],
      },
      ".env.example": {
        porque: "Se agrega el orden de la cadena de respaldo.",
        mira: ["`FALLBACK_ORDER=groq,gemini,cohere`: el primero que responda gana."],
      },
    },
    ejecutar: [
      { cmd: "npm run comparar", run: "npm run -s comparar", nota: "Sin claves solo prueba el mock y luego demuestra el fallback.", variable: true },
      { cmd: "npm test", run: "npm run -s test", nota: "Dos pruebas nuevas de fallback." },
    ],
    checkpoint: "El fallback salta del proveedor caído al sano y la bitácora lo muestra.",
    preguntas: [
      "¿Por qué FallbackProvider implementa LLMProvider? ¿Qué se rompería si no lo hiciera?",
      "¿Qué orden pondrías en la cadena: el más rápido, el más barato o el más inteligente primero?",
    ],
    errores: [
      { s: "fallback: no hay ninguna clave configurada en .env", c: "Con LLM_PROVIDER=fallback necesitas al menos una clave real. Para practicar usa el mock." },
    ],
    siguiente: "Con la infraestructura lista empezamos los niveles de agentes. En el paso 5: el chatbot con memoria.",
  },

  // =====================================================================================
  {
    id: 5, slug: "nivel1-chatbot-memoria", titulo: "Chatbot con rol y memoria", nivel: "Nivel 1", minutos: 20,
    objetivo: "Crear un chatbot con personalidad (system prompt) y elegir cómo recuerda: completa, ventana o resumen.",
    problema:
      "Una conversación real necesita contexto: el modelo no recuerda nada, así que debes reenviarle el historial. Pero reenviar todo cuesta cada vez más y se acerca al límite de tokens; reenviar poco hace que olvide. Decidir cuánto recordar es una decisión INTERCAMBIABLE: otra vez Strategy.",
    conceptos: [
      { t: "System prompt", d: "Instrucciones permanentes: rol, reglas y formato. Se envía en cada llamada." },
      { t: "Memoria como Strategy", d: "Completa (todo), Ventana (últimos N) y Resumen (lo viejo se comprime con el propio LLM)." },
      { t: "Equilibrio costo ↔ olvido", d: "Más memoria = más tokens y más costo. Menos memoria = el bot «olvida»." },
    ],
    archivos: {
      "src/agentes/memoria.ts": {
        porque: "Define la interfaz EstrategiaMemoria y tres implementaciones. Es el segundo patrón Strategy del proyecto.",
        mira: [
          "`MemoriaCompleta` guarda todo: simple, pero crece sin límite.",
          "`MemoriaVentana(n)` descarta lo antiguo: costo constante pero olvida (¡se verá en la demo!).",
          "`MemoriaResumen` usa el propio LLM para resumir lo viejo: equilibrio, a cambio de una llamada extra.",
        ],
      },
      "src/agentes/ChatAgent.ts": {
        porque: "Nuestro primer agente: junta un LLM, un system prompt y una memoria. Todavía no decide acciones, pero ya tiene personalidad y contexto.",
        mira: [
          "Recibe un `LLMProvider` y una `EstrategiaMemoria`: dos Strategy combinadas.",
          "En cada turno: guarda lo que dijo el usuario → envía system + memoria → guarda la respuesta.",
          "`mensajesEnMemoria` deja ver cómo crece (o no) el contexto.",
        ],
      },
      "src/util/consola.ts": {
        porque: "Se agrega `crearLector()` para poder conversar por teclado con el chatbot.",
        mira: ["Usa `readline/promises`, incluido en Node: sin dependencias."],
      },
      "src/niveles/nivel1-chatbot.ts": {
        porque: "El ejecutable del Nivel 1. Permite elegir la memoria por argumento y tiene una demo automática.",
        mira: [
          "Aquí SE ELIGE la estrategia de memoria en tiempo de ejecución (`ventana`, `resumen` o completa).",
          "`--demo` reproduce una conversación fija: ideal para comparar estrategias sin teclear.",
        ],
      },
      "src/llm/providers/mock.ts": {
        porque: "El mock aprende a actuar como «resumidor» para que la MemoriaResumen funcione sin internet.",
        mira: ["Ahora el mock separa el mensaje `system` del resto: así reconoce el rol que le piden."],
      },
    },
    ejecutar: [
      { cmd: "npm run nivel1 -- ventana --demo", run: "npm run -s nivel1 -- ventana --demo", nota: "Con ventana el bot OLVIDA el nombre: mira la última respuesta.", variable: true },
      { cmd: "npm run nivel1 -- completa --demo", run: "npm run -s nivel1 -- completa --demo", nota: "Con memoria completa SÍ lo recuerda.", variable: true },
      { cmd: "npm run nivel1 -- ventana", manual: true, nota: "Modo interactivo: escribe «me llamo X», habla 4 mensajes más y pregunta «¿cómo me llamo?». Para salir escribe «salir»." },
    ],
    checkpoint: "Con `ventana` el bot responde «No lo sé» al final; con `completa` responde «Te llamas Camila».",
    preguntas: [
      "¿Qué estrategia elegirías para un bot de soporte con conversaciones de 5 mensajes? ¿Y para uno que acompaña un proyecto de semanas?",
      "¿Por qué MemoriaResumen necesita un LLMProvider en su constructor?",
    ],
    errores: [
      { s: "El bot nunca recuerda nada", c: "Estás creando un ChatAgent nuevo en cada turno (se pierde la memoria). Reutiliza la misma instancia." },
    ],
    siguiente: "En el paso 6 le damos «manos» al agente: herramientas que ejecuten acciones reales.",
  },

  // =====================================================================================
  {
    id: 6, slug: "herramientas", titulo: "Herramientas: las «manos» del agente", nivel: "Nivel 2 · parte 1", minutos: 20,
    objetivo: "Crear la caja de herramientas y tres herramientas útiles (más una calculadora segura), y probarlas como código normal.",
    problema:
      "El LLM solo produce texto: no sabe la hora, se equivoca al sumar y no consulta nada. Necesita «manos»: funciones de TU código que pueda pedir ejecutar. Antes de conectarlas al LLM las construimos y probamos SIN LLM, como cualquier función.",
    conceptos: [
      { t: "Herramienta (tool)", d: "Una función + una descripción en texto. La descripción es lo único que el LLM lee para decidir cuándo usarla." },
      { t: "CajaDeHerramientas", d: "Registro de herramientas: las describe para el prompt y las ejecuta con red de seguridad." },
      { t: "Entrada no confiable", d: "Todo lo que sale de un LLM debe tratarse como entrada de usuario. Por eso JAMÁS eval()." },
    ],
    archivos: {
      "src/tools/herramienta.ts": {
        porque: "El contrato de una herramienta y la caja que las agrupa.",
        mira: [
          "`Herramienta`: nombre, descripcion, ejemploEntrada y ejecutar(). Así de simple.",
          "`describir()` genera el texto que se pegará en el system prompt: una línea por herramienta.",
          "`ejecutar()` captura los errores y los devuelve como TEXTO: una herramienta que falla jamás debe tumbar al agente (el agente puede leer el error y corregirse).",
        ],
      },
      "src/tools/calculadora.ts": {
        porque: "Un LLM se equivoca sumando. Esta herramienta calcula con exactitud, y lo hace SIN eval() (que permitiría ejecutar código malicioso).",
        mira: [
          "Un parser propio por descenso recursivo: solo entiende números, + - * / % ^ y paréntesis.",
          "Rechaza cualquier otro carácter con un error claro: `process.exit()` no pasa.",
          "La descripción le dice al LLM «úsala SIEMPRE que haya cuentas».",
        ],
      },
      "src/tools/basicas.ts": {
        porque: "Tres herramientas para practicar: hora (el LLM no sabe la fecha), clima (datos de ejemplo) y buscar_conocimiento (antesala de RAG).",
        mira: [
          "El clima usa datos de ejemplo a propósito: la clase funciona sin internet. El reto del paso 12 lo reemplaza por datos reales.",
          "Cada descripción explica qué hace, qué recibe y un ejemplo de entrada.",
          "Los errores (ciudad desconocida) se lanzan con `throw`: la caja los convertirá en observación.",
        ],
      },
      "src/verificar.ts": {
        porque: "Nuevas pruebas: la calculadora respeta precedencia y paréntesis, y rechaza código malicioso y divisiones por cero.",
        mira: ["Probar las herramientas aisladas es barato y evita buscar errores dentro de un agente."],
      },
    },
    ejecutar: [{ cmd: "npm test", run: "npm run -s test", nota: "Ahora hay 4 pruebas: las dos de la calculadora son nuevas." }],
    checkpoint: "Las pruebas de la calculadora pasan, incluida la que rechaza `process.exit()`.",
    preguntas: [
      "¿Por qué es peligroso usar eval() con texto que viene de un LLM?",
      "¿Por qué la descripción de una herramienta es tan importante como su código?",
    ],
    errores: [
      { s: "Se esperaba un número en la posición N", c: "La expresión tiene un formato inválido, por ejemplo dos operadores seguidos." },
    ],
    siguiente: "En el paso 7 conectamos estas herramientas al LLM con un protocolo JSON y construimos el primer agente que las usa.",
  },

  // =====================================================================================
  {
    id: 7, slug: "protocolo-json-toolagent", titulo: "El protocolo JSON y el ToolAgent", nivel: "Nivel 2 · parte 2", minutos: 25,
    objetivo: "Hacer que el LLM pida herramientas usando JSON, ejecutarlas y devolverle el resultado: el primer agente de verdad.",
    problema:
      "El LLM no puede ejecutar nada: solo puede escribir texto. Necesitamos un idioma común para que escriba «quiero usar clima con Cali» de forma que NUESTRO código lo entienda, lo ejecute y le devuelva el resultado. Cada proveedor tiene su «function calling» propio y distinto; un protocolo JSON propio funciona igual en todos.",
    conceptos: [
      { t: "Protocolo JSON", d: "El LLM responde SIEMPRE con un objeto JSON: o {accion, entrada} o {respuesta_final}." },
      { t: "Observación", d: "El resultado de la herramienta, que se le devuelve al LLM como un mensaje «Observación: …»." },
      { t: "Trazabilidad", d: "Cada paso emite un evento (pensamiento, acción, observación): imprescindible para depurar agentes." },
      { t: "Límite del Nivel 2", d: "Una sola herramienta por pregunta. Si la tarea necesita dos, se queda corta." },
    ],
    archivos: {
      "src/util/json.ts": {
        porque: "Los LLM a veces envuelven el JSON en ```json … ``` o añaden texto. Este «limpiador» encuentra el objeto JSON dentro.",
        mira: ["Quita las vallas de código y recorta entre la primera `{` y la última `}`.", "Si no hay JSON lanza un error: el agente lo manejará."],
      },
      "src/agentes/protocolo.ts": {
        porque: "Define el protocolo: el texto que se pone en el system prompt y la función que interpreta la respuesta del LLM.",
        mira: [
          "`promptProtocolo()` junta: rol + lista de herramientas + las reglas del formato JSON.",
          "`interpretar()` devuelve un tipo seguro: acción o respuesta final. Si el JSON no cumple, lanza error.",
          "Funciona igual con Gemini, Cohere y Groq, sin depender de su function calling propio.",
        ],
      },
      "src/agentes/eventos.ts": {
        porque: "Cada cosa que hace un agente emite un evento. Con eventos puedes imprimir, guardar en archivo o mostrar en una web.",
        mira: ["`EventoAgente`: quién, qué tipo, en qué paso y qué texto.", "`imprimirEvento` es una «escucha» lista para usar con íconos y colores."],
      },
      "src/agentes/ToolAgent.ts": {
        porque: "El Nivel 2: pregunta → el LLM decide → se ejecuta UNA herramienta → el LLM redacta la respuesta.",
        mira: [
          "Dos llamadas al LLM: una para decidir y otra para redactar con la observación.",
          "La herramienta la ejecuta NUESTRO código (`herramientas.ejecutar`), no el LLM.",
          "Si el LLM pide una segunda herramienta, responde que este nivel solo usa una: ese es su límite, y el gancho para el Nivel 3.",
        ],
      },
      "src/niveles/nivel2-herramientas.ts": {
        porque: "El ejecutable del Nivel 2, con tres preguntas: las dos primeras funcionan; la tercera necesita dos herramientas y se queda corta.",
        mira: ["Acepta tu propia pregunta: `npm run nivel2 -- \"¿Cuánto es 15% de 2400?\"`."],
      },
      "src/bootstrap.ts": {
        porque: "Se agregan dos ayudas compartidas: `todasLasHerramientas()` y leer la pregunta desde los argumentos de la terminal.",
        mira: ["Una sola función arma la caja con las 4 herramientas: cualquier nivel puede reutilizarla."],
      },
      "src/llm/providers/mock.ts": {
        porque: "El mock aprende el protocolo: detecta qué herramientas hacen falta según la pregunta y responde en JSON. Así los niveles 2 y 3 funcionan sin internet.",
        mira: [
          "Solo considera las herramientas que el agente REALMENTE tiene (mira el prompt): así probamos también la restricción de herramientas.",
          "Cuenta las «Observación:» recibidas para saber en qué paso va.",
          "Sigue siendo reglas simples: no es un LLM, es un actor que ensaya el guion.",
        ],
      },
    },
    ejecutar: [
      { cmd: "npm run nivel2", run: "npm run -s nivel2", nota: "Mira la traza. La 3.ª pregunta se queda corta a propósito.", variable: true },
      { cmd: "npm test", run: "npm run -s test", nota: "Pruebas nuevas del protocolo y del Nivel 2." },
    ],
    checkpoint: "Las dos primeras preguntas se resuelven; la tercera muestra «(Nivel 2 solo usa una herramienta)».",
    preguntas: [
      "¿Quién ejecuta realmente la herramienta: el LLM o tu código? ¿Por qué importa para la seguridad?",
      "¿Qué le falta a este agente para poder usar dos herramientas en la misma pregunta?",
    ],
    errores: [
      { s: "El JSON no tiene ni \"accion\" ni \"respuesta_final\"", c: "El modelo se salió del formato. Con modelos reales es normal de vez en cuando: el Nivel 3 lo corrige automáticamente." },
    ],
    siguiente: "En el paso 8 le damos al agente un BUCLE para que pueda encadenar herramientas: ReAct.",
  },

  // =====================================================================================
  {
    id: 8, slug: "nivel3-react", titulo: "ReAct: pensar → actuar → observar", nivel: "Nivel 3", minutos: 25,
    objetivo: "Crear el agente ReAct: un bucle que usa herramientas las veces que haga falta, con defensas contra fallos.",
    problema:
      "El Nivel 2 se rinde si la tarea necesita varias herramientas. Un agente de verdad repite: piensa qué falta, actúa con una herramienta, observa el resultado y vuelve a pensar, hasta tener la respuesta. Pero un bucle puede salir mal (JSON roto, repetir lo mismo, no terminar nunca), así que el bucle trae defensas.",
    conceptos: [
      { t: "ReAct (Reason + Act)", d: "El patrón: Pensar → Actuar → Observar, en bucle, hasta responder." },
      { t: "Defensa 1: formato", d: "Si el JSON es inválido, se le pide al LLM que corrija en vez de abortar." },
      { t: "Defensa 2: acciones repetidas", d: "Una «huella» de cada acción detecta que el agente se quedó dando vueltas." },
      { t: "Defensa 3: maxPasos", d: "Freno de emergencia: ningún agente se ejecuta para siempre ni gasta sin límite." },
    ],
    archivos: {
      "src/agentes/ReActAgent.ts": {
        porque: "El corazón del curso: el bucle del agente. El LLM es el cerebro que decide; NUESTRO código es el cuerpo que ejecuta, valida y corta.",
        mira: [
          "`for (paso = 1; paso <= maxPasos…)`: el bucle, con tope.",
          "Defensa 1: `try { interpretar }` — si falla, añade un mensaje de corrección y `continue`.",
          "Defensa 2: `accionesHechas` guarda «accion::entrada»; repetirla devuelve una observación que le dice al LLM que cambie de enfoque.",
          "Los errores de herramientas vuelven como observación: el agente puede corregirse (ej.: ciudad desconocida).",
          "Devuelve `ResultadoAgente` con pasos, si se cortó por límite y todos los eventos.",
        ],
      },
      "src/niveles/nivel3-react.ts": {
        porque: "El ejecutable del Nivel 3. Las mismas preguntas que dejaron corto al Nivel 2 ahora se resuelven.",
        mira: ["Cambia `maxPasos` a 1 y mira el freno de emergencia.", "Quita una herramienta de la caja y mira cómo reacciona."],
      },
    },
    ejecutar: [
      { cmd: "npm run nivel3", run: "npm run -s nivel3", nota: "Lee la traza en voz alta: pensamiento → acción → observación.", variable: true },
      { cmd: "npm run nivel3 -- \"¿Qué clima hace en Atlantis?\"", run: "npm run -s nivel3 -- \"¿Qué clima hace en Atlantis?\"", nota: "La herramienta falla y el agente NO se cae: el error vuelve como observación." },
      { cmd: "npm test", run: "npm run -s test", nota: "Tres pruebas nuevas: encadenar herramientas, límite de pasos y errores de herramientas." },
    ],
    checkpoint: "«Clima en Bucaramanga y 25 × 4» se resuelve en 3 pasos usando dos herramientas.",
    preguntas: [
      "¿Qué evita la «huella» de acciones? ¿Qué pasaría sin ella?",
      "¿Por qué los errores de una herramienta se devuelven como observación en vez de lanzar una excepción?",
      "Con un LLM real, ¿qué defensa crees que se activará con más frecuencia?",
    ],
    errores: [
      { s: "El agente repite la misma acción", c: "El modelo no entendió la observación. Mejora la descripción de la herramienta o el texto del error que devuelve." },
      { s: "No pude terminar en N pasos", c: "El freno de emergencia actuó: sube maxPasos solo si la tarea realmente lo necesita." },
    ],
    siguiente: "En el paso 9 enseñamos al agente CÓMO hacer tareas con skills (conocimiento en Markdown), no solo QUÉ puede hacer.",
  },

  // =====================================================================================
  {
    id: 9, slug: "nivel3b-skills", titulo: "Skills: conocimiento experto bajo demanda", nivel: "Nivel 3b", minutos: 20,
    objetivo: "Crear un cargador de skills (SKILL.md) y hacer que el agente las cargue por demanda con la herramienta cargar_skill.",
    problema:
      "Una herramienta le dice al agente QUÉ puede hacer. Pero ¿cómo le enseñas A HACERLO BIEN (formatos, reglas de tu empresa, pasos)? Meter todas las instrucciones en el prompt lo llena y lo encarece. Una skill es un paquete de instrucciones en Markdown que se carga SOLO cuando hace falta (divulgación progresiva).",
    conceptos: [
      { t: "Tool vs Skill", d: "Tool = función que el agente ejecuta (hacer). Skill = instrucciones que el agente lee (saber cómo)." },
      { t: "SKILL.md", d: "Una carpeta con un SKILL.md: encabezado con name y description, y el cuerpo con las instrucciones." },
      { t: "Divulgación progresiva", d: "Siempre se ve el catálogo (nombre + descripción); el cuerpo completo se carga solo si la tarea lo requiere." },
      { t: "Skill entregada por una tool", d: "En este proyecto la skill llega al agente mediante la herramienta cargar_skill." },
    ],
    archivos: {
      "src/skills/biblioteca.ts": {
        porque: "Lee la carpeta skills/, parsea cada SKILL.md y ofrece el catálogo, la carga bajo demanda y la herramienta cargar_skill.",
        mira: [
          "`parsearSkill`: separa el encabezado (--- … ---) del cuerpo y exige `description`.",
          "`catalogo()` → solo nombre + descripción (barato, siempre al prompt). `cargar(nombre)` → el cuerpo completo (bajo demanda).",
          "`comoHerramienta()` devuelve una Herramienta normal: una skill no necesita un mecanismo nuevo en el agente.",
        ],
      },
      "skills/reporte-clima/SKILL.md": {
        porque: "Una skill de ejemplo: enseña el formato y las reglas de un reporte del clima (usa la herramienta `clima`).",
        mira: ["La `description` decide CUÁNDO se usa: dice qué hace y cuándo aplicarla.", "El cuerpo son instrucciones paso a paso en lenguaje natural."],
      },
      "skills/resumen-ejecutivo/SKILL.md": {
        porque: "Una segunda skill, esta de redacción: no usa herramientas, solo reglas de estilo.",
        mira: ["Las skills pueden enseñar formato y criterio, no solo procedimientos con herramientas."],
      },
      "src/niveles/nivel3b-skills.ts": {
        porque: "Un agente ReAct al que se le suma la herramienta cargar_skill y el catálogo en su rol.",
        mira: [
          "El agente ve el catálogo en el prompt, pero NO el cuerpo de cada skill.",
          "En la traza: primero `cargar_skill(...)`, luego las herramientas normales siguiendo las instrucciones.",
          "Crea tu propia carpeta skills/mi-skill/SKILL.md y vuelve a ejecutar.",
        ],
      },
      "src/llm/providers/mock.ts": {
        porque: "El mock aprende a cargar una skill cuando piden un «reporte» o «informe» antes de usar herramientas, y a mencionar la skill en su respuesta.",
        mira: ["Las instrucciones de la skill no se tratan como «datos» de la respuesta, sino como guía."],
      },
    },
    ejecutar: [
      { cmd: "npm run skills", run: "npm run -s skills", nota: "Mira el catálogo y luego la traza: cargar_skill → clima → respuesta.", variable: true },
      { cmd: "npm test", run: "npm run -s test", nota: "Tres pruebas nuevas: catálogo, parser y agente con skill." },
    ],
    checkpoint: "La traza muestra `cargar_skill(\"reporte-clima\")` antes de usar `clima`.",
    preguntas: [
      "¿Qué diferencia hay entre una tool y una skill? Da un ejemplo de cada una.",
      "¿Por qué no pegar todas las skills en el prompt desde el inicio?",
      "Una skill es texto que el agente obedece: ¿qué riesgo tiene instalar skills de terceros sin leerlas?",
    ],
    errores: [
      { s: "La skill \"x\" necesita \"description\"", c: "Falta la línea `description:` en el encabezado del SKILL.md." },
      { s: "No existe la skill \"x\"", c: "El nombre no coincide con el `name` del encabezado. El error lista las válidas." },
    ],
    siguiente: "En el paso 10 el agente aprende a planificar antes de actuar.",
  },

  // =====================================================================================
  {
    id: 10, slug: "nivel4-planificador", titulo: "Plan-and-Execute: planificar antes de actuar", nivel: "Nivel 4", minutos: 20,
    objetivo: "Crear un agente que primero hace un plan visible, luego ejecuta cada paso con un agente ReAct y al final sintetiza la respuesta.",
    problema:
      "En tareas largas, un agente ReAct puro puede «perderse». Si primero escribe un PLAN, tienes un mapa que se puede mostrar, aprobar y depurar paso a paso. Además cada paso se resuelve por separado, con el contexto de los anteriores.",
    conceptos: [
      { t: "Plan-and-Execute", d: "Tres fases: planificar (LLM → lista de pasos), ejecutar (un ReAct por paso) y sintetizar (unir resultados)." },
      { t: "Contexto acumulado", d: "Cada paso recibe los resultados de los anteriores." },
      { t: "Plan aprobable", d: "En un producto real podrías pedirle al usuario que apruebe el plan antes de ejecutar." },
    ],
    archivos: {
      "src/agentes/PlanificadorAgent.ts": {
        porque: "Orquesta las tres fases. También contiene `sintetizar()`, que reutilizaremos en el Nivel 5.",
        mira: [
          "`planear()` le pide al LLM un JSON con la lista de pasos y la limita a `maxPasosPlan`.",
          "Reutiliza al `ReActAgent` como «ejecutor»: componer agentes pequeños en lugar de uno gigante.",
          "`sintetizar()` obliga al LLM a usar SOLO los resultados entregados: reduce alucinaciones.",
        ],
      },
      "src/niveles/nivel4-planificador.ts": {
        porque: "El ejecutable del Nivel 4. Imprime el plan antes de ejecutarlo.",
        mira: ["Fíjate cómo se imprime el plan (📋) ANTES de la primera acción.", "Usa un presupuesto de llamadas mayor porque hay más pasos."],
      },
      "src/llm/providers/mock.ts": {
        porque: "El mock aprende a actuar como «planificador»: divide la tarea en pasos.",
        mira: ["Divide por «y», comas y punto y coma: suficiente para la demo."],
      },
    },
    ejecutar: [{ cmd: "npm run nivel4", run: "npm run -s nivel4", nota: "Observa el plan y luego cada paso ejecutado por el agente ejecutor.", variable: true }],
    checkpoint: "Se imprime un plan de 3 pasos y cada uno se ejecuta con su propia traza.",
    preguntas: [
      "¿Cuándo preferirías Plan-and-Execute sobre ReAct puro? ¿Y al revés?",
      "¿Qué pasa si el plan es malo? ¿Cómo lo detectarías antes de ejecutarlo?",
    ],
    errores: [{ s: "El planificador no devolvió pasos", c: "El modelo no respondió el JSON esperado. Con modelos reales baja la temperatura y revisa el prompt." }],
    siguiente: "En el paso 11 repartimos el trabajo entre agentes especialistas y los administramos.",
  },

  // =====================================================================================
  {
    id: 11, slug: "nivel5-multiagente", titulo: "Multi-agente: orquestador y especialistas", nivel: "Nivel 5", minutos: 25,
    objetivo: "Crear un orquestador que reparte subtareas a especialistas (cada uno con SUS herramientas) y lleva un tablero de administración.",
    problema:
      "Un solo agente con muchas herramientas se confunde, es caro y es difícil de probar. Varios agentes pequeños, cada uno con pocas herramientas y un rol claro, son más precisos, más seguros (mínimo privilegio) y se pueden medir y reemplazar por separado.",
    conceptos: [
      { t: "Orquestador", d: "El «jefe»: decide a quién delegar cada subtarea y une los resultados." },
      { t: "Mínimo privilegio", d: "Cada especialista ve SOLO las herramientas que necesita." },
      { t: "Administración", d: "Registrar agentes, medir ejecuciones, éxitos, fallos y tiempos (el tablero)." },
    ],
    archivos: {
      "src/agentes/Orquestador.ts": {
        porque: "Registra especialistas, delega, sintetiza y mide. Es a la vez el «jefe» y el «administrador» del equipo.",
        mira: [
          "`Especialista`: nombre, descripción (para que el orquestador decida) y un ReActAgent propio.",
          "`delegar()` envuelve cada ejecución en try/catch y actualiza `estadisticas` (ejecuciones, éxitos, fallos, tiempo).",
          "Si el LLM delega a un especialista que no existe, devuelve un error con los válidos, no se cae.",
          "`tablero()` imprime el estado del equipo: lo que no se mide no se administra.",
        ],
      },
      "src/niveles/nivel5-multiagente.ts": {
        porque: "El ejecutable del Nivel 5: un Investigador (conocimiento, clima, hora) y un Matemático (solo calculadora).",
        mira: [
          "Cada especialista recibe su propia `CajaDeHerramientas`: el matemático ni siquiera ve el clima.",
          "Al final se imprime el tablero de agentes y el resumen del LLM medido.",
        ],
      },
      "src/llm/providers/mock.ts": {
        porque: "El mock completa su repertorio: actúa como «orquestador» (reparte tareas) y como «sintetizador» (une resultados). Este es ya el archivo final.",
        mira: ["Detecta qué subtareas son matemáticas para delegarlas al especialista correcto."],
      },
    },
    ejecutar: [{ cmd: "npm run nivel5", run: "npm run -s nivel5", nota: "Mira las delegaciones y el tablero final.", variable: true }],
    checkpoint: "El tablero muestra qué especialista trabajó, cuántas veces y con qué resultado.",
    preguntas: [
      "¿Por qué conviene que cada especialista tenga POCAS herramientas?",
      "¿Qué métricas agregarías al tablero para un sistema en producción?",
    ],
    errores: [{ s: "El orquestador no delegó nada", c: "El modelo no devolvió la lista de delegaciones. Revisa la descripción de cada especialista." }],
    siguiente: "En el paso 12 extendemos el sistema con retos, sin tocar los agentes.",
  },

  // =====================================================================================
  {
    id: 12, slug: "retos-extender", titulo: "Retos: extender sin tocar los agentes", nivel: "Retos", minutos: 25,
    objetivo: "Agregar clima real, un convertidor de moneda y un proveedor local (Ollama) sin modificar un solo agente.",
    problema:
      "La prueba de que la arquitectura está bien hecha: ¿puedes agregar capacidades nuevas SIN tocar lo que ya funciona? Una herramienta nueva es un archivo; un proveedor nuevo es una clase. Los agentes ni se enteran.",
    conceptos: [
      { t: "Abierto a extensión, cerrado a modificación", d: "Se agregan archivos nuevos; no se editan los agentes." },
      { t: "Open-Meteo", d: "API de clima sin clave: primero geocodifica la ciudad y luego pide la temperatura." },
      { t: "Ollama", d: "Modelos locales con API compatible con OpenAI: otra estrategia casi idéntica a Groq." },
    ],
    archivos: {
      "src/soluciones/climaReal.ts": {
        porque: "Reemplaza el clima de ejemplo por datos reales (Open-Meteo, sin clave).",
        mira: ["Dos peticiones: geocodificación (ciudad → coordenadas) y pronóstico actual.", "Misma interfaz `Herramienta` y mismo nombre `clima`: el agente no nota el cambio."],
      },
      "src/soluciones/convertirMoneda.ts": {
        porque: "Una herramienta nueva con tasas de ejemplo. Muestra la importancia de describir el FORMATO exacto de la entrada.",
        mira: ["La descripción dice «monto MONEDA_ORIGEN a MONEDA_DESTINO» y da un ejemplo.", "Valida el formato y devuelve errores útiles."],
      },
      "src/soluciones/ollama.ts": {
        porque: "Una nueva estrategia LLM: un modelo local. Es la prueba de que Strategy funciona: una clase nueva, cero cambios en agentes.",
        mira: ["Casi idéntica a `groq.ts`: solo cambian URL, no requiere clave y el timeout es mayor.", "Para activarla, agrega un `case \"ollama\"` en factory.ts."],
      },
      "src/soluciones/probar-soluciones.ts": {
        porque: "Un script rápido para probar las soluciones (la del clima necesita internet).",
        mira: ["Ejecuta las herramientas directamente desde una CajaDeHerramientas."],
      },
    },
    ejecutar: [{ cmd: "npm run soluciones", run: "npm run -s soluciones", nota: "El clima real necesita internet; los valores cambian.", variable: true }],
    checkpoint: "Las soluciones se ejecutan. El proyecto de este paso es IDÉNTICO al proyecto final de la clase.",
    preguntas: [
      "¿Cuántos archivos de agentes tuviste que modificar para agregar el clima real? (Ninguno.)",
      "¿Qué agregarías para que el orquestador tenga un tercer especialista?",
    ],
    errores: [{ s: "HTTP … al consultar open-meteo", c: "Sin internet o el servicio no responde. El error vuelve como observación y el agente no se cae." }],
    siguiente: "¡Terminaste! Ahora repasa la lista de administración y agrega tus propios agentes, herramientas y skills.",
  },
];
