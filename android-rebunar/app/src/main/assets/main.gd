extends Control

var touch_count: int = 0

func _ready() -> void:
	set_process(true)
	queue_redraw()


func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		queue_redraw()


func _draw() -> void:
	var size := get_viewport_rect().size
	if size.x <= 0.0 or size.y <= 0.0:
		return

	# Dark Rebunar test scene with a lightweight 2D render path.
	draw_rect(Rect2(Vector2.ZERO, size), Color("#07120f"), true)

	var grid_step := 56
	for x in range(0, int(size.x) + grid_step, grid_step):
		draw_line(Vector2(x, 0), Vector2(x, size.y), Color(0.18, 0.34, 0.28, 0.22), 1.0)
	for y in range(0, int(size.y) + grid_step, grid_step):
		draw_line(Vector2(0, y), Vector2(size.x, y), Color(0.18, 0.34, 0.28, 0.22), 1.0)

	var font := ThemeDB.fallback_font
	var title_size := clampi(int(size.y * 0.055), 16, 26)
	draw_string(font, Vector2(24, 38), "REBUNAR  /  GODOT ENGINE", HORIZONTAL_ALIGNMENT_LEFT, -1, title_size, Color("#65f2b1"))
	draw_string(font, Vector2(24, 62), "ВСТРОЕННЫЙ 2D RUNTIME • ТЕХНИЧЕСКИЙ ПРОТОТИП", HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color("#91aaa0"))

	# Player marker.
	var player_center := Vector2(size.x * 0.46, size.y * 0.56)
	draw_rect(Rect2(player_center - Vector2(19, 19), Vector2(38, 38)), Color("#35d39a"), true)
	draw_rect(Rect2(player_center - Vector2(19, 19), Vector2(38, 38)), Color("#b5ffe0"), false, 2.0)

	# Collectibles.
	for point in [
		Vector2(size.x * 0.22, size.y * 0.36),
		Vector2(size.x * 0.69, size.y * 0.31),
		Vector2(size.x * 0.72, size.y * 0.72)
	]:
		var diamond := PackedVector2Array([
			point + Vector2(0, -13),
			point + Vector2(10, 0),
			point + Vector2(0, 13),
			point + Vector2(-10, 0)
		])
		draw_colored_polygon(diamond, Color("#f4d66b"))

	# Exit portal.
	var portal := Rect2(Vector2(size.x * 0.84, size.y * 0.43), Vector2(28, 74))
	draw_rect(portal, Color(0.22, 0.82, 0.66, 0.18), true)
	draw_rect(portal, Color("#55e7c0"), false, 3.0)

	draw_string(font, Vector2(24, size.y - 50), "Нажми на экран: проверка касаний — %d" % touch_count, HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color("#d5e8df"))
	draw_string(font, Vector2(24, size.y - 26), "Это уже настоящий Godot внутри APK Rebunar. Редактор подключим следующим этапом.", HORIZONTAL_ALIGNMENT_LEFT, -1, 11, Color("#829a90"))


func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch and event.pressed:
		touch_count += 1
		queue_redraw()
	elif event is InputEventMouseButton and event.pressed and not DisplayServer.is_touchscreen_available():
		touch_count += 1
		queue_redraw()
