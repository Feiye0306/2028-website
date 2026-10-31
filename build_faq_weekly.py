import os
import json
import re

def build_faq():
    handover_dir = r"C:\Users\Darry\Desktop\CodeHere\kanban-flow\handover\2028-website"
    target_json = r"C:\Users\Darry\Desktop\CodeHere\2028-website\data\faq_weekly.json"

    # 1. 載入全部 165 題問答內容
    all_q_map = {}
    for part in range(1, 7):
        p_path = os.path.join(handover_dir, f"faq_content_v1_part{part}.json")
        if os.path.exists(p_path):
            with open(p_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for q in data.get('questions', []):
                    qid = int(q['id'])
                    all_q_map[qid] = q

    print(f"Total questions loaded: {len(all_q_map)}")

    # 2. 解析 faq_weekly_release_v1.md
    md_path = os.path.join(handover_dir, "faq_weekly_release_v1.md")
    with open(md_path, 'r', encoding='utf-8') as f:
        md_text = f.read()

    weeks = []
    current_stage = "高二下打底"
    current_week = None

    lines = md_text.split('\n')
    for line in lines:
        line_s = line.strip()
        if line_s.startswith('## '):
            stage_match = re.search(r'##\s+([^\(（\s]+)', line_s)
            if stage_match:
                current_stage = stage_match.group(1).strip()
        elif line_s.startswith('### 第'):
            # ### 第 1 週・2027-02-04（四）
            m = re.search(r'第\s*(\d+)\s*週[・\s]+([\d-]+)', line_s)
            if m:
                w_num = int(m.group(1))
                w_date = m.group(2)
                current_week = {
                    'weekNum': w_num,
                    'releaseDate': w_date,
                    'stage': current_stage,
                    'questions': []
                }
                weeks.append(current_week)
        elif line_s.startswith('- #') and current_week is not None:
            # - #67 繁星推薦...
            qm = re.search(r'- #(\d+)', line_s)
            if qm:
                qid = int(qm.group(1))
                current_week['questions'].append(qid)

    print(f"Total release weeks parsed: {len(weeks)}")

    # 3. 依負責人指示：對調第 1 週的 #67 與第 4 週的 #2
    # 第 1 週首題改為 #2，第 4 週改為 #67
    w1 = next((w for w in weeks if w['weekNum'] == 1), None)
    w4 = next((w for w in weeks if w['weekNum'] == 4), None)
    if w1 and w4:
        if 67 in w1['questions'] and 2 in w4['questions']:
            w1['questions'][w1['questions'].index(67)] = 2
            w4['questions'][w4['questions'].index(2)] = 67
            print("Successfully swapped #2 and #67 between Week 1 and Week 4!")

    # 4. 組裝完整資料庫，移除內部題號標籤
    output_weeks = []
    for w in weeks:
        q_objs = []
        for qid in w['questions']:
            item = all_q_map.get(qid)
            if item:
                # 乾淨去題號處理
                clean_text = item.get('text', '')
                clean_ans = item.get('answer', '')
                q_objs.append({
                    'id': qid,
                    'title': clean_text,
                    'answer': clean_ans,
                    'stage': item.get('stage', w['stage']),
                    'isFolded': bool(item.get('folded', False))
                })
            else:
                print(f"Warning: Question #{qid} not found in content JSON")
        output_weeks.append({
            'weekNum': w['weekNum'],
            'releaseDate': w['releaseDate'],
            'stage': w['stage'],
            'questions': q_objs
        })

    os.makedirs(os.path.dirname(target_json), exist_ok=True)
    with open(target_json, 'w', encoding='utf-8') as f:
        json.dump(output_weeks, f, ensure_ascii=False, indent=2)

    print(f"Exported {len(output_weeks)} weeks to {target_json}")

if __name__ == '__main__':
    build_faq()
