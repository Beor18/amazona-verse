# Cómo trabajamos con la IA en Amazona Verse

Guía corta para el equipo fundador. Explica cómo trabaja el equipo de IA, cómo pedirle cosas para que rinda y cómo funciona el consumo, para no gastar de más.

## 1. No es magia
- **Los agentes son programas que leen y escriben código.** Cada uno recibe una tarea por escrito, abre los archivos del juego, los cambia, compila y corre las pruebas. Si algo falla, lo corrige y lo vuelve a probar. Es trabajo de verdad, solo que más rápido.
- **Se equivocan.** Por eso todo pasa por pruebas automáticas antes de publicarse. Aun así, hay cosas que solo se notan jugando. Ejemplo: el botón Acción del celular pasaba todas las pruebas y en un iPhone no respondía.
- **Tienen límites físicos:**
  - **La Mac:** con más de 8 o 10 agentes a la vez, todo va lento y las pruebas fallan por falta de tiempo.
  - **La cuota del plan Max:** límite cada 5 horas y límite semanal.
  - **Los créditos de la API,** que cuestan dinero.
- **No deciden lo que es del fundador:** historia, canon, diseño de personajes, dinero y temas legales. Si nadie decide, el juego sale con marcadores neutros.
- **No sienten el juego como un niño.** Si algo es divertido solo se sabe probándolo con niños de verdad.

## 2. Cómo pedir las cosas
**Un pedido útil tiene tres partes:**
1. **Qué vi**, con una captura si se puede.
2. **Qué esperaba** que pasara.
3. **Qué tan importante es:** bloquea, molesta o es una idea.

> Ejemplo: «En el celular, el botón Acción no hace nada (captura). Esperaba examinar el taller. Bloquea».

**Mejor evitar:**
- Documentos largos a mitad del trabajo. Una visión grande (como las directivas V8 o V9) se convierte en **3 prioridades como mucho**, y lo demás va a la fila.
- Muchas ideas nuevas a la vez. Diez ideas sueltas cuestan más y avanzan menos que tres bien elegidas.

## 3. Ritmo y límites
- **Probar a diario, poco tiempo.** Jugar la última versión 15 minutos y mandar tres cosas: algo que falla, algo que gustó y algo que se quiere.
- **Terminar antes de empezar.** No se abre un frente nuevo hasta cerrar el anterior. La meta visible es `docs/equipo/VERSION_1.md`. Ante cada idea nueva, la pregunta es: ¿entra en la versión 1 o va después?
- **Como mucho 6 agentes a la vez;** lo demás espera en fila.
- **Decisiones en fila,** una o dos al día, con opciones para elegir, en lugar de todas juntas.

## 4. Cómo funciona el consumo
### Las dos formas de pagar
| | Plan Max | Créditos de la API |
|---|---|---|
| Cómo es | Una membresía: cuota fija al mes | Un taxímetro: cada palabra leída o escrita cuesta dinero |
| Límites | Una ventana que se renueva cada **5 horas** y un límite **semanal** (uno general y otro aparte para Fable) | El saldo de la cuenta. Los créditos de regalo vencen en su fecha y lo que no se usa se pierde |
| Al llegar al tope | Se espera a que se renueve. No cobra más salvo que se active el «uso extra» (hoy apagado) | Se detiene. Nuestro ejecutor además tiene topes propios en `tools/agente_api/limites.json` |
| Dónde se mira | En la app: Configuración → Uso | En console.anthropic.com → Facturación |

### Qué es lo que gasta: los tokens
Un token es más o menos un pedazo de palabra. Se cuenta **todo lo que la IA lee y todo lo que escribe**:
- **La conversación entera.** En cada mensaje, la IA vuelve a leer todo lo anterior. Es como cargar una maleta en cada viaje: cuanto más larga es la conversación, más pesa cada mensaje, incluso un «¿cómo va?».
- **Archivos, PDF, documentos e imágenes.** Un PDF grande o muchas capturas pesan mucho.
- **Cada agente,** que tiene su propia maleta. Diez agentes gastan más o menos diez veces más.
- **El modelo:** Fable y Opus son los más capaces y los que más gastan, Sonnet bastante menos y Haiku es el más barato.

## 5. Cómo usarlo sin quemar tokens
- **Un tema por conversación.** Al cambiar de tema, se empieza una conversación nueva.
- **Un mensaje completo en lugar de cinco cortos.** Todo junto (captura, qué se esperaba y prioridad) cuesta mucho menos.
- **No preguntar «¿cómo va?» a cada rato.** Los agentes avisan solos al terminar.
- **Resúmenes en lugar de documentos enteros:** de un PDF de 12 páginas se pegan las 3 ideas principales.
- **Menos agentes, bien enfocados.** Seis bien dirigidos rinden más que doce que se pisan y repiten pruebas.
- **El modelo justo para cada tarea:**
  - Fable para planificar y evaluar;
  - Opus para lo técnico difícil;
  - Sonnet para lo de rutina;
  - Haiku para comprobaciones simples.

## 6. Qué hace el coordinador para ayudar
- Mantiene **6 agentes como máximo** y pone el resto en fila.
- Da **un resumen diario de 5 líneas:** qué se hizo, qué se publicó, cuánto se gastó y qué hace falta decidir.
- Anota cada tarea con su modelo, consumo, pruebas y resultado en `docs/equipo/REGISTRO_TAREAS.md`.
- Cuando una conversación ya es muy larga, deja un documento de traspaso y sigue en una nueva.
- Cuando llega una idea grande a mitad de ronda, la pone en la fila y lo dice, en lugar de lanzar más agentes.
