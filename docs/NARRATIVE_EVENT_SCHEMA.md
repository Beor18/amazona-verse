# NARRATIVE_EVENT_SCHEMA · versión 1

Cada evento se guarda en la partida (`events`) y alimenta el cómic personal. No contiene nombres reales, ubicación real ni datos personales: el nombre inventado del jugador vive solo en `profile`, nunca en los eventos (lo comprueba `AV.selfTest`).

| Campo | Tipo | Ejemplo |
|---|---|---|
| id | texto | `a1b2c3d4e5f6a7b8-7` (saveId + secuencia) |
| schemaVersion | número | 1 |
| saveId | texto | id aleatorio de la partida |
| type | texto | tipo genérico del directivo V4 (§7.2): `LocationDiscovered`, `LandDecisionMade`… |
| key | texto | evento concreto del capítulo: `WorkshopExplored`, `ShelterFlooded`… |
| chapter | número | 1 |
| seq | número | orden 1, 2, 3… |
| t | número | segundos de juego |
| location | texto | `taller_vittata`, `parcela_rio`, `parcela_colina`… (lugares ficticios) |
| characters | lista | `['vittata','luma']` |
| choice / outcome | texto o null | `'A'`, `'B'` |
| sceneTemplate | texto | `workshop`, `shelter`, `final`, `portrait`… |
| locKey | texto | `evt.<key>` para traducción futura |
| meta | objeto | datos seguros del juego (parcela, intento, formato exportado) |

## Eventos del capítulo 1
PlayerCharacterCreated→CharacterCreated · WorkshopExplored→LocationDiscovered · LumaHelped→QuestAccepted · ResourcesCollected→ResourceMilestoneReached · LandInspected→LocationDiscovered · LandSelected→LandDecisionMade · ShelterConstructed→BuildingConstructed · ShelterFlooded→BuildingDamaged · ShelterDismantled→LandDecisionMade · ShelterRelocated→LandDecisionMade · GuardianMet→CharacterMet · WorkshopUpgradeUnlocked→InventionUnlocked · TransmitterActivated→BuildingRepaired · BoatBlueprintUnlocked→InventionUnlocked · ChapterCompleted · ComicExported.

## Migración
Partidas v2 (eventos `{type,t,data}`) se convierten a este esquema al cargar. Partidas ilegibles se copian a `amazonaverse.save.unreadable` antes de empezar de nuevo; cada guardado deja el anterior en `amazonaverse.save.prev`.
