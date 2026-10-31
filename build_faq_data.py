import glob
import json
import os
import re

# 1. 讀取所有 faq_content_v1_part*.json
handover_dir = r"c:\Users\Darry\Desktop\CodeHere\kanban-flow\handover\2028-website"
part_files = sorted(glob.glob(os.path.join(handover_dir, "faq_content_v1_part*.json")))

all_questions_by_id = {}
for fp in part_files:
    with open(fp, "r", encoding="utf-8") as f:
        data = json.load(f)
        for q in data.get("questions", []):
            all_questions_by_id[q["id"]] = q

print(f"Loaded {len(all_questions_by_id)} unique questions from JSON parts.")

# 2. 讀取 faq_weekly_release_v1.md
release_md_path = os.path.join(handover_dir, "faq_weekly_release_v1.md")
with open(release_md_path, "r", encoding="utf-8") as f:
    text = f.read()

weeks = []
cur_week = None
cur_stage = "高二下打底"

for line in text.splitlines():
    line_str = line.strip()
    if line_str.startswith("## "):
        cur_stage = line_str.lstrip("#").strip()
    m = re.match(r"^###\s+第\s*(\d+)\s*週[・·\s]+([\d-]+)", line_str)
    if m:
        cur_week = {
            "week": int(m.group(1)),
            "release_date": m.group(2),
            "stage": cur_stage,
            "question_ids": []
        }
        weeks.append(cur_week)
    elif cur_week and line_str.startswith("- #"):
        qm = re.match(r"^-\s+#(\d+)", line_str)
        if qm:
            cur_week["question_ids"].append(int(qm.group(1)))

print(f"Parsed {len(weeks)} release weeks.")

# 3. 根據使用者需求調整：
# 第 1 週第 1 題改為 #2，原本的 #67 移至第 4 週
# 原始第 1 週: [67, 12, 13] -> 新第 1 週: [2, 12, 13]
# 原始第 4 週: [33, 2, 1]  -> 新第 4 週: [33, 67, 1]
w1 = next(w for w in weeks if w["week"] == 1)
w4 = next(w for w in weeks if w["week"] == 4)

w1["question_ids"] = [2, 12, 13]
w4["question_ids"] = [33, 67, 1]

print("Adjusted Week 1 question IDs:", w1["question_ids"])
print("Adjusted Week 4 question IDs:", w4["question_ids"])

# 4. 組裝結構化每週發布 FAQ 資料庫
# 對每一週，裝入完整 question 物件（移除題號標記，保留 folded）
weekly_faq_bundle = []
for w in weeks:
    q_objs = []
    for qid in w["question_ids"]:
        q_raw = all_questions_by_id.get(qid)
        if not q_raw:
            print(f"Warning: question #{qid} not found!")
            continue
        
        # 處理 folded 題目
        folded_list = []
        for fold in q_raw.get("folded", []):
            folded_list.append({
                "id": fold.get("id"),
                "question": fold.get("text", "").strip(),
                "answer": fold.get("answer", "").strip()
            })
            
        q_objs.append({
            "id": q_raw.get("id"),
            "stage": q_raw.get("stage") or w["stage"],
            "question": q_raw.get("text", "").strip(),
            "answer": q_raw.get("answer", "").strip(),
            "folded": folded_list
        })
        
    weekly_faq_bundle.append({
        "week": w["week"],
        "release_date": w["release_date"],
        "stage": w["stage"],
        "questions": q_objs
    })

# 5. 輸出至 2028-website/data/faq_data.json
out_path = r"c:\Users\Darry\Desktop\CodeHere\2028-website\data\faq_data.json"
os.makedirs(os.path.dirname(out_path), exist_ok=True)
with open(out_path, "w", encoding="utf-8") as f:
    json.dump({
        "updated_at": "2026-10-31",
        "exam_date": "2028-01-14",
        "total_weeks": len(weekly_faq_bundle),
        "weeks": weekly_faq_bundle
    }, f, ensure_ascii=False, indent=2)

print(f"Successfully generated {out_path} with {len(weekly_faq_bundle)} weeks!")
