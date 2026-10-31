#!/bin/bash
# Qué hace cada trabajador ahora mismo. Sin gastar nada.   tools/agente_api/estado.sh
LOGS="$HOME/AmazonaVerse/logs_api"
echo "hora: $(date '+%d/%m %H:%M')   trabajadores vivos: $(pgrep -f 'ejecutor.py' | wc -l | tr -d ' ')   subidor: $(pgrep -f 'subir.sh' | head -1 | wc -l | tr -d ' ')   publicador: $(pgrep -f 'publicar_mac.sh' | head -1 | wc -l | tr -d ' ')"
echo "memoria: $(memory_pressure 2>/dev/null | tail -1)"
for f in $(ls -t "$LOGS"/worker-*.log 2>/dev/null | head -8); do
  echo "── $(basename "$f")"
  grep -E '########|== Fin|PARO|frenada|falló|cola sin' "$f" | tail -2 | cut -c1-120
  echo "   última actividad hace $(( ($(date +%s) - $(stat -f %m "$f")) / 60 )) min: $(tail -1 "$f" | cut -c1-90)"
done
if [ -f "$LOGS/publicador.log" ]; then
  echo "── publicador (últimas líneas, hace $(( ($(date +%s) - $(stat -f %m "$LOGS/publicador.log")) / 60 )) min):"
  grep -E '^(══|──|==|PUBLICADO|NO SE PUBLICA|nada nuevo|Próxima|pruebas|build)' "$LOGS/publicador.log" | tail -4 | cut -c1-120
fi
echo "── últimas 3 tareas terminadas (gasto):"
tail -3 "$HOME/AmazonaVerse/_herramientas/agent-sdk/gastos.jsonl" | python3 -c "import sys,json
for l in sys.stdin:
    d=json.loads(l); print('  ',d['fecha'][5:16],d['tarea'],'\$%.2f'%d['costo'],d['turnos'],'turnos')"
