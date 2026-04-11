"""실제 API 응답 구조 디버그 스크립트"""
import sys
import json
import io
from playwright.sync_api import sync_playwright

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

url = sys.argv[1] if len(sys.argv) > 1 else "https://www.hanatour.com/trp/pkg/CHPC0PKG0200M200?pkgCd=JOP643251002TWL"

captured = {}

def handle_response(response):
    try:
        resp_url = response.url
        if response.status == 200 and ("getPkgProdItnrInfo" in resp_url or "getPkgSighInfo" in resp_url):
            data = response.json()
            key = "itinerary" if "ItnrInfo" in resp_url else "sightseeing"
            captured[key] = data
    except Exception:
        pass

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
    page = context.new_page()
    page.on("response", handle_response)

    response = page.goto(url, wait_until="domcontentloaded", timeout=30000)
    print(f"Page status: {response.status}")
    page.wait_for_timeout(8000)
    browser.close()

# Itinerary API 구조 분석
if "itinerary" in captured:
    itnr = captured["itinerary"]
    print("\n=== getPkgProdItnrInfo ===")
    print(f"Top keys: {list(itnr.keys())}")

    data = itnr.get("data", {})
    print(f"data type: {type(data).__name__}")
    if isinstance(data, dict):
        print(f"data keys: {list(data.keys())}")
        schd_list = data.get("schdInfoList", [])
        print(f"schdInfoList count: {len(schd_list)}")
        for s_idx, schd in enumerate(schd_list):
            print(f"\n--- Day {schd.get('schdDay')} ---")
            print(f"  strtDt: {schd.get('strtDt')}, strDow: {schd.get('strDow')}")

            main_items = schd.get("schdMainInfoList", [])
            print(f"  schdMainInfoList count: {len(main_items)}")
            for i, item in enumerate(main_items):
                catg = item.get('schdCatgNm', '')
                card = item.get('cardNm') or ''
                print(f"\n    [{i}] schdCatgNm={catg}, cardNm={card[:40]}")
                dep = item.get('depCityNm') or ''
                arr = item.get('arriveCityNm') or ''
                trsp = item.get('trspNm') or ''
                city = item.get('cityNm') or ''
                mt = item.get('mealTypeNm') or ''
                mc = item.get('mealCont') or ''
                if dep or arr: print(f"        dep={dep}, arrive={arr}, trsp={trsp}")
                if city: print(f"        cityNm={city}")
                if mt or mc: print(f"        mealType={mt}, mealCont={mc}")
                card_html = item.get("cardCntntPc") or ""
                if card_html: print(f"        cardCntntPc: (HTML len={len(card_html)})")
                cms_list = item.get("cmsInfoList") or []
                if cms_list:
                    print(f"        cmsInfoList count: {len(cms_list)}")
                    for j, cms in enumerate(cms_list[:2]):
                        nm = (cms.get('cmsCntntNm') or '')[:40]
                        cont = cms.get('cmsCntntCont') or ''
                        imgs = cms.get("pkgCmsImgInfoList") or []
                        print(f"          cms[{j}] nm={nm}, cont_len={len(cont)}, imgs={len(imgs)}")
                        for k, img in enumerate(imgs[:1]):
                            print(f"            img filePathNm={img.get('filePathNm', '')[:80]}")
else:
    print("\nItinerary API not captured!")

# Sightseeing API 구조 분석
if "sightseeing" in captured:
    sigh = captured["sightseeing"]
    print("\n\n=== getPkgSighInfo ===")
    data = sigh.get("data", {})
    print(f"data type: {type(data).__name__}")
    if isinstance(data, dict):
        print(f"data keys: {list(data.keys())}")
        for k in data.keys():
            v = data[k]
            if isinstance(v, list):
                print(f"  {k}: list[{len(v)}]")
                if v and isinstance(v[0], dict):
                    print(f"    first item keys: {list(v[0].keys())[:10]}")
    elif isinstance(data, list):
        print(f"data list length: {len(data)}")
        if data and isinstance(data[0], dict):
            print(f"First item keys: {list(data[0].keys())}")
            print(f"sighNm: {data[0].get('sighNm', '')}")
else:
    print("\nSightseeing API not captured!")

with open("downloads/debug_api_responses.json", "w", encoding="utf-8") as f:
    json.dump(captured, f, ensure_ascii=False, indent=2)
print("\n\nFull responses saved to downloads/debug_api_responses.json")
