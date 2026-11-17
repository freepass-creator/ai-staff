# 착한거래 쇼츠 스튜디오용 AI 스태프(착한 클로이) 컷을 현재 API에서 받아 온다.
# - 현재 허용 목록(/api/characters/current)의 variant=chakhan-white-v1, kind=pose 만 쓴다(다른 브랜드 대체 금지).
# - 받은 PNG는 API의 sha256 과 대조하고, 다르면 중단한다. 캐릭터를 재생성·수정하지 않는다.
# - 투명 여백만 잘라내고 높이 820px 이하로 줄인 WebP(알파 유지)와 출처 SHA를 기록한 staff.json 을 만든다.
# 실행: python -I studio/chakhan-shorts/tools/fetch_staff.py  (저장소 루트에서, Pillow 필요)
import hashlib, io, json, sys, urllib.request
from pathlib import Path
from PIL import Image

BASE = "https://ai-staff-two.vercel.app"
HERE = Path(__file__).resolve().parent.parent
ROOT = HERE.parent.parent
OUT = HERE / "staff"
MAX_H = 820


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "chakhan-shorts-studio-build"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


current = json.loads(get(f"{BASE}/api/characters/current"))
catalog = json.loads((ROOT / "public-release/site/chakhan-use-cuts.json").read_text(encoding="utf-8"))
meta = {a["id"]: a for a in catalog["assets"]}
picks = [a for a in current["assets"] if a.get("variant") == "chakhan-white-v1" and a.get("kind") == "pose"]
if not picks:
    sys.exit("현재 API에 착한거래 pose 컷이 없습니다")

OUT.mkdir(exist_ok=True)
staff = []
for a in picks:
    raw = get(BASE + a["url"])
    sha = hashlib.sha256(raw).hexdigest()
    if sha != a["sha256"]:
        sys.exit(f"{a['id']}: SHA 불일치 {sha} != {a['sha256']} — 중단")
    im = Image.open(io.BytesIO(raw)).convert("RGBA")
    bbox = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    im = im.crop(bbox)
    if im.height > MAX_H:
        im = im.resize((round(im.width * MAX_H / im.height), MAX_H), Image.LANCZOS)
    name = f"{a['id']}.webp"
    im.save(OUT / name, "WEBP", quality=90, method=6)
    m = meta.get(a["id"], {})
    staff.append({
        "id": a["id"], "label": a["label"], "file": name, "width": im.width, "height": im.height,
        "source_sha256": sha, "source_url": a["url"], "emotion": m.get("emotion"),
        "usage": m.get("usage"), "tags": m.get("tags", []),
    })
    print(f"{a['id']:16} {a['label']:10} ok  {im.width}x{im.height}  {(OUT / name).stat().st_size // 1024}KB")

(OUT / "staff.json").write_text(json.dumps({
    "schema": "chakhan-shorts/staff/v1", "source": f"{BASE}/api/characters/current",
    "api_revision": current["revision"], "variant": "chakhan-white-v1",
    "note": "현재 API 허용 목록 원본을 SHA 대조 후 투명 여백 자르기·축소만 했다. 캐릭터 재생성 없음.",
    "staff": staff}, ensure_ascii=False, indent=2), encoding="utf-8")
print("staff.json", len(staff))
