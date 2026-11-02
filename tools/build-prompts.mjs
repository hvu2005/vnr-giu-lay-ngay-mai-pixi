// Dựng prompt Gemini cho 10 cảnh từ brief hình ảnh 2.1 → art/prompts/prompts.json
//
//     node tools/build-prompts.mjs
//
// Mỗi cảnh ba prompt, gửi lần lượt trong CÙNG một chat Gemini (cùng khung hình):
//   master  STYLE + `promptMaster` của src/docs/visual-briefs.json (nguyên văn)
//           + vị trí 6 vật theo `visualBoxPercent` của brief
//   clean   xoá vật CHUYỂN ĐỘNG (người, cờ) → nền của cảnh + mặt nạ `diff`
//   bare    từ bản clean, xoá nốt vật ĐỨNG YÊN → mặt nạ `bare`
// Docs 2.1: "prompt nền sạch phải dùng danh sách xóa lớp riêng" — nên clean/bare
// là lệnh sửa ảnh kèm danh sách, không phải prompt master viết lại.
import fs from "node:fs";

const BRIEF = JSON.parse(fs.readFileSync("src/docs/visual-briefs.json", "utf8"));

// Khối style giữ nét vẽ của bộ ảnh cũ (UI giấy hồ sơ, bìa) — brief 2.1 chỉ nói
// "minh họa 2D vẽ tay bán hiện thực", không tả nét.
const STYLE =
    "STYLE: hand-painted 2D digital illustration for a historical narrative point-and-click adventure game. " +
    "Semi-realistic proportions, painterly brush texture with clean dark-brown ink outlines around every figure and object, " +
    "soft cinematic lighting, muted earthy palette with a few saturated accents, detailed but readable at a glance — " +
    "like a classic graphic-novel adventure game background. Characters have weight; props are attached to real surfaces. " +
    "Wide 16:9 landscape, one camera, one coherent perspective. " +
    "Absolutely no text, letters, numbers, captions, logos, UI, arrows or watermark.";

const LAYOUT =
    "KEY ITEMS — they will be cut out as separate clickable sprites, so each must read as its own clear shape with a " +
    "little empty space around it; overlap only where the brief describes natural depth. Do not add extra people or " +
    "props in front of or touching the key items; background extras stay small and far behind them. Approximate " +
    "bounding box of each item, in percent of the frame (x from left, y from top, width, height):";

