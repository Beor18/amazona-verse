extends Node3D
## PoC Amazona Verse en Godot 4.7 (auditoría de motores).
## Escena: cotorra original (vittata.glb, malla de cotorrofiver.blend con su rig), movimiento 3D, cámara que sigue,
## animación de caminar, accesorio intercambiable (ropa con piel sobre el mismo rig), huevo que se mueve y saca patitas,
## guardado y recuperación del estado. Las pruebas automáticas están en tests/run_tests.gd.

const SAVE_PATH := "user://poc_save.json"
const ACCESORIOS := {"gorra": "res://assets/gorra.glb", "sombrero": "res://assets/sombrero_paja.glb"}
const SPEED := 6.5
const ALTURA := 1.75          # el juego web escala la cotorra a 1,75 m (pack.js); el modelo nativo mide 1,4
const GRAVEDAD := 20.0

var player: CharacterBody3D
var model: Node3D
var skel: Skeleton3D
var anim: AnimationPlayer
var cam: Camera3D
var accesorio_id := ""
var accesorio_mesh: MeshInstance3D
var huevo: Node3D
var huevo_cuerpo: MeshInstance3D
var patas: Array[MeshInstance3D] = []
var eclosion := 0.0            # 0 = huevo cerrado, 1 = patitas fuera
var eclosionando := false
var t := 0.0
var input_override = null      # Vector2 para las pruebas (sin teclado en modo headless)
var cam_yaw := 0.0
var bench := false
var bench_data := {"frames": 0, "fps": [], "ms": [], "draw": [], "prims": []}

func _ready() -> void:
	bench = "--bench" in OS.get_cmdline_user_args()
	_mundo()
	_jugador()
	_huevo()
	_camara()

# ---------- Mundo mínimo ----------
func _mundo() -> void:
	var we := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	sky.sky_material = ProceduralSkyMaterial.new()
	e.sky = sky
	e.tonemap_mode = Environment.TONE_MAPPER_ACES
	e.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	we.environment = e
	add_child(we)
	var sol := DirectionalLight3D.new()
	sol.rotation_degrees = Vector3(-50, 30, 0)
	sol.shadow_enabled = true
	add_child(sol)
	var suelo := StaticBody3D.new()
	suelo.name = "Suelo"
	var col := CollisionShape3D.new()
	var caja := BoxShape3D.new()
	caja.size = Vector3(80, 1, 80)
	col.shape = caja
	col.position.y = -0.5
	suelo.add_child(col)
	var mi := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(80, 80)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.32, 0.55, 0.25)
	pm.material = mat
	mi.mesh = pm
	suelo.add_child(mi)
	add_child(suelo)

# ---------- Jugador: la cotorra original ----------
func _jugador() -> void:
	player = CharacterBody3D.new()
	player.name = "Jugador"
	var col := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = 0.4
	cap.height = ALTURA
	col.shape = cap
	col.position.y = ALTURA / 2.0
	player.add_child(col)
	model = (load("res://assets/vittata.glb") as PackedScene).instantiate()
	model.name = "Vittata"
	model.scale = Vector3.ONE * (ALTURA / 1.4)
	player.add_child(model)
	add_child(player)
	skel = model.find_children("*", "Skeleton3D", true, false)[0]
	anim = model.find_children("*", "AnimationPlayer", true, false)[0]
	for n in ["Walk", "Idle"]:
		if anim.has_animation(n):
			anim.get_animation(n).loop_mode = Animation.LOOP_LINEAR
	anim.play("Idle")

