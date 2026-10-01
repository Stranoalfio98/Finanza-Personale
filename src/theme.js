// theme.js
// Stessi token di design validati nell'anteprima: libretto di risparmio
// postale, oro/ocra invece del solito terracotta, monospace per i numeri.

export const PALETTE = {
  light: {
    bg: "#F2EEE3",
    surface: "#FBF9F2",
    surfaceRaised: "#FFFFFF",
    ink: "#1C2A3A",
    inkSoft: "#5C6675",
    line: "#DAD3BE",
    lineStrong: "#C2B896",
    gold: "#A97A22",
  },
  dark: {
    bg: "#131A24",
    surface: "#1A2330",
    surfaceRaised: "#212C3B",
    ink: "#ECE7D9",
    inkSoft: "#9BA4B4",
    line: "#2C3646",
    lineStrong: "#3A4557",
    gold: "#D9A94A",
  },
};

// Colori delle macrocategorie: verificati perché si distinguano anche
// con le forme più comuni di daltonismo, sia su sfondo chiaro che scuro.
export const MACRO = {
  Risparmio: { emoji: "🟢", light: "#23805A", dark: "#3FA673" },
  Bisogno: { emoji: "🟣", light: "#6B4C8A", dark: "#9873C9" },
  Desiderio: { emoji: "🔴", light: "#B0433A", dark: "#D96A52" },
  Entrate: { emoji: "⚪", light: "#2F6A9E", dark: "#5A95CF" },
};

export const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');
`;

export function inputStyle(c, hasError) {
  return {
    width: "100%",
    marginTop: 4,
    padding: "8px 10px",
    borderRadius: 8,
    border: `1px solid ${hasError ? "#A6403A" : c.line}`,
    background: c.surfaceRaised,
    color: c.ink,
    fontSize: 13,
  };
}