/** Tên tiếng Anh của từng vật (đúng nghĩa content-pack) + danh sách xoá. */
const SCENES = {
    S01: {
        // Lần 1: cả quảng trường là một khối người dày, chồng lên nhóm dự lễ và
        // che chân lễ đài → không tách được O4 / lễ đài thành sprite.
        notes:
            "Only these people stand in front of the platform: the flag bearer at lower-left and ONE compact group of " +
            "about six attendees in the middle ground. The large crowd stays small and far behind them, beyond a band " +
            "of open square ground. Nobody stands at the lower-right in front of the platform; the platform front is " +
            "fully visible. Ho Chi Minh is the only person on the platform. Exactly one microphone.",
        items: {
            O1: "a red flag with a yellow star on a bamboo pole, held up by a civilian in the lower-left foreground",
            O2: "Ho Chi Minh standing behind the lectern on the platform, front toward the crowd",
            O3: "the wooden lectern on the platform with the manuscript lying flat on its top",
            O4: "a group of attendees standing on the square, backs or rear three-quarter to camera, looking up-right at the platform",
            O5: "a period microphone on a supported stand, its head pointing at the speaker's mouth",
            H1: "a small woven sewing basket with red cloth and thread on a low stool",
        },
        clean: [
            "the red flag together with its bamboo pole and the civilian holding it",
            "the group of attendees standing in the middle ground",
            "Ho Chi Minh standing on the platform",
        ],
        bare: [
            "the microphone and its stand",
            "the wooden lectern with the manuscript on it",
            "the sewing basket and the low stool under it",
        ],
    },
    S02: {
        items: {
            O1: "the furniture barricade of bed frames, cupboards and earth sacks running diagonally across the lower foreground",
            O2: "self-defense fighters standing behind the barricade, backs toward the viewer, looking down the street",
            O3: "a row of unlit dark electric street lamps along the street",
            O4: "a courier with a document satchel standing at a house doorway",
            O5: "an evacuating family carrying bundles, walking along the right side passage toward the lower-right",
            H1: "a period tram car on rails, partly hidden by a house corner",
        },
        clean: [
            "the self-defense fighters behind the barricade",
            "the courier at the doorway",
            "the evacuating family in the right side passage",
        ],
        bare: [
            "the whole furniture barricade (bed frames, cupboards and earth sacks) — paint the bare street surface",
            "the street lamps together with their poles and brackets",
            "the tram car — paint the empty street and rails",
        ],
    },
    S03: {
        items: {
            O1: "the low De Castries command bunker embedded in the earth",
            O2: "the red flag with a yellow star planted directly on the bunker roof, its pole touching the roof",
            O3: "the zig-zag earth communication trenches leading toward the bunker",
            O4: "the stopped supply bicycle loaded with sacks, a porter steadying its handlebar",
            O5: "a group of soldiers moving toward the bunker, seen partly from behind",
            H1: "a cloth bag hanging on the bicycle with a notebook protruding from it",
        },
        clean: [
            "the flag and its whole pole on the bunker roof",
            "the group of soldiers in the middle ground",
            "the supply bicycle with its sacks, its cloth bag and the porter beside it",
        ],
        bare: [
            "the command bunker — paint continuous earth ground where it stood",
        ],
    },
    S04: {
        items: {
            O1: "a closed modest paper folder (the armistice agreement) lying flat on the near table, lower-left",
            O2: "Pham Van Dong and the Vietnamese delegation seated, bodies facing inward to the table",
            O3: "a geographic schematic map on a wooden easel in the far-right background",
            O4: "a second paper folder (the final declaration) lying flat on the near table, lower-center, with empty table between it and the first",
            O5: "small blank delegation nameplates standing along the receding table edge",
            H1: "a note card partly tucked under a folder on a small side table near the camera",
        },
        clean: [
            "Pham Van Dong and the Vietnamese delegation seated at the middle-left of the table (their chairs stay)",
        ],
        bare: [
            "the paper folder lying on the near table at lower-left",
            "the second paper folder lying on the near table at lower-center",
            "the wooden easel with the map",
            "the small nameplates on the table",
            "the note card and folder on the small side table near the camera (keep the side table)",
        ],
    },
    S05: {
        items: {
            O1: "an upright woven bamboo carrying basket on the left end of a bamboo platform",
            O2: "a courier in rear three-quarter view, load strapped to his back, turning toward the upper-right trail",
            O3: "a rope-tied wrapped supply parcel lying on the right end of the same bamboo platform",
            O4: "a small paper schematic clipped to a board on a shelter post, off the path",
            O5: "the narrow dirt footpath continuing into the forest",
            H1: "a cloth bag leaning against the platform with a wrapped dispatch protruding",
        },
        clean: [
            "the courier standing in the middle-left with the load on his back",
        ],
        bare: [
            "the carrying basket on the platform",
            "the wrapped supply parcel on the platform (keep the empty bamboo platform)",
            "the board with the paper schematic on the shelter post",
            "the cloth bag leaning against the platform",
        ],
    },
    S06: {
        // Lần 1: nhóm tự vệ bên phải đi NGƯỢC về phía camera, người cầm mõ lẫn
        // vào đầu đoàn → trượt checklist "hướng đoàn đi tới đích dễ đọc".
        notes:
            "EVERYONE walks AWAY from the camera toward the upper-right gateway — including the right-verge " +
            "self-defense group, whose backs we see. Nobody faces or walks toward the camera. The procession is ONE " +
            "cohesive group of about eight women and villagers on the road; the right-verge self-defense group (about " +
            "four people) is a separate group with open road between them. The drum player and the person holding the " +
            "bamboo slit-drum stand together beside the drum at the near left, apart from the procession. No other " +
            "people in the foreground or middle ground.",
        items: {
            O1: "a drum on a wooden stand with a person beside it playing it, and another person holding a bamboo slit-drum",
            O2: "the procession of rural women walking away toward the upper-right gateway",
            O3: "the dirt village road continuing beyond the procession into the distance",
            O4: "the simple village administrative gateway with two pillars in a low wall",
            O5: "a small self-defense group and villagers on the right verge, walking the same direction",
            H1: "a hand megaphone resting on a low porch stool, partly covered by cloth",
        },
        clean: [
            "the procession of women and villagers walking on the road",
            "the self-defense group and villagers on the right verge",
            "the drum on its wooden stand together with the person playing it and the person holding the bamboo slit-drum",
        ],
        bare: [
            "the village administrative gateway with its pillars and low wall — continue the road and trees behind it",
            "the hand megaphone, its cloth and the low stool under it",
        ],
    },
    S07: {
        items: {
            O1: "a modest square floor hatch opening in the upper room floor, its lid beside it",
            O2: "closed supply crates resting on the cellar floor or a low shelf",
            O3: "a small group of urban resistance fighters on the upper floor, turning toward the right doorway",
            O4: "part of a small period truck parked along the alley, seen through the doorway",
            O5: "the doorway leading out to the alley on the right",
            H1: "a blank Tet calendar hanging on the near-left wall",
        },
        clean: [
            "the group of urban resistance fighters standing on the upper floor",
        ],
        bare: [
            "the supply crates and the low shelf in the cellar",
            "the truck seen through the doorway — paint the empty alley",
            "the calendar on the left wall",
        ],
    },
    S08: {
        items: {
            O1: "the broken B-52 wreckage fragment partly embedded in water and mud on the far bank",
            O2: "a civilian air-raid shelter entrance whose steps descend into the earth",
            O3: "a period loudspeaker horn fixed on a wooden post, facing the neighborhood",
            O4: "an air-defense serviceman standing on the path, turned toward the volunteers",
            O5: "civil-defense volunteers gathered at a low message desk on the dry bank",
            H1: "a ledger lying on a near table corner",
        },
        clean: [
            "the air-defense serviceman standing on the path",
            "the civil-defense volunteers together with their desk and chairs",
        ],
        bare: [
            "the aircraft wreckage — paint calm pond water and the far bank",
            "the loudspeaker together with its post",
            "the ledger and the small table it lies on",
            "the shelter entrance with its steps — paint continuous ground",
        ],
    },
    S09: {
        items: {
            O1: "a modest agreement folder lying on the near table, lower-left",
            O2: "Nguyen Thi Binh seated, body facing inward to the papers, face in three-quarter view looking down",
            O3: "small folded blank nameplates along the middle table edge",
            O4: "one fountain pen resting on a folder, lower-right",
            O5: "press cameras on tripods and microphones on stands in the far-right press area",
            H1: "a negotiation file on a small side table near the camera",
        },
        clean: [
            "Nguyen Thi Binh seated at the table (her chair stays)",
        ],
        bare: [
            "the agreement folder on the near table at lower-left",
            "the small nameplates on the table",
            "the fountain pen and the folder under it at lower-right",
            "the press cameras, microphones and their tripods and stands",
            "the negotiation file on the small side table (keep the side table)",
        ],
    },
    S10: {
        items: {
            O1: "tank 390 stopped in the courtyard, rear-left three-quarter view: rear engine deck nearest the camera at lower-left, front hull and cannon pointing away toward the palace at upper-right",
            O2: "the broken main gate: fallen gate leaves and the gateposts at the foreground sides",
            O3: "the Liberation Front flag, red above blue with a yellow star, on a pole attached to the palace roof",
            O4: "the palace main entrance hall with its steps",
            O5: "a small radio on a duty table at the far-right verge outside the vehicle lane",
            H1: "tank 843 in the left side-gate area, also facing inward, partly hidden by a gatepost",
        },
        clean: [
            "the flag and its pole on the palace roof",
        ],
        bare: [
            "tank 390 — paint the empty courtyard pavement and lawn",
            "tank 843 in the left side-gate area",
            "the small radio and its duty table",
            "the fallen gate leaves lying on the ground (keep the gateposts)",
        ],
    },
};

