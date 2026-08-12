const NAMES =
  `kDeepSea kGreyScale kDarkBodyRadiator kBlueYellow kRainBow kInvertedDarkBodyRadiator kBird kCubehelix kGreenRedViolet kBlueRedYellow kOcean kColorPrintableOnGrey kAlpine kAquamarine kArmy kAtlantic kAurora kAvocado kBeach kBlackBody kBlueGreenYellow kBrownCyan kCMYK kCandy kCherry kCoffee kDarkRainBow kDarkTerrain kFall kFruitPunch kFuchsia kGreyYellow kGreenBrownTerrain kGreenPink kIsland kLake kLightTemperature kLightTerrain kMint kNeon kPastel kPearl kPigeon kPlum kRedBlue kRose kRust kSandyTerrain kSienna kSolar kSouthWest kStarryNight kSunset kTemperatureMap kThermometer kValentine kVisibleSpectrum kWaterMelon kCool kCopper kGistEarth kViridis kCividis`.split(
    ' '
  );

// Exact nine-color tables used by ROOT 6.36's built-in palettes (51–113).
const COLORS = [
  `00001c 09002a 0d003b 11024e 182562 204a81 1b719a 19a0b8 1ddddd`,
  `000000 202020 404040 606060 808080 a0a0a0 c0c0c0 e0e0e0 ffffff`,
  `000000 2d0001 630001 9c2d03 d46509 e6a808 edee0b eaee5f f2f3e6`,
  `000061 161064 2c2963 444363 5d5d5d 7c7d44 a0a22c c0c21a edf14a`,
  `000063 05308e 0f7cc6 23c0c9 66ce5a c4e216 d0610d c71008 6e0002`,
  `f2f3e6 eaee5f edee0b e6a808 d46509 9c2d03 630001 2d0001 000000`,
  `352a87 0f5cdd 1481d6 06a4ca 2eb7a4 87bf77 d1bb59 fec832 f9fb0e`,
  `000000 181d44 025c50 368122 b07539 ec78ac cab0fc c2ecf5 ffffff`,
  `0d5f04 174303 192502 3f1506 4c000b 680c16 892331 a13462 ce4fd0`,
  `000000 3d008c 5900e0 7a0090 8f0e04 a02505 b94806 cc8409 e7eb0d`,
  `0e6902 073815 021a23 00013c 052a5c 0b4a71 3783a0 83abb9 e5e5e5`,
  `000000 000066 0000e4 4600e7 9400b1 e7457c eb4389 edd814 f4f4f4`,
  `324261 38515b 3f5b4b 446041 5d6f4d 798067 a59b8f c0bda7 f1f1d9`,
  `919ebe a6b2c7 a7b3c9 9cb5c0 83a3b0 729aa9 6590a0 7098a6 849fbe`,
  `5d7e67 5b7c5e 638057 6c8155 828350 7d7955 84776b 9b9978 aead92`,
  `181d1d 283434 455e60 5a7f84 6896a2 72a2b5 789fb8 8497ba 676583`,
  `2e2e2e 262450 3d284a 5c4546 716e51 798769 8483a5 965cd3 bf22e1`,
  `000000 042809 0c560e 1e7912 348c15 65ac17 8ebb1b bed523 edf065`,
  `c66731 ce8536 ce9637 d3ac42 c6b25b b5ae82 a1a3b8 abafe0 f4f4f4`,
  `f30006 f32e08 f06324 f0955b f1c2a9 efdceb bab7f6 97a6f0 8193e9`,
  `16004d 132060 13456e 196c74 23876e 359f64 58b75a 8bc64e d2d746`,
  `442510 745237 a58769 b6b293 bdccc4 b4e1e2 91dde8 6fcae0 4793b2`,
  `3d95d6 638ccb 8860a8 b55387 d5846e e1b264 c6be6f 888771 181616`,
  `4c2240 782345 9c2a4e b74569 c5668e b489b1 a2a4cd 9abcd9 8cc5c6`,
  `252525 661d20 9d1921 bc252d c44342 d65b62 df8489 ebb9bb fbfbfb`,
  `4f3f33 644f3b 775d42 89673d 99733e ac8746 c0a76e cdc4a0 fafafa`,
  `2b3f79 2c3f65 32553a 42652c 7d8a2f aca337 b27a39 9b332c 9d272b`,
  `00005f 29395b 3e515b 4f5d52 5a553c 57462b 63472c 8c7d70 e4e4e4`,
  `314e4e 3b4837 48422e 583928 723b27 8d4b27 b06a28 cd8e29 dead2f`,
  `f35e07 de6c09 c9840c b98713 a57d2d 9e6059 a64476 bb3392 db3d76`,
  `131313 2c1c2a 4a2844 693760 895281 a66e9d c29fbc ceb5cb dcdcdc`,
  `212637 2c3243 464c61 63697c 8c8c8c a5a5a6 c7bfa3 d3bd81 d8a734`,
  `000000 212b2b 495c44 7c7c4c 888649 987e40 9f7948 ab9072 dfdfdf`,
  `053006 12860f 2dcf29 7ce679 c1c1c1 df71e2 cd1cd0 800082 310731`,
  `b44829 6a7e78 689a9e 87b8bc a4c6c2 bccfb5 bdcd91 a5be64 90b33e`,
  `390074 482189 5e44ad 756dc9 888cc8 9aabc9 aec0cb c0c4be d7d1bb`,
  `1f28ea 4775d6 7babe4 a0d3de d2e7d2 dedca0 d6be69 c7843c b74122`,
  `7bb8d0 6c8a82 6d826d 7e8563 9a9a6e acaf7a bcbc96 c4c4ab dadada`,
  `69fc92 6ac585 7ac290 8fbb9b 9faea3 aca2a7 b099a6 b588a2 cf7dae`,
  `abec3b 8d8f30 91642e 983f2c 9a352a 9f3736 a32c52 9e1f70 b106b3`,
  `b45dec be7dda d193a0 dfac85 ccb572 e4e084 cde9a2 98c6dc 5b9eda`,
  `e1cdba b7b1a5 a2a69b 878787 737c7e 6f7582 777596 9184b2 d3ace2`,
  `272727 2b2b32 3b3b3b 3f4a46 505b55 747273 998b97 b1a5b0 dfdfdf`,
  `000000 260a0b 3c0f16 4c1728 54233f 593956 655361 807b5e ccc755`,
  `5e1b2a 702e34 8d5851 a5876a a7a68b 8ca19e 5b879b 316189 1b3a74`,
  `1e3f12 313c1c 4f4829 755a38 875e3e 975e3f 924432 8a2e24 931015`,
  `000027 1e0e1a 3f1c15 652a12 8f3a0f 983d0e a9430e bb4a0d e65b0d`,
  `953e28 8c4626 a46b2d b38831 b69031 b58a31 837526 575720 3d4a22`,
  `63270f 702810 943912 a54f21 b36833 b67f4f b79467 b7a181 d0c6b1`,
  `630005 740006 9a0807 ae2009 c83a09 c4530e c97711 c98813 e6ad18`,
  `523e27 6a2c19 7e451f 8d6b3c 9b8749 a39844 8e9531 6b8448 4277bc`,
  `121b27 1d2e37 2c4750 48696c 749282 9eb185 b8bd7c d0be64 ddb74c`,
  `000000 300d44 771e4b ad2f2b d44f10 e07f16 e4a737 e4cd80 f5f5f5`,
  `2230ea 465bd4 8193d8 bbc2e0 e1e2ce e2e56e d8c435 c16e28 b30c1d`,
  `1e00bf 3741ca 678ad4 93b6d0 aebbab cbaf8c bc7961 973539 69091e`,
  `701026 611123 71182e 7d253b 8a384e 9f5167 b26e82 bc8898 e1bdc9`,
  `120033 4800cb 052bb1 17a71a 1dd30a c97509 c80008 620003 1d0000`,
  `131313 2a3720 40592f 587d46 769a64 93a980 afa191 bb8182 cd464b`,
  `21ffff 1fafcd 2a91ca 446acb 5658d0 6f37cd 8d0fcb ac00ce e300e7`,
  `000000 19100c 321e15 4f2e1d 6e3f27 915231 b5653d c97c4a feb367`,
  `000000 0d245e 1e5464 2c7552 488d38 789942 9c974c c89e83 f7f7f7`,
  `1a091e 331860 2b3770 215772 1c7670 239665 4ab448 90c823 f6de00`,
  `00204d 05366e 414d6b 61646f 7c7b78 9c9477 bdaf6f e0cb5e ffea46`
].map((row) => row.split(' ').map((color) => `#${color}`));

