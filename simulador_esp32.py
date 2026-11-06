"""Simula la transferencia de agua y los sensores del ESP32 en Firebase."""

from __future__ import annotations

import os
import queue
import threading
import time
from collections.abc import Mapping
from pathlib import Path
from typing import Any

import firebase_admin
from firebase_admin import credentials, db


DATABASE_URL = os.environ.get(
    "FIREBASE_DATABASE_URL",
    "https://esp32-hmi-default-rtdb.firebaseio.com/",
).rstrip("/")
SERVICE_ACCOUNT_FILE = Path(__file__).resolve().parent / "backend" / "serviceAccountKey.json"
SIMULATION_INTERVAL_SECONDS = 1.0
PUMP_RATE_PERCENT_PER_SECOND = 5.0
TANK_CONSUMPTION_PERCENT_PER_SECOND = 0.5
LOW_WATER_THRESHOLD_PERCENT = 10.0
LOW_WATER_ALARM_RESET_PERCENT = 15.0
LOW_WATER_ALARM_PATH = "system_live/alarmas/simulador_nivel_bajo"
LOW_WATER_ALARM_MESSAGE = "Nivel bajo de agua en el depósito (por debajo del 10%)"
FULL_TANK_ALARM_PATH = "system_live/alarmas/simulador_deposito_lleno"
FULL_TANK_ALARM_MESSAGE = "Tanque depósito lleno"
INITIAL_LEVELS = {"sensor1": 100.0, "sensor2": 0.0, "sensor3": 0.0}
ACTUATOR_PATHS = {
    "pump_on": "monitoreo/bomba",
    "priority": "system_live/controles/prioridad",
}
COMMAND_MESSAGES = {
    "pump_on": {True: "Bomba encendida (true)", False: "Bomba apagada (false)"},
}


def parse_actuator_state(value: Any) -> bool | None:
    """Interpreta los formatos booleanos comunes usados por el HMI."""
    if isinstance(value, Mapping):
        for key in ("activo", "estado", "active", "on"):
            if key in value:
                return parse_actuator_state(value[key])
        return None

    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        if value in (0, 1):
            return bool(value)
        return None
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "1", "on", "encendida", "abierta", "activo"}:
            return True
        if normalized in {"false", "0", "off", "apagada", "cerrada", "inactivo"}:
            return False
    return None


def clamp_level(value: float) -> float:
    return round(max(0.0, min(100.0, value)), 2)


def advance_plant(
    levels: Mapping[str, float],
    pump_on: bool,
    priority: int,
    elapsed_seconds: float,
    interleaved_tank: int,
) -> tuple[dict[str, float], bool, int]:
    """Avanza el modelo un intervalo y devuelve niveles, bomba y próximo tanque."""
    elapsed = max(0.0, elapsed_seconds)
    updated = {
        "sensor1": clamp_level(levels["sensor1"]),
        "sensor2": clamp_level(levels["sensor2"]),
        "sensor3": clamp_level(levels["sensor3"]),
    }

    for sensor in ("sensor2", "sensor3"):
        updated[sensor] = clamp_level(
            updated[sensor] - TANK_CONSUMPTION_PERCENT_PER_SECOND * elapsed
        )

    next_interleaved_tank = interleaved_tank if interleaved_tank in (2, 3) else 2
    if pump_on and updated["sensor1"] > 0:
        target_tank = priority if priority in (2, 3) else next_interleaved_tank
        target_sensor = "sensor" + str(target_tank)
        transfer = min(
            PUMP_RATE_PERCENT_PER_SECOND * elapsed,
            max(0.0, updated["sensor1"] - LOW_WATER_THRESHOLD_PERCENT),
            100.0 - updated[target_sensor],
        )
        updated["sensor1"] = clamp_level(updated["sensor1"] - transfer)
        updated[target_sensor] = clamp_level(updated[target_sensor] + transfer)
        if priority not in (2, 3) and transfer > 0:
            next_interleaved_tank = 3 if target_tank == 2 else 2

    pump_still_on = pump_on and updated["sensor1"] > LOW_WATER_THRESHOLD_PERCENT
    return updated, pump_still_on, next_interleaved_tank


def read_level(reference: Any, default: float) -> float:
    value = reference.get()
    try:
        level = float(value)
    except (TypeError, ValueError):
        return default
    return clamp_level(level)


