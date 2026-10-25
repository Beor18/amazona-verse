extends SceneTree
## Pruebas automáticas de la PoC (sin ventana):
##   Godot --headless --path proj -s res://tests/run_tests.gd
## Sale con el número de fallos como código (0 = todo bien) e imprime RESULT> con el JSON.

var ok := 0
var fallos: Array[String] = []

func check(nombre: String, cond: bool, detalle := "") -> void:
	if cond:
		ok += 1
		print("  ok   ", nombre)
	else:
		fallos.append(nombre)
		print("  FALLA ", nombre, "  ", detalle)

func _initialize() -> void:
	_correr()

func frames(n: int) -> void:
	for i in n:
		await physics_frame

func _correr() -> void:
	var t0 := Time.get_ticks_msec()
	var main = (load("res://main.tscn") as PackedScene).instantiate()
	root.add_child(main)
	await frames(5)

	# 1. Cotorra original
	check("Modelo de la cotorra cargado", main.model != null)
	check("Esqueleto de 60 huesos", main.skel != null and main.skel.get_bone_count() == 60, str(main.skel.get_bone_count() if main.skel else -1))
	check("Huesos de montaje presentes", main.skel.find_bone("mount_head_top") >= 0 and main.skel.find_bone("mount_eyes") >= 0)
	var clips: PackedStringArray = main.anim.get_animation_list()
	check("5 animaciones originales (Celebrate, Curious, Idle, Walk, Welcome)", clips.size() == 5 and "Walk" in clips, str(clips))

	# 2-4. Movimiento, animación de caminar y cámara
	var p0: Vector3 = main.player.global_position
	var c0: Vector3 = main.cam.global_position
	var hueso: int = main.skel.find_bone("armL1")
	main.input_override = Vector2(0, -1)
	await frames(60)
	var p1: Vector3 = main.player.global_position
	check("Se mueve en 3D (≥ 4 m en 1 s)", p0.distance_to(p1) >= 4.0, "%.2f m" % p0.distance_to(p1))
	check("Queda sobre el suelo (no cae ni flota)", abs(p1.y) < 0.15, "y=%.3f" % p1.y)
	check("Reproduce Walk al moverse", main.anim.current_animation == "Walk", main.anim.current_animation)
	var q1: Quaternion = main.skel.get_bone_pose_rotation(hueso)
	await frames(8)
	var q2: Quaternion = main.skel.get_bone_pose_rotation(hueso)
	check("El esqueleto se anima (la pose cambia entre cuadros)", q1.angle_to(q2) > 0.001, "%.4f rad" % q1.angle_to(q2))
	check("La cámara sigue al jugador", main.cam.global_position.distance_to(c0) > 3.0 and main.cam.global_position.distance_to(p1) < 9.0)
	main.input_override = Vector2.ZERO
	await frames(30)
	check("Vuelve a Idle al parar", main.anim.current_animation == "Idle", main.anim.current_animation)

	# 5. Accesorio intercambiable
	check("Pone la gorra", main.poner_accesorio("gorra") and main.accesorio_mesh != null)
	check("La gorra queda enlazada al esqueleto de la cotorra", main.accesorio_mesh.get_parent() == main.skel and main.accesorio_mesh.skin != null)
	var binds_ok := true
	for i in main.accesorio_mesh.skin.get_bind_count():
		if main.skel.find_bone(main.accesorio_mesh.skin.get_bind_name(i)) < 0:
			binds_ok = false
	check("Todos los huesos de la gorra existen en la cotorra", binds_ok)
	check("Cambia a sombrero (la gorra se libera)", main.poner_accesorio("sombrero") and main.accesorio_id == "sombrero" and main.skel.get_child_count() >= 1)
	var nodos0 := Performance.get_monitor(Performance.OBJECT_NODE_COUNT)
	for i in 10:
		main.poner_accesorio("gorra" if i % 2 == 0 else "sombrero")
	await frames(2)
	check("10 cambios sin fuga de nodos", Performance.get_monitor(Performance.OBJECT_NODE_COUNT) == nodos0, "%d → %d" % [nodos0, Performance.get_monitor(Performance.OBJECT_NODE_COUNT)])

	# 6. Huevo con movimiento y patitas
	var h0: Vector3 = main.huevo.global_position
	check("Huevo sin patitas al principio", main.patas[0].scale.x < 0.01)
	var r1: float = main.huevo_cuerpo.rotation.z
	await frames(6)
	check("El huevo se bambolea", abs(main.huevo_cuerpo.rotation.z - r1) > 0.01)
	main.eclosionar()
	await frames(90)
	check("Eclosión: patitas a escala 1", main.patas[0].scale.x > 0.99, "%.3f" % main.patas[0].scale.x)
	await frames(30)
	check("El pichón camina (el huevo se desplaza)", main.huevo.global_position.distance_to(h0) > 0.05)

	# 7. Guardado y recuperación
	main.poner_accesorio("gorra")
	var antes: Dictionary = main.estado()
	check("Guarda (escritura atómica .tmp → final)", main.guardar())
	main.reiniciar()
	check("Reiniciar limpia el estado", main.accesorio_id == "" and main.player.position.length() < 0.01)
	check("Carga la partida", main.cargar())
	var despues: Dictionary = main.estado()
	check("Restaura posición, accesorio y eclosión", JSON.stringify(antes) == JSON.stringify(despues), JSON.stringify(despues))
	var f := FileAccess.open("user://poc_save.json", FileAccess.WRITE)
	f.store_string("{roto")
	f.close()
	check("Partida dañada se rechaza sin romper", not main.cargar())

	var ms := Time.get_ticks_msec() - t0
	var total := ok + fallos.size()
	print("RESULT> ", JSON.stringify({"ok": ok, "total": total, "fallos": fallos, "ms": ms}))
	quit(fallos.size())
