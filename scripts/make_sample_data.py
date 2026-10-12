"""
make_sample_data.py — generates SYNTHETIC SALUS-shaped results for screenshots.

Nothing here comes from a real simulation: rain, irrigation, fertilizer, soil
water and nitrogen are invented with simple seasonal rules and a fixed random
seed, so the charts look realistic but contain no real data. Same JSON shape
as the app's RunResults (layers, maximums, days, events).

Usage (from the project folder):  python3 scripts/make_sample_data.py public/data
Writes east-lansing-rainfed.json (seed 11) and east-lansing-irrigated.json
(seed 23), 1980-2021 (the years the Simulation period slider offers).
The app slices out each run's years and restarts the running totals there
(src/data/sliceResults.ts). Only the place names are real; every number is invented.
"""
import datetime as dt
import json
import math
import random
import sys

LAYERS = [(0, 2), (2, 7), (7, 15), (15, 26), (26, 40), (40, 57), (57, 77), (77, 100), (100, 125), (125, 150)]
Y0, Y1 = 1980, 2021


def make(irrigated: bool, seed: int):
    rnd = random.Random(seed)
    days, events = [], []
    pesw = 160.0
    soil_n = 25.0
    plant_n = 0.0  # cumulative over the whole run
    leach_n = 0.0  # cumulative
    season_plant = 0.0
    depth_shift = 0.0  # how far nitrate has moved down (0..1)
    d = dt.date(Y0, 1, 1)
    end = dt.date(Y1, 12, 31)
    while d <= end:
        doy = d.timetuple().tm_yday
        # --- weather / management events (invented) ---
        rain = 0.0
        p_rain = 0.28 + 0.08 * math.sin((doy - 100) / 365 * 2 * math.pi)
        if rnd.random() < p_rain:
            rain = round(min(65, rnd.expovariate(1 / 7.5)), 1)
        irr = 0.0
        if irrigated and 170 <= doy <= 240 and pesw < 125 and rnd.random() < 0.55:
            irr = 22.0
        fert = 0.0
        if doy == 128 + (d.year % 3):
            fert = 120.0
        if doy == 172 + (d.year % 4):
            fert = 80.0
        # --- soil water: drains toward a seasonal target, refilled by water ---
        et = 0.6 + 4.2 * max(0, math.sin((doy - 100) / 365 * 2 * math.pi)) if 120 <= doy <= 270 else 0.6
        pesw += rain * 0.8 + irr * 0.9 - et
        pesw = max(45, min(245 + rnd.uniform(-3, 3), pesw))
        # --- nitrogen ---
        if fert:
            soil_n += fert * 0.9
            depth_shift = max(0.0, depth_shift - 0.4)
        mineral = 0.25 if 110 <= doy <= 280 else 0.05
        uptake = 0.0
        if 150 <= doy <= 265:
            grow = math.exp(-((doy - 205) / 28) ** 2)
            uptake = min(soil_n * 0.08, (3.4 if irrigated else 2.6) * grow)
        soil_n += mineral - uptake
        plant_n += uptake
        if doy == 1:
            season_plant = 0
        wet = rain + irr
        if wet > 18 and soil_n > 20:
            loss = soil_n * (0.012 if irrigated else 0.008) * (wet / 25)
            soil_n -= loss
            leach_n += loss * 0.35
            depth_shift = min(1.0, depth_shift + 0.06)
        depth_shift = max(0.0, depth_shift - 0.002)
        soil_n -= soil_n * 0.002  # slow losses (denitrification, immobilization) keep 42-year runs bounded
        soil_n = max(0.0, soil_n)
        # --- layer concentrations (mg N/kg): soil N spread over depth ---
        weights = []
        for i, _ in enumerate(LAYERS):
            centre = 1.2 + depth_shift * 5.5
            weights.append(math.exp(-((i - centre) / (1.4 + depth_shift * 1.5)) ** 2))
        tot = sum(weights)
        conc = [round(soil_n * w / tot * 1.15 * (1.0 if i > 0 else 0.7) + rnd.uniform(0, 0.4), 4) for i, w in enumerate(weights)]
        days.append({
            'date': d.isoformat(),
            'pesw': round(pesw, 4),
            'soilN': round(soil_n, 4),
            'plantN': round(plant_n, 4),
            'leachN': round(leach_n, 4),
            'conc': conc,
        })
        if rain or irr or fert:
            events.append({'date': d.isoformat(), 'rain': rain, 'irrigation': irr, 'fertilizer': fert})
        d += dt.timedelta(days=1)
    maximums = {
        'pesw': max(x['pesw'] for x in days),
        'soilN': max(x['soilN'] for x in days),
        'plantN': max(x['plantN'] for x in days),
        'leachN': max(x['leachN'] for x in days),
        'layerConc': max(max(x['conc']) for x in days),
        'firstDate': days[0]['date'],
        'lastDate': days[-1]['date'],
    }
    return {'layers': [{'top': a, 'bottom': b} for a, b in LAYERS], 'maximums': maximums, 'days': days, 'events': events}


if __name__ == '__main__':
    out = sys.argv[1]
    for name, irr, seed in [("east-lansing-rainfed", False, 11), ("east-lansing-irrigated", True, 23)]:
        data = make(irr, seed)
        with open(f'{out}/{name}.json', 'w') as f:
            json.dump(data, f, separators=(',', ':'))
        m = data['maximums']
        print(name, {k: (round(v, 1) if isinstance(v, float) else v) for k, v in m.items()}, len(data['days']), len(data['events']))
