export interface EditorFont {
  family: string;
  styles: EditorFontStyle[];
}

export interface EditorFontStyle {
  name: string;
  weight: string;
  style: string;
  url?: string;
}

export const defaultFont: EditorFont = {
  // family: "Inter",
  // styles: [
  //   { name: "Inter Regular", weight: "400", style: "normal" },
  //   { name: "Inter Bold 700", weight: "700", style: "normal" },
  // ],
  family: "Poppins",
  styles: [
    { name: "Poppins Regular", weight: "400", style: "normal" },
    { name: "Poppins Bold 700", weight: "700", style: "normal" },
  ],
};

export const fonts: EditorFont[] = [
  //fabric meets the issue with Inter font
  // {
  //   family: "Inter",
  //   styles: [
  //     { name: "Inter Regular", weight: "400", style: "normal" },
  //     { name: "Inter Bold 700", weight: "700", style: "normal" },
  //   ],
  // },
  {
    family: "Poppins",
    styles: [
      { name: "Poppins Regular", weight: "regular", style: "normal" },
      { name: "Poppins 700", weight: "700", style: "normal" },
    ],
  },
  {
    family: "Roboto",
    styles: [
      { name: "Roboto Regular", style: "normal", weight: "400" },
      { name: "Roboto Bold", style: "normal", weight: "700" },
    ],
  },
  {
    family: "Open Sans",
    styles: [
      { name: "Open Sans Regular", style: "normal", weight: "400" },
      { name: "Open Sans Bold", style: "normal", weight: "700" },
    ],
  },
  {
    family: "Lato",
    styles: [
      { name: "Lato Regular", style: "normal", weight: "400" },
      { name: "Lato Bold", style: "normal", weight: "700" },
    ],
  },
  {
    family: "Montserrat",
    styles: [
      { name: "Montserrat Regular", style: "normal", weight: "400" },
      { name: "Montserrat Bold", style: "normal", weight: "700" },
    ],
  },
  {
    family: "Oswald",
    styles: [
      { name: "Oswald Regular", style: "normal", weight: "400" },
      { name: "Oswald Bold", style: "normal", weight: "700" },
    ],
  },
  {
    family: "Slabo 27px",
    styles: [{ name: "Slabo 27px Regular", style: "normal", weight: "400" }],
  },
  {
    family: "Raleway",
    styles: [
      { name: "Raleway Regular", style: "normal", weight: "400" },
      { name: "Raleway Bold", style: "normal", weight: "700" },
    ],
  },
  {
    family: "Merriweather",
    styles: [
      { name: "Merriweather Regular", style: "normal", weight: "400" },
      { name: "Merriweather Bold", style: "normal", weight: "700" },
    ],
  },
  {
    family: "PT Sans",
    styles: [
      { name: "PT Sans Regular", style: "normal", weight: "400" },
      { name: "PT Sans Bold", style: "normal", weight: "700" },
    ],
  },
  {
    family: "Ubuntu",
    styles: [
      { name: "Ubuntu Regular", style: "normal", weight: "400" },
      { name: "Ubuntu Bold", style: "normal", weight: "700" },
    ],
  },
  {
    family: "Noto Sans",
    styles: [
      { name: "Noto Sans Regular", style: "normal", weight: "400" },
      { name: "Noto Sans Bold", style: "normal", weight: "700" },
    ],
  },
  {
    family: "Playfair Display",
    styles: [
      { name: "Playfair Display Regular", style: "normal", weight: "400" },
      { name: "Playfair Display Bold", style: "normal", weight: "700" },
    ],
  },
  {
    family: "Droid Sans",
    styles: [
      { name: "Droid Sans Regular", style: "normal", weight: "400" },
      { name: "Droid Sans Bold", style: "normal", weight: "700" },
    ],
  },
  {
    family: "Titillium Web",
    styles: [
      { name: "Titillium Web Regular", style: "normal", weight: "400" },
      { name: "Titillium Web Bold", style: "normal", weight: "700" },
    ],
  },
  {
    family: "Source Sans Pro",
    styles: [
      { name: "Source Sans Pro Regular", style: "normal", weight: "400" },
      { name: "Source Sans Pro Bold", style: "normal", weight: "700" },
    ],
  },
  {
    family: "Fira Sans",
    styles: [
      { name: "Fira Sans Regular", style: "normal", weight: "400" },
      { name: "Fira Sans Bold", style: "normal", weight: "700" },
    ],
  },
  {
    family: "Bitter",
    styles: [
      { name: "Bitter Regular", style: "normal", weight: "400" },
      { name: "Bitter Bold", style: "normal", weight: "700" },
    ],
  },
  {
    family: "Libre Baskerville",
    styles: [
      { name: "Libre Baskerville Regular", style: "normal", weight: "400" },
      { name: "Libre Baskerville Bold", style: "normal", weight: "700" },
    ],
  },
  {
    family: "Lora",
    styles: [
      { name: "Lora Regular", style: "normal", weight: "400" },
      { name: "Lora Bold", style: "normal", weight: "700" },
    ],
  },
  {
    family: "Arvo",
    styles: [
      { name: "Arvo Regular", style: "normal", weight: "400" },
      { name: "Arvo Bold", style: "normal", weight: "700" },
    ],
  },
  {
    family: "Cabin",
    styles: [
      { name: "Cabin Regular", style: "normal", weight: "400" },
      { name: "Cabin Bold", style: "normal", weight: "700" },
    ],
  },
  {
    family: "Muli",
    styles: [
      { name: "Muli Regular", style: "normal", weight: "400" },
      { name: "Muli Bold", style: "normal", weight: "700" },
    ],
  },
  {
    family: "Indie Flower",
    styles: [{ name: "Indie Flower Regular", style: "normal", weight: "400" }],
  },
  {
    family: "Varela Round",
    styles: [{ name: "Varela Round Regular", style: "normal", weight: "400" }],
  },
  {
    family: "Abril Fatface",
    styles: [{ name: "Abril Fatface Regular", style: "normal", weight: "400" }],
  },
];
