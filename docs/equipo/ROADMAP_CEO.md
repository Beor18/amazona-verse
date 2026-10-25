# ROADMAP CEO · Amazona Verse · 24 oct 2026

## 1. Visión
Que cada niño boricua viva en el navegador una aventura segura donde ayuda a salvar a la cotorra puertorriqueña, y que cada compra financie su conservación.

## 2. Las 5 decisiones de Kelvin

**1. Canon narrativo: aprobar como v1.** Gancho sin control, sin villano, voz en vivo en el transmisor, Guardián que oculta la medalla, luz que parpadea tres veces. El guion no se reescribe: el juego añade una habilidad distinta por misión. La crecida ocurre siempre; si el niño eligió el río, el refugio se inunda y se desarma sin perder materiales. El coro de coquíes repara el transmisor. Pendiente tuyo: el guion dice "pacto de los 36" y el negocio "34 especies". Confirma la cifra; hasta entonces ningún texto público la usa.

**2. Validación cultural: contratarla antes de publicar.** Las 12 fichas del Diario (6 fauna, 6 cultura) no están validadas. Pide revisión al DRNA o Para la Naturaleza (fauna) y a un maestro o cultor (cultura). Lo no validado no se publica. Pava, guayabera y maraca se ganan jugando; no se venden.

**3. Datos del negocio: verificar, y no cobrar todavía.** Nada se cobra hasta que un abogado revise COPPA y las compras dentro del juego. Verifica esta semana: tope y Project Pitch de NSF SBIR ($275k-305k según la fuente), términos de Parallel18 (~$40k), plazos de IES y qué ofrece Para la Naturaleza. Descarto Poki: vive de anuncios. La proyección asumía lanzamiento público en el mes 1, pero el plan es beta cerrada con cobro desde el día 61. Reserva $8.000 de caja, no $5.000, y espera equilibrio, no ganancia.

**4. Alcance técnico y de juego: congelar.** Three r128 con WebGL2, física propia y meshopt (22 KB) como único WASM. Sin Rapier, Draco, KTX2 ni WebGPU. Capítulo de 12 minutos (el GDD dice 10-15 y 8-12). Solo prioridades P0 y P1. `game.js` se parte después de la demo.

**5. Dinero y criterio de parar: aprobar.** Presupuesto de 90 días: $3.000. Seguimos si D7 ≥12%, ≥40% termina el capítulo, ≥2% paga o ≥25 preventas, ≥1 escuela pide pagar y ≥1 aliado firma. Si fallan dos, rediseñamos antes de gastar en arte. Tú apruebas el diseño de Vittata antes del arte.

## 3. Roadmap

**Sprint 1: que corra en un teléfono real.**
- Qué: tope de render móvil, fugas de memoria, meshopt con cargador único, medidor de FPS y draw calls, audio y flecha guía.
- Quién: ingeniero principal; diseñador de juego.
- Medida: ≤100 draw calls, peso de 4,8 a ≤3 MB, ≥30 fps durante 10 minutos en un iPhone y un Android de gama media.

**Sprint 2: que se sienta como juego.**
- Qué: M1 nado, M2 anillos de vuelo, botones Acción y Bucear, ropa desbloqueable, sonido, partículas, diálogos de `dialogos_cap1.json`.
- Quién: ingeniero, diseñador, narrativa.
- Medida: 5 personas nuevas (3 niños de 7-12); ≥80% termina M1 y M2 sin ayuda.

**Sprint 3: capítulo completo y beta.**
- Qué: M3 coquíes, Diario validado, bandada final, pérdida de contexto WebGL, color unificado, accesibilidad, landing con lista de espera.
- Quién: ingeniero, diseñador, narrativa; Kelvin (validación, aliados).
- Medida: partida mediana de 10-13 min, 0 pantallas negras en 20 sesiones, ≥40% termina, 100 familias en lista.

## 4. Momento sorpresa
El despegue desde el mirador. El niño, vestido con lo que ganó, salta, la cámara se abre, aparecen las islas y 20 cotorras se unen a su vuelo mientras suena el coro de coquíes.

## 5. Riesgos
- **Lento en móviles económicos:** teléfonos reales en Sprint 1, calidad automática.
- **Pantalla negra en iOS:** escuchar `webglcontextlost` y autoguardar.
- **Dato cultural erróneo:** publicar solo fichas validadas.
- **Incumplir COPPA:** sin anuncios ni rastreo; abogado antes de cobrar.
- **Aliados no firman:** sin logos ni promesas de donación sin acuerdo.

## 6. Próximos 3 pasos de negocio (esta semana)
1. Pedir cotización a un abogado de COPPA.
2. Escribir al DRNA y a Para la Naturaleza: validación de fichas y carta de interés.
3. Publicar la landing con lista de espera, reclutar 15 padres y 5 maestros, y conseguir un iPhone y un Android.