## Pone (o quita con "") un accesorio: la malla con piel del .glb de ropa se vuelve a enlazar al esqueleto de la cotorra
## por nombre de hueso, igual que hace el juego web con SkinnedMesh.bind.
func poner_accesorio(id: String) -> bool:
	if accesorio_mesh:
		accesorio_mesh.get_parent().remove_child(accesorio_mesh)
		accesorio_mesh.free()
		accesorio_mesh = null
	accesorio_id = ""
	if id == "":
		return true
	if not ACCESORIOS.has(id):
		return false
	var inst := (load(ACCESORIOS[id]) as PackedScene).instantiate()
	var mallas := inst.find_children("*", "MeshInstance3D", true, false)
	if mallas.is_empty():
		inst.free()
		return false
	var mi: MeshInstance3D = mallas[0]
	var su_skel: Skeleton3D = inst.find_children("*", "Skeleton3D", true, false)[0]
	var skin: Skin = mi.skin.duplicate()
	for i in skin.get_bind_count():
		if skin.get_bind_name(i) == StringName():
			skin.set_bind_name(i, su_skel.get_bone_name(skin.get_bind_bone(i)))
	mi.get_parent().remove_child(mi)
	inst.free()
	mi.skin = skin
	skel.add_child(mi)
	mi.transform = Transform3D.IDENTITY
	mi.skeleton = NodePath("..")
	accesorio_mesh = mi
	accesorio_id = id
	return true

# ---------- Huevo con movimiento y patitas ----------
func _huevo() -> void:
	huevo = Node3D.new()
	huevo.name = "Huevo"
	huevo.position = Vector3(2.5, 0, 1.5)
	huevo_cuerpo = MeshInstance3D.new()
	var esf := SphereMesh.new()
	esf.radius = 0.28
	esf.height = 0.78
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.96, 0.94, 0.88)
	mat.roughness = 0.6
	esf.material = mat
	huevo_cuerpo.mesh = esf
	huevo_cuerpo.position.y = 0.39
	huevo.add_child(huevo_cuerpo)
	var mat_pata := StandardMaterial3D.new()
	mat_pata.albedo_color = Color(0.93, 0.62, 0.2)
	for lado in [-1, 1]:
		var pata := MeshInstance3D.new()
		var cil := CylinderMesh.new()
		cil.top_radius = 0.035
		cil.bottom_radius = 0.03
		cil.height = 0.16
		cil.material = mat_pata
		pata.mesh = cil
		pata.position = Vector3(0.1 * lado, 0.06, 0)
		pata.scale = Vector3.ONE * 0.001
		huevo.add_child(pata)
		patas.append(pata)
	add_child(huevo)

func eclosionar() -> void:
	eclosionando = true

func _actualizar_huevo(dt: float) -> void:
	if eclosionando and eclosion < 1.0:
		eclosion = min(1.0, eclosion + dt / 1.2)
	var s: float = max(0.001, eclosion)
	for p in patas:
		p.scale = Vector3.ONE * s
	huevo_cuerpo.position.y = 0.39 + 0.12 * eclosion
	# Bamboleo antes de nacer; con patitas, pasea en círculo
	huevo_cuerpo.rotation.z = sin(t * 7.0) * (0.18 if eclosion < 1.0 else 0.06)
	if eclosion >= 1.0:
		var ang := t * 0.6
		huevo.position = Vector3(2.5 + cos(ang) * 0.8, 0, 1.5 + sin(ang) * 0.8)
		huevo.rotation.y = -ang
		for i in patas.size():
			patas[i].rotation.x = sin(t * 10.0 + PI * i) * 0.5

# ---------- Cámara en tercera persona ----------
func _camara() -> void:
	cam = Camera3D.new()
	cam.fov = 55
	add_child(cam)
	_seguir(1.0)

func _seguir(k: float) -> void:
	var objetivo := player.global_position + Vector3(0, 1.2, 0)
	var detras := Vector3(sin(cam_yaw), 0, cos(cam_yaw)) * -5.5 + Vector3(0, 2.4, 0)
	cam.global_position = cam.global_position.lerp(objetivo + detras, k)
	cam.look_at(objetivo, Vector3.UP)