def listen_for_command(
    name: str,
    reference: Any,
    state: dict[str, Any],
    state_lock: threading.Lock,
    events: queue.Queue[str],
) -> Any:
    def handle_event(event: Any) -> None:
        value = event.data
        if name == "priority":
            try:
                value = int(value)
            except (TypeError, ValueError):
                value = 1
            if value not in (1, 2, 3):
                value = 1
        elif name == "pump_on":
            value = parse_actuator_state(value) is True
        else:
            value = parse_actuator_state(value) is True

        with state_lock:
            previous = state.get(name)
            state[name] = value
        if previous is not None and previous != value:
            if name == "priority":
                priority_name = {1: "Intercalado", 2: "T2", 3: "T3"}[value]
                message = f"Prioridad de llenado: {priority_name} ({value})"
            else:
                message = COMMAND_MESSAGES[name][value]
            message = "[RELOJ VIRTUAL] " + message
            print(message, flush=True)
            events.put(message)

    return reference.listen(handle_event)


def run_simulation(
    state: dict[str, Any],
    state_lock: threading.Lock,
    database: Any,
    events: queue.Queue[str],
    stop_event: threading.Event,
) -> None:
    previous_time = time.monotonic()
    next_status_time = previous_time

    while not stop_event.is_set():
        now = time.monotonic()
        elapsed = max(0.0, now - previous_time)
        previous_time = now

        with state_lock:
            levels = dict(state["levels"])
            pending_reservoir_level = state["pending_reservoir_level"]
            state["pending_reservoir_level"] = None
            pump_on = state["pump_on"]
            priority = state["priority"]
            interleaved_tank = state["interleaved_tank"]
            previous_valve_position = state["valve_t2_selected"]
            low_water_alarm_active = state["low_water_alarm_active"]
            full_tank_alarm_active = state["full_tank_alarm_active"]
        if pending_reservoir_level is not None:
            levels["sensor1"] = pending_reservoir_level

        updated, pump_still_on, next_interleaved_tank = advance_plant(
            levels,
            pump_on,
            priority,
            elapsed,
            interleaved_tank,
        )
        selected_tank = priority if priority in (2, 3) else interleaved_tank
        valve_t2_selected = selected_tank == 2

        try:
            database.child("monitoreo").update(updated)
            if valve_t2_selected != previous_valve_position:
                database.child("system_live/controles/valvula").set(valve_t2_selected)
            low_water = updated["sensor1"] < LOW_WATER_THRESHOLD_PERCENT
            if pump_on and not pump_still_on:
                database.child(ACTUATOR_PATHS["pump_on"]).set(False)
            if low_water and not low_water_alarm_active:
                database.child(LOW_WATER_ALARM_PATH).set(
                    {
                        "mensaje": LOW_WATER_ALARM_MESSAGE,
                        "nivel": "critical",
                        "hora": time.strftime("%H:%M:%S"),
                    }
                )
                low_water_alarm_active = True
            elif updated["sensor1"] > LOW_WATER_ALARM_RESET_PERCENT and low_water_alarm_active:
                database.child(LOW_WATER_ALARM_PATH).delete()
                low_water_alarm_active = False
            if updated["sensor1"] >= 100.0 and not full_tank_alarm_active:
                database.child(FULL_TANK_ALARM_PATH).set(
                    {
                        "mensaje": FULL_TANK_ALARM_MESSAGE,
                        "nivel": "warning",
                        "hora": time.strftime("%H:%M:%S"),
                    }
                )
                full_tank_alarm_active = True
            elif updated["sensor1"] < 100.0 and full_tank_alarm_active:
                database.child(FULL_TANK_ALARM_PATH).delete()
                full_tank_alarm_active = False
            with state_lock:
                state["levels"] = updated
                state["pump_on"] = False if low_water else pump_still_on
                state["interleaved_tank"] = next_interleaved_tank
                state["selected_tank"] = selected_tank
                state["valve_t2_selected"] = valve_t2_selected
                state["low_water_alarm_active"] = low_water_alarm_active
                state["full_tank_alarm_active"] = full_tank_alarm_active
            if pump_on and not pump_still_on:
                message = "[RELOJ VIRTUAL] Bomba apagada: límite de protección del depósito."
                print(message, flush=True)
                events.put(message)
            if now >= next_status_time:
                events.put(
                    "Niveles: "
                    + ", ".join(f"{name}={value:.1f}%" for name, value in updated.items())
                )
                next_status_time = now + SIMULATION_INTERVAL_SECONDS
        except Exception as error:
            events.put(f"Error actualizando Firebase: {error}")

        stop_event.wait(SIMULATION_INTERVAL_SECONDS)


