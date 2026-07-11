"""Découpe (grabCut, deux passes + nettoyage) les visages de Poupi et des chats
en PNG transparent (pas de cercle) pour le jeu memory."""
import cv2
import numpy as np
from PIL import Image

SRC = "/mnt/user-data/uploads/Downloads"
OUT = "/root/semi-poupi/assets/poupi"
S = 480


def cutout(src_path, crop_box, out_name, margin_frac=0.06, pad_frac=0.05):
    im = cv2.imread(src_path)
    x0, y0, x1, y1 = crop_box
    crop = im[y0:y1, x0:x1]
    crop = cv2.resize(crop, (S, S), interpolation=cv2.INTER_LANCZOS4)

    mask = np.zeros((S, S), np.uint8)
    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)

    m = int(S * margin_frac)
    rect = (m, m, S - 2 * m, S - 2 * m)
    cv2.grabCut(crop, mask, rect, bgd_model, fgd_model, 6, cv2.GC_INIT_WITH_RECT)

    mask2 = mask.copy()
    border = int(S * 0.03)
    mask2[:border, :] = cv2.GC_BGD
    mask2[-border:, :] = cv2.GC_BGD
    mask2[:, :border] = cv2.GC_BGD
    mask2[:, -border:] = cv2.GC_BGD
    cx0, cy0 = int(S * 0.38), int(S * 0.30)
    cx1, cy1 = int(S * 0.62), int(S * 0.62)
    mask2[cy0:cy1, cx0:cx1] = np.where(
        mask2[cy0:cy1, cx0:cx1] == cv2.GC_PR_BGD, cv2.GC_FGD, mask2[cy0:cy1, cx0:cx1]
    )
    # Seed additionnelle plus haute pour capter oreilles / bonnet / chapeau,
    # que le seed central (centré sur le museau) rate souvent.
    hx0, hy0 = int(S * 0.30), int(S * 0.06)
    hx1, hy1 = int(S * 0.70), int(S * 0.28)
    mask2[hy0:hy1, hx0:hx1] = np.where(
        mask2[hy0:hy1, hx0:hx1] == cv2.GC_PR_BGD, cv2.GC_FGD, mask2[hy0:hy1, hx0:hx1]
    )
    cv2.grabCut(crop, mask2, None, bgd_model, fgd_model, 4, cv2.GC_INIT_WITH_MASK)

    fg_mask = np.where((mask2 == cv2.GC_FGD) | (mask2 == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
    n, labels, stats, _ = cv2.connectedComponentsWithStats(fg_mask, connectivity=8)
    if n > 1:
        largest = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
        fg_mask = np.where(labels == largest, 255, 0).astype(np.uint8)
    fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, np.ones((11, 11), np.uint8))
    fg_mask_soft = cv2.GaussianBlur(fg_mask, (9, 9), 0)

    b, g, r = cv2.split(crop)
    rgba = np.dstack([r, g, b, fg_mask_soft])

    ys, xs = np.where(fg_mask > 0)
    if len(xs) and len(ys):
        pad = int(S * pad_frac)
        x0c, x1c = max(0, xs.min() - pad), min(S, xs.max() + pad)
        y0c, y1c = max(0, ys.min() - pad), min(S, ys.max() + pad)
        side = max(x1c - x0c, y1c - y0c)
        cx, cy = (x0c + x1c) // 2, (y0c + y1c) // 2
        x0c, x1c = max(0, cx - side // 2), min(S, cx + side // 2)
        y0c, y1c = max(0, cy - side // 2), min(S, cy + side // 2)
        rgba = rgba[y0c:y1c, x0c:x1c]

    out_path = f"{OUT}/{out_name}"
    Image.fromarray(rgba).save(out_path)
    print("saved", out_path, rgba.shape)


JOBS = [
    ("432394118_1687351411672416_2381586246225863334_n.jpg", (180, 330, 620, 770), "poupi-flowers.png"),
    ("109249601_106442757824823_7935376031623476443_n.jpg", (90, 10, 1140, 1160), "poupi-santa.png"),
    # 482904271 = la vraie photo hammock (dog + femme lunettes de soleil)
    ("482904271_946629390881977_1279030094289691122_n.jpg", (0, 410, 430, 840), "poupi-hammock.png"),
    # 454556296 = la 2ème photo sac à dos (parking, voitures, arbres)
    ("454556296_418884837847172_8693947261301353971_n.jpg", (250, 550, 1050, 1350), "poupi-backpack2.png"),
    ("608296983_3802627830044216_2478930200531787504_n.jpg", (0, 50, 380, 430), "poupi-pillow.png"),
    ("608296983_3802627830044216_2478930200531787504_n.jpg", (370, 90, 730, 470), "chat-pillow.png"),
    ("358930196_1352461145340683_5064788130834649230_n.jpg", (170, 850, 850, 1530), "poupi-backpack.png"),
    ("366361862_247281781018110_4505628909327137120_n.jpg", (69, 0, 491, 422), "poupi-closeup-blur.png"),
    ("367957348_726290129311346_8146890023031884291_n.jpg", (380, 290, 750, 660), "poupi-rocks.png"),
    ("367980785_849848069515448_222131207093041869_n.jpg", (150, 110, 650, 610), "poupi-glasses.png"),
    ("354275299_3126038361031746_3952694071862517425_n.jpg", (100, 330, 1000, 1230), "poupi-cone.png"),
    ("581980156_840478021926089_2391717353361375624_n.jpg", (521, 285, 1281, 1045), "chat-bengal-towels.png"),
    ("485448591_1185319666619181_2237276900746229966_n.jpg", (0, 150, 1530, 1680), "chat-bengal-closeup.png"),
]

for fname, box, out in JOBS:
    cutout(f"{SRC}/{fname}", box, out)
