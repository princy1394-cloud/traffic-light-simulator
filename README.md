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

## How arrays are used

`DIRECTIONS`, `signalStates`, `vehiclesByDirection`, `waitingVehicles`, `vehiclesPassed`, and `trafficDensity` use matching direction indices: 0 = north, 1 = east, 2 = south, and 3 = west. `vehiclesByDirection[index]` stores the actual vehicle objects; the other indexed arrays track signal, queue, completed traffic, and density. The inspector renders these state arrays rather than sample values.

Density is calculated from the number of vehicles still on an approach: LOW for 0–1, MEDIUM for 2–3, and HIGH for 4. Queue length is limited to four vehicles per approach to keep the queues visible and separated in the simplified intersection view.

## Limitations

This is an educational model, not an engineering-grade traffic simulator. It models straight-through traffic only; there are no pedestrian phases, turning movements, lane-changing, adaptive signal timing, or measured real-world arrival data. Opposing straight-through movements run together in the same signal phase. Vehicle arrivals use fixed, staggered intervals so the simulation is repeatable rather than statistical.