def main() -> None:
    if not SERVICE_ACCOUNT_FILE.is_file():
        raise FileNotFoundError(
            "No se encontró backend/serviceAccountKey.json. "
            "Coloca ahí la clave de servicio de Firebase."
        )

    import tkinter as tk

    app = firebase_admin.initialize_app(
        credentials.Certificate(str(SERVICE_ACCOUNT_FILE)),
        {"databaseURL": DATABASE_URL},
    )
    listeners: list[Any] = []
    stop_event = threading.Event()
    events: queue.Queue[str] = queue.Queue()
    state_lock = threading.Lock()
    root = tk.Tk()
    root.title("Simulador ESP32 - Planta de agua")
    root.resizable(False, False)

    try:
        root_ref = db.reference("/", app=app)
        levels = {
            sensor: (
                INITIAL_LEVELS[sensor]
                if sensor == "sensor1"
                else read_level(root_ref.child("monitoreo").child(sensor), default)
            )
            for sensor, default in INITIAL_LEVELS.items()
        }
        initial_priority = root_ref.child(ACTUATOR_PATHS["priority"]).get()
        try:
            initial_priority = int(initial_priority)
        except (TypeError, ValueError):
            initial_priority = 1
        if initial_priority not in (1, 2, 3):
            initial_priority = 1
        state: dict[str, Any] = {
            "levels": levels,
            "pump_on": False,
            "priority": initial_priority,
            "interleaved_tank": 2,
            "selected_tank": initial_priority if initial_priority in (2, 3) else 2,
            "valve_t2_selected": parse_actuator_state(
                root_ref.child("system_live/controles/valvula").get()
            ),
            "pending_reservoir_level": None,
            "low_water_alarm_active": bool(root_ref.child(LOW_WATER_ALARM_PATH).get()),
            "full_tank_alarm_active": bool(root_ref.child(FULL_TANK_ALARM_PATH).get()),
        }

        def on_reservoir_update(event: Any) -> None:
            if event.data is None:
                return
            try:
                level = clamp_level(float(event.data))
            except (TypeError, ValueError):
                return
            with state_lock:
                state["levels"]["sensor1"] = level

        listeners.append(root_ref.child("monitoreo/sensor1").listen(on_reservoir_update))

        for name, path in ACTUATOR_PATHS.items():
            ref = root_ref.child(path)
            value = ref.get()
            if name == "priority":
                try:
                    value = int(value)
                except (TypeError, ValueError):
                    value = 1
                if value not in (1, 2, 3):
                    value = 1
            else:
                value = parse_actuator_state(value) is True
            state[name] = value
            listeners.append(listen_for_command(name, ref, state, state_lock, events))

        with state_lock:
            state["selected_tank"] = (
                state["priority"] if state["priority"] in (2, 3) else state["interleaved_tank"]
            )
        root_ref.child("monitoreo").update(levels)
        title = tk.Label(root, text="Nivel del depósito principal (sensor1)")
        title.pack(padx=16, pady=(14, 4))
        value_label = tk.Label(root, text=f"{levels['sensor1']:.1f}%")
        value_label.pack(pady=(0, 4))
        status_label = tk.Label(root, text="Conectado a Firebase", wraplength=320)
        status_label.pack(padx=16, pady=(4, 12))
        valve_label = tk.Label(root, text=f"Válvula: Posición T{state['selected_tank']}")
        valve_label.pack(padx=16, pady=(0, 8))

        updating_slider = False

        def set_reservoir(value: str) -> None:
            if updating_slider:
                return
            try:
                level = clamp_level(float(value))
                with state_lock:
                    state["pending_reservoir_level"] = level
                value_label.config(text=f"{level:.1f}%")
            except Exception as error:
                status_label.config(text=f"Error escribiendo sensor1: {error}")

        slider = tk.Scale(
            root,
            from_=0,
            to=100,
            orient=tk.VERTICAL,
            resolution=1,
            length=240,
            command=set_reservoir,
        )
        slider.set(levels["sensor1"])
        slider.pack(padx=24, pady=(0, 14))

        def refresh_ui() -> None:
            nonlocal updating_slider
            with state_lock:
                current_level = state["levels"]["sensor1"]
                pending_level = state["pending_reservoir_level"]
                selected_tank = state["selected_tank"]
            if pending_level is None:
                updating_slider = True
                slider.set(current_level)
                updating_slider = False
                value_label.config(text=f"{current_level:.1f}%")
            valve_label.config(text=f"Válvula: Posición T{selected_tank}")
            latest_message = None
            while True:
                try:
                    latest_message = events.get_nowait()
                except queue.Empty:
                    break
            if latest_message:
                status_label.config(text=latest_message)
            if not stop_event.is_set():
                root.after(250, refresh_ui)

        root.protocol("WM_DELETE_WINDOW", root.destroy)
        simulation_thread = threading.Thread(
            target=run_simulation,
            args=(state, state_lock, root_ref, events, stop_event),
            name="esp32-plant-simulation",
            daemon=True,
        )
        simulation_thread.start()
        root.after(250, refresh_ui)
        root.mainloop()
    finally:
        stop_event.set()
        for listener in listeners:
            listener.close()
        firebase_admin.delete_app(app)


if __name__ == "__main__":
    main()
