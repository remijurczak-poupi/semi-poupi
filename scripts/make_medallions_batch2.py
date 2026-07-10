from PIL import Image, ImageDraw

SRC_DIR = "/mnt/user-data/uploads/Downloads"
OUT_DIR = "/root/semi-poupi/assets/poupi"
RING_COLOR = (63, 177, 236, 255)
RING_WIDTH = 10
SIZE = 400

def make_medallion(src_path, crop_box, out_name):
    im = Image.open(src_path).convert("RGB")
    result = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))

    mask_outer = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(mask_outer).ellipse((0, 0, SIZE - 1, SIZE - 1), fill=255)
    ring_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    ImageDraw.Draw(ring_layer).ellipse((0, 0, SIZE - 1, SIZE - 1), fill=RING_COLOR)
    result = Image.composite(ring_layer, result, mask_outer)

    inner = SIZE - RING_WIDTH * 2
    photo = im.crop(crop_box).resize((inner, inner), Image.LANCZOS)
    mask_inner = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(mask_inner).ellipse(
        (RING_WIDTH, RING_WIDTH, SIZE - RING_WIDTH - 1, SIZE - RING_WIDTH - 1), fill=255
    )
    photo_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    photo_layer.paste(photo, (RING_WIDTH, RING_WIDTH))
    result = Image.composite(photo_layer, result, mask_inner)

    out_path = f"{OUT_DIR}/{out_name}"
    result.save(out_path)
    print("saved", out_path)

jobs = [
    ("354275299_3126038361031746_3952694071862517425_n.jpg", (69, 0, 491, 422 if False else 1170), "poupi-cone.png"),
]

jobs = [
    ("354275299_3126038361031746_3952694071862517425_n.jpg", (100, 330, 1000, 1230), "poupi-cone.png"),
    ("358930196_1352461145340683_5064788130834649230_n.jpg", (170, 850, 850, 1530), "poupi-backpack.png"),
    ("366361862_247281781018110_4505628909327137120_n.jpg", (69, 0, 491, 422), "poupi-closeup-blur.png"),
    ("367957348_726290129311346_8146890023031884291_n.jpg", (380, 290, 750, 660), "poupi-rocks.png"),
    ("367980785_849848069515448_222131207093041869_n.jpg", (150, 110, 650, 610), "poupi-glasses.png"),
    ("581980156_840478021926089_2391717353361375624_n.jpg", (521, 285, 1281, 1045), "chat-bengal-towels.png"),
    ("485448591_1185319666619181_2237276900746229966_n.jpg", (0, 150, 1530, 1680), "chat-bengal-closeup.png"),
]

for fname, box, out in jobs:
    make_medallion(f"{SRC_DIR}/{fname}", box, out)
