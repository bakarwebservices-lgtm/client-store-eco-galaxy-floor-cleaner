import json, os

file_path = 'lh_pdp_reviews.json'
if os.path.exists(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    print("=== LIGHTHOUSE AUDIT SCORES (/products with Reviews) ===")
    for k, v in data.get('categories', {}).items():
        print(f"{v.get('title')}: {int(v.get('score', 0) * 100)}")
else:
    print("Report file not yet written.")