# ---------- Bucle ----------
func _physics_process(dt: float) -> void:
	t += dt
	var v: Vector2
	if input_override != null:
		v = input_override
	elif bench:
		v = Vector2(sin(t * 0.5), -cos(t * 0.5))
	else:
		v = Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
	var dir := Vector3(v.x, 0, v.y).rotated(Vector3.UP, cam_yaw)
	if dir.length() > 1.0:
		dir = dir.normalized()
	player.velocity.x = dir.x * SPEED
	player.velocity.z = dir.z * SPEED
	if not player.is_on_floor():
		player.velocity.y -= GRAVEDAD * dt
	player.move_and_slide()
	var moviendo := dir.length() > 0.1
	if moviendo:
		player.rotation.y = lerp_angle(player.rotation.y, atan2(dir.x, dir.z), min(1.0, dt * 12.0))
	var clip := "Walk" if moviendo else "Idle"
	if anim.current_animation != clip:
		anim.play(clip, 0.2)
	if moviendo:
		anim.speed_scale = clamp(dir.length() * SPEED / 3.0, 0.6, 2.5)
	_actualizar_huevo(dt)
	_seguir(min(1.0, dt * 6.0))

func _process(_dt: float) -> void:
	if not bench:
		return
	bench_data.frames += 1
	if bench_data.frames == 30:
		poner_accesorio("gorra")
		eclosionar()
	if bench_data.frames > 120:  # tras calentar
		bench_data.fps.append(Engine.get_frames_per_second())
		bench_data.ms.append(Performance.get_monitor(Performance.TIME_PROCESS) * 1000.0)
		bench_data.draw.append(Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME))
		bench_data.prims.append(Performance.get_monitor(Performance.RENDER_TOTAL_PRIMITIVES_IN_FRAME))
	if bench_data.frames == 700:
		var img := get_viewport().get_texture().get_image()
		img.save_png(ProjectSettings.globalize_path("res://") + "../captura_godot.png")
		var r := {
			"fps_medio": _media(bench_data.fps), "fps_min": bench_data.fps.min(),
			"ms_proceso_medio": _media(bench_data.ms), "draw_calls": _media(bench_data.draw), "primitivas": _media(bench_data.prims),
			"mem_estatica_MB": Performance.get_monitor(Performance.MEMORY_STATIC) / 1048576.0,
			"mem_video_MB": Performance.get_monitor(Performance.RENDER_VIDEO_MEM_USED) / 1048576.0,
			"objetos": Performance.get_monitor(Performance.OBJECT_COUNT),
			"renderer": RenderingServer.get_video_adapter_name(), "metodo": ProjectSettings.get_setting("rendering/renderer/rendering_method"),
		}
		print("BENCH> ", JSON.stringify(r))
		get_tree().quit()

func _media(a: Array) -> float:
	var s := 0.0
	for x in a:
		s += x
	return s / max(1, a.size())

# ---------- Guardado ----------
func estado() -> Dictionary:
	return {"v": 1, "pos": [player.position.x, player.position.y, player.position.z], "rotY": player.rotation.y,
		"accesorio": accesorio_id, "eclosion": eclosion}

func guardar() -> bool:
	var tmp := SAVE_PATH + ".tmp"
	var f := FileAccess.open(tmp, FileAccess.WRITE)
	if f == null:
		return false
	f.store_string(JSON.stringify(estado()))
	f.close()
	return DirAccess.rename_absolute(ProjectSettings.globalize_path(tmp), ProjectSettings.globalize_path(SAVE_PATH)) == OK

func cargar() -> bool:
	if not FileAccess.file_exists(SAVE_PATH):
		return false
	var d = JSON.parse_string(FileAccess.get_file_as_string(SAVE_PATH))
	if typeof(d) != TYPE_DICTIONARY or int(d.get("v", 0)) != 1:
		return false
	player.position = Vector3(d.pos[0], d.pos[1], d.pos[2])
	player.rotation.y = d.rotY
	poner_accesorio(d.accesorio)
	eclosion = d.eclosion
	eclosionando = eclosion > 0.0
	return true

func reiniciar() -> void:
	player.position = Vector3.ZERO
	player.rotation.y = 0
	poner_accesorio("")
	eclosion = 0.0
	eclosionando = false