const pct = (b) => `${b[0]}, ${b[1]}, ${b[2]}, ${b[3]}`;
const list = (a) => a.map((s, i) => `${i + 1}. ${s}`).join("\n");

const out = {};
for (const sc of BRIEF.scenes) {
    const d = SCENES[sc.sceneId];
    if (!d) throw new Error(`thiếu bảng vật cho ${sc.sceneId}`);
    const items = sc.objects.map((o) => {
        const key = o.id.split("_")[1];
        if (!d.items[key]) throw new Error(`thiếu tên ${o.id}`);
        return `- ${d.items[key]} — box ${pct(o.visualBoxPercent)}`;
    });
    const master = [
        "Generate a brand-new 16:9 image.",
        STYLE,
        "SCENE BRIEF: " + sc.promptMaster,
        ...(d.notes ? ["SPRITE NOTES: " + d.notes] : []),
        LAYOUT,
        ...items,
    ].join("\n");
    const clean =
        "Edit the image you just generated: remove ONLY these items and paint the background that would naturally be " +
        "behind them, continuing the same ground, walls and light:\n" + list(d.clean) +
        "\nKeep every other pixel, the framing, camera, perspective, colors and lighting exactly the same. Same 16:9 size. No text.";
    const bare =
        "Edit the image you just generated (the latest one, without those people/flag): now also remove ONLY these items " +
        "and paint the background that would naturally be behind them:\n" + list(d.bare) +
        "\nKeep every other pixel, the framing, camera, perspective, colors and lighting exactly the same. Same 16:9 size. No text.";
    out[sc.sceneId.toLowerCase()] = { master, clean, bare };
}

fs.writeFileSync("art/prompts/prompts.json", JSON.stringify(out, null, 1) + "\n");
console.log("→ art/prompts/prompts.json", Object.keys(out).join(" "));
