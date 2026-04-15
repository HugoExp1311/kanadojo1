/**
 * Local font shim — replaces next/font/google with self-hosted CSS classes.
 * 
 * All fonts are loaded via public/fonts/all-fonts.css (imported in globals.css).
 * This module exposes the same interface as next/font/google objects:
 *   { className, variable, style }
 * 
 * Generated utility classes follow the pattern: .font-{safe-name}
 */

type LocalFont = {
    className: string;
    variable: string;
    style: { fontFamily: string };
};

function makeFont(fontFamily: string, safeName: string): LocalFont {
    return {
        className: `font-${safeName}`,
        variable: `--font-${safeName}`,
        style: { fontFamily: `'${fontFamily}', system-ui, sans-serif` },
    };
}

// ── All 35 Japanese font families ──────────────────────────────────────────
export const Noto_Sans_JP = makeFont('Noto Sans JP', 'noto-sans-jp');
export const Zen_Maru_Gothic = makeFont('Zen Maru Gothic', 'zen-maru-gothic');
export const Rampart_One = makeFont('Rampart One', 'rampart-one');
export const Zen_Kurenaido = makeFont('Zen Kurenaido', 'zen-kurenaido');
export const Klee_One = makeFont('Klee One', 'klee-one');
export const DotGothic16 = makeFont('DotGothic16', 'dotgothic16');
export const Kiwi_Maru = makeFont('Kiwi Maru', 'kiwi-maru');
export const Potta_One = makeFont('Potta One', 'potta-one');
export const Hachi_Maru_Pop = makeFont('Hachi Maru Pop', 'hachi-maru-pop');
export const Yuji_Mai = makeFont('Yuji Mai', 'yuji-mai');
export const RocknRoll_One = makeFont('RocknRoll One', 'rocknroll-one');
export const Reggae_One = makeFont('Reggae One', 'reggae-one');
export const Stick = makeFont('Stick', 'stick');
export const M_PLUS_Rounded_1c = makeFont('M PLUS Rounded 1c', 'm-plus-rounded-1c');
export const M_PLUS_1 = makeFont('M PLUS 1', 'm-plus-1');
export const Yusei_Magic = makeFont('Yusei Magic', 'yusei-magic');
export const Dela_Gothic_One = makeFont('Dela Gothic One', 'dela-gothic-one');
export const New_Tegomin = makeFont('New Tegomin', 'new-tegomin');
export const Kosugi_Maru = makeFont('Kosugi Maru', 'kosugi-maru');
export const Hina_Mincho = makeFont('Hina Mincho', 'hina-mincho');
export const Shippori_Mincho = makeFont('Shippori Mincho', 'shippori-mincho');
export const Kaisei_Decol = makeFont('Kaisei Decol', 'kaisei-decol');
export const Mochiy_Pop_One = makeFont('Mochiy Pop One', 'mochiy-pop-one');
export const Yuji_Boku = makeFont('Yuji Boku', 'yuji-boku');
export const Kaisei_HarunoUmi = makeFont('Kaisei HarunoUmi', 'kaisei-harunoumi');
export const Sawarabi_Gothic = makeFont('Sawarabi Gothic', 'sawarabi-gothic');
export const Zen_Old_Mincho = makeFont('Zen Old Mincho', 'zen-old-mincho');
export const Sawarabi_Mincho = makeFont('Sawarabi Mincho', 'sawarabi-mincho');
export const Zen_Antique = makeFont('Zen Antique', 'zen-antique');
export const Kaisei_Tokumin = makeFont('Kaisei Tokumin', 'kaisei-tokumin');
export const Yuji_Syuku = makeFont('Yuji Syuku', 'yuji-syuku');
export const Murecho = makeFont('Murecho', 'murecho');
export const Kaisei_Opti = makeFont('Kaisei Opti', 'kaisei-opti');
export const BIZ_UDMincho = makeFont('BIZ UDMincho', 'biz-udmincho');
export const Shippori_Antique = makeFont('Shippori Antique', 'shippori-antique');
