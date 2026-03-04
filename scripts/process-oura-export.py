#!/usr/bin/env python3
"""
Process Oura Ring data export into TypeScript module.

Usage:
  1. Download your data export from https://membership.ouraring.com/data-export
  2. Unzip the export
  3. Run: python3 scripts/process-oura-export.py /path/to/unzipped/App\ Data
  4. Commit the updated src/data/oura-data.ts
"""

import csv
import json
import sys
import os

def read_csv(path):
    rows = []
    with open(path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            rows.append(row)
    return rows

def parse_json_field(val):
    try:
        return json.loads(val.replace("'", '"'))
    except:
        return {}

def process(data_dir):
    print(f"Processing Oura data from: {data_dir}")

    # Daily Sleep
    sleep = read_csv(f"{data_dir}/dailysleep.csv")
    sleep_out = []
    for r in sleep:
        c = parse_json_field(r.get("contributors", "{}"))
        entry = {"day": r["day"]}
        if r.get("score"): entry["score"] = int(r["score"])
        for k in ["deep_sleep", "rem_sleep", "efficiency", "latency", "total_sleep", "restfulness"]:
            short = k.replace("_sleep", "").replace("_", "")
            if k == "deep_sleep": short = "deep"
            elif k == "rem_sleep": short = "rem"
            elif k == "total_sleep": short = "total"
            if c.get(k) is not None: entry[short] = c[k]
        sleep_out.append(entry)

    # Sleep Model (detailed)
    smodel = read_csv(f"{data_dir}/sleepmodel.csv")
    detail_by_day = {}
    for r in smodel:
        day = r.get("day")
        if not day: continue
        entry = {"day": day}
        for k, t in [("average_heart_rate", float), ("average_hrv", float), ("lowest_heart_rate", int),
                      ("deep_sleep_duration", int), ("rem_sleep_duration", int),
                      ("light_sleep_duration", int), ("total_sleep_duration", int),
                      ("efficiency", int), ("average_breath", float)]:
            short = {"average_heart_rate": "avg_hr", "average_hrv": "avg_hrv",
                     "lowest_heart_rate": "lowest_hr", "deep_sleep_duration": "deep_s",
                     "rem_sleep_duration": "rem_s", "light_sleep_duration": "light_s",
                     "total_sleep_duration": "total_s", "average_breath": "avg_breath",
                     "efficiency": "efficiency"}[k]
            if r.get(k): entry[short] = t(r[k])
        typ = r.get("type")
        if typ == "long_sleep" or day not in detail_by_day:
            detail_by_day[day] = entry
    detail_out = sorted(detail_by_day.values(), key=lambda x: x["day"])

    # Activity
    activity = read_csv(f"{data_dir}/dailyactivity.csv")
    act_out = []
    for r in activity:
        entry = {"day": r.get("day")}
        for k, t in [("score", int), ("steps", int), ("active_calories", int),
                      ("total_calories", int), ("equivalent_walking_distance", int),
                      ("high_activity_time", int), ("medium_activity_time", int),
                      ("low_activity_time", int)]:
            short = {"active_calories": "active_cal", "total_calories": "total_cal",
                     "equivalent_walking_distance": "walking_dist",
                     "high_activity_time": "high_time", "medium_activity_time": "med_time",
                     "low_activity_time": "low_time"}.get(k, k)
            if r.get(k): entry[short] = t(r[k])
        act_out.append(entry)

    # Readiness
    readiness = read_csv(f"{data_dir}/dailyreadiness.csv")
    read_out = []
    for r in readiness:
        c = parse_json_field(r.get("contributors", "{}"))
        entry = {"day": r["day"]}
        if r.get("score"): entry["score"] = int(r["score"])
        if r.get("temperature_deviation"): entry["temp_dev"] = float(r["temperature_deviation"])
        for k in ["hrv_balance", "recovery_index", "resting_heart_rate", "body_temperature",
                   "previous_night", "activity_balance"]:
            short = {"recovery_index": "recovery", "resting_heart_rate": "rhr",
                     "body_temperature": "body_temp", "previous_night": "prev_night",
                     "activity_balance": "activity_bal"}.get(k, k)
            if c.get(k) is not None: entry[short] = c[k]
        read_out.append(entry)

    # SpO2
    spo2 = read_csv(f"{data_dir}/dailyspo2.csv")
    spo2_out = []
    for r in spo2:
        pct = parse_json_field(r.get("spo2_percentage", "{}"))
        entry = {"day": r["day"]}
        if pct.get("average"): entry["avg"] = pct["average"]
        if r.get("breathing_disturbance_index"): entry["bdi"] = float(r["breathing_disturbance_index"])
        spo2_out.append(entry)

    # Stress
    stress = read_csv(f"{data_dir}/dailystress.csv")
    stress_out = []
    for r in stress:
        entry = {"day": r["day"]}
        if r.get("day_summary"): entry["summary"] = r["day_summary"]
        if r.get("recovery_high"): entry["recovery_high"] = int(r["recovery_high"])
        if r.get("stress_high"): entry["stress_high"] = int(r["stress_high"])
        stress_out.append(entry)

    # Cardiovascular Age
    cvage = read_csv(f"{data_dir}/dailycardiovascularage.csv")
    cv_out = [{"day": r["day"], "vascular_age": int(r["vascular_age"])} for r in cvage if r.get("vascular_age")]

    # Workouts
    workouts = read_csv(f"{data_dir}/workout.csv")
    wo_out = []
    for r in workouts:
        entry = {"day": r.get("day")}
        if r.get("activity"): entry["activity"] = r["activity"]
        if r.get("calories"): entry["calories"] = float(r["calories"])
        if r.get("intensity"): entry["intensity"] = r["intensity"]
        if r.get("distance"): entry["distance"] = float(r["distance"])
        if r.get("start_datetime"): entry["start"] = r["start_datetime"]
        if r.get("end_datetime"): entry["end"] = r["end_datetime"]
        wo_out.append(entry)

    # Resilience
    resilience = read_csv(f"{data_dir}/dailyresilience.csv")
    res_out = []
    for r in resilience:
        c = parse_json_field(r.get("contributors", "{}"))
        entry = {"day": r["day"]}
        if r.get("level"): entry["level"] = r["level"]
        for k in ["sleep_recovery", "daytime_recovery", "stress"]:
            if c.get(k) is not None: entry[k] = c[k]
        res_out.append(entry)

    # Sleep time
    sleeptime = read_csv(f"{data_dir}/sleeptime.csv")
    st_out = [{"day": r["day"], "status": r.get("status"), "recommendation": r.get("recommendation")} for r in sleeptime]

    data = {
        "sleep": sleep_out,
        "sleepDetail": detail_out,
        "activity": act_out,
        "readiness": read_out,
        "spo2": spo2_out,
        "stress": stress_out,
        "cvAge": cv_out,
        "workouts": wo_out,
        "resilience": res_out,
        "sleeptime": st_out,
    }

    # Remove null/None values
    for key in data:
        data[key] = [{k: v for k, v in r.items() if v is not None} for r in data[key]]

    # Write TypeScript module
    script_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(script_dir, "..", "src", "data", "oura-data.ts")

    with open(out_path, "w") as f:
        f.write('import type { OuraData } from "../types"\n\n')
        f.write("const data: OuraData = ")
        json.dump(data, f, separators=(",", ":"))
        f.write(" as OuraData\n\n")
        f.write("export default data\n")

    total = sum(len(v) for v in data.values())
    print(f"Written {total} total records to {out_path}")
    for k, v in data.items():
        print(f"  {k}: {len(v)} records")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 process-oura-export.py /path/to/App\\ Data")
        sys.exit(1)
    process(sys.argv[1])