export const ROOT_PALETTES = Object.freeze(
  Object.fromEntries(
    NAMES.map((name, index) => [
      51 + index,
      Object.freeze({ id: 51 + index, name, colors: Object.freeze(COLORS[index]) })
    ])
  )
);

const normalize = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/^k/, '');
const byName = new Map(NAMES.map((name, index) => [normalize(name), 51 + index]));
const legacy = {
  viridis: 112,
  grayscale: 52,
  grey: 52,
  plasma: ['#280096', '#8500a8', '#d52f72', '#f58d3d', '#f0f921'],
  correlation: ['#0000ff', '#ffffff', '#ff0000']
};

const parseList = (value) =>
  Array.isArray(value)
    ? value
    : String(value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
const toHex = (value) => {
  const text = String(value).trim();
  if (/^#[0-9a-f]{6}$/i.test(text)) return text.toLowerCase();
  throw new Error(`Invalid palette color: ${text}`);
};
const rgbHex = (red, green, blue) =>
  `#${[red, green, blue]
    .map((channel) =>
      Math.round(Math.max(0, Math.min(1, Number(channel))) * 255)
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`;

export function resolvePalette(value, custom = {}) {
  const numeric = Number(value);
  const normalized = normalize(value);
  const id = Number.isInteger(numeric) && ROOT_PALETTES[numeric] ? numeric : byName.get(normalized);
  if (id) return makeStops(ROOT_PALETTES[id].colors, [], ROOT_PALETTES[id]);
  const alias = legacy[normalized];
  if (typeof alias === 'number')
    return makeStops(ROOT_PALETTES[alias].colors, [], ROOT_PALETTES[alias]);
  if (Array.isArray(alias)) return makeStops(alias, [], { name: normalized });
  const offsets = parseList(custom.stops).map(Number);
  const alpha = parseList(custom.alpha).map(Number);
  let colors = parseList(custom.colors);
  if (!colors.length) {
    const red = parseList(custom.red),
      green = parseList(custom.green),
      blue = parseList(custom.blue);
    if (red.length && red.length === green.length && red.length === blue.length)
      colors = red.map((entry, index) => rgbHex(entry, green[index], blue[index]));
  }
  if (colors.length >= 2) return makeStops(colors.map(toHex), offsets, { name: 'custom' }, alpha);
  return makeStops(ROOT_PALETTES[112].colors, [], ROOT_PALETTES[112]);
}

function makeStops(colors, offsets, metadata, alpha = []) {
  const usableOffsets =
    offsets.length === colors.length && offsets.every(Number.isFinite)
      ? offsets
      : colors.map((_, index) => index / (colors.length - 1));
  if (
    usableOffsets.some(
      (offset, index) => offset < 0 || offset > 1 || (index && offset < usableOffsets[index - 1])
    )
  )
    throw new Error('Palette stops must be ordered values from 0 to 1.');
  return {
    ...metadata,
    stops: colors.map((color, index) => ({
      offset: usableOffsets[index],
      color,
      alpha:
        alpha.length === colors.length && Number.isFinite(alpha[index])
          ? Math.max(0, Math.min(1, alpha[index]))
          : 1
    }))
  };
}

export function samplePalette(palette, position) {
  const stops = palette.stops;
  const t = Math.max(0, Math.min(1, Number(position) || 0));
  let upper = stops.findIndex((stop) => stop.offset >= t);
  if (upper <= 0) return colorWithAlpha(stops[0].color, stops[0].alpha);
  if (upper < 0) return colorWithAlpha(stops.at(-1).color, stops.at(-1).alpha);
  const lower = stops[upper - 1],
    next = stops[upper];
  const ratio = (t - lower.offset) / Math.max(Number.EPSILON, next.offset - lower.offset);
  const channels = [1, 3, 5].map((start) =>
    Math.round(
      parseInt(lower.color.slice(start, start + 2), 16) +
        (parseInt(next.color.slice(start, start + 2), 16) -
          parseInt(lower.color.slice(start, start + 2), 16)) *
          ratio
    )
  );
  const color = `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
  return colorWithAlpha(color, lower.alpha + (next.alpha - lower.alpha) * ratio);
}

function colorWithAlpha(color, alpha) {
  if (alpha >= 1) return color;
  const channels = [1, 3, 5].map((start) => parseInt(color.slice(start, start + 2), 16));
  return `rgba(${channels.join(',')},${Number(alpha.toFixed(4))})`;
}

export function paletteGradientStops(palette) {
  return palette.stops
    .map(
      ({ offset, color, alpha }) =>
        `<stop offset="${offset}" stop-color="${color}" stop-opacity="${alpha}"/>`
    )
    .join('');
}
