# SIGNAL — Urban Traffic Simulation

SIGNAL is a small, client-side four-way intersection model built with HTML, CSS, vanilla JavaScript, and SVG. It demonstrates how related arrays can keep traffic signal, queue, throughput, and density data in a consistent direction order while vehicles move through the same simulated junction.

## Features

- A top-down SVG intersection with road markings, stop lines, crosswalks, traffic signals, and lane-aligned vehicles.
- A safe two-axis signal cycle: north/south green, amber, all-red clearance, east/west green, amber, and all-red clearance.
- Gradual vehicle arrivals, queues, following distance, red-light stopping, and completed-vehicle counts.
- Live overview, per-approach measurements, queue indicators, and an array inspector linked to simulation state.
- Start, pause, resume, reset, four simulation speeds, and manual vehicle injection by direction.
- Responsive layout and keyboard-visible focus styles.

## Project files

```text
index.html    Application structure and SVG intersection
styles.css    Layout, visual design, and responsive rules
script.js     Simulation state, signal cycle, movement, controls, and rendering
REPORT.md     Academic discussion of arrays and the selected application
README.md     Running instructions and project notes
```

## Running locally

Open `index.html` directly in a modern browser. The application uses no external services, module imports, or build step, so it runs from a local file.

Alternatively, open the project folder in VS Code and select **Go Live** with the Live Server extension.

## Controls

- **Start** begins the simulation from its clean initial state.
- **Pause** stops all simulation time, signal, arrival, and vehicle updates.
- **Resume** continues from the paused state.
- **Reset** returns time, queues, counts, signals, and arrival schedules to the initial state.
- **Simulation speed** scales simulated time relative to real time (0.5×, 1×, 2×, or 4×).
- **Inject vehicle** adds one vehicle to the selected approach unless its queue has reached the four-vehicle limit.

## How to use the model

Select **Start** and watch the phase label, countdown, and signal lamps. North/south receive a shared green, then amber and an all-red clearance; east/west follow. Arrivals join the queues at staggered intervals. Use **Pause** and **Resume** to inspect a moment without advancing simulation time, or **Reset** to start over. Try changing speed or injecting a vehicle into different approaches, then compare the live approach panel with the array inspector.

## How arrays are used

Think of the direction arrays as four matching slots: 0 = north, 1 = east, 2 = south, and 3 = west. Slot 0 in `signalStates`, `vehiclesByDirection`, `waitingVehicles`, and `vehiclesPassed` always describes NORTH. When a signal phase changes, one loop checks those slots and gives green only to the permitted directions. This is a good fit because the four approaches share the same information and rules; one loop can manage them consistently instead of repeating separate code for each direction. The vehicle queues hold actual vehicle objects, while the inspector reads live state rather than sample values.

This fixed four-direction model is a good fit for indexed arrays: a single loop can update the signal state or calculate the queue data for each approach using the same index. For example, `signalStates[direction]` is set by checking whether that index is in the active phase's green list. The vehicle queues themselves are arrays of objects because each vehicle needs related fields such as position, speed, and wait time.

Density is calculated from the number of vehicles still on an approach: LOW for 0–1, MEDIUM for 2–3, and HIGH for 4. Queue length is limited to four vehicles per approach to keep the queues visible and separated in the simplified intersection view.

## Limitations

This is an educational model, not an engineering-grade traffic simulator. It models straight-through traffic only; there are no pedestrian phases, turning movements, lane-changing, adaptive signal timing, or measured real-world arrival data. Opposing straight-through movements run together in the same signal phase. Vehicle arrivals use fixed, staggered intervals so the simulation is repeatable rather than statistical.
