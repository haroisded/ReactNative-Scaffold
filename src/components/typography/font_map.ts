/*
{ .ttf font Weight Format }:
- Thin ( 100 )
- ExtraLight ( 200 )
- Light ( 300 )
- Regular ( 400 )
- Medium ( 500 )
- SemiBold ( 600 )
- Bold ( 700 )
- ExtraBold ( 800 )
- Black ( 900 )
*/


// Font require() in React Native resolves to asset module ID (number)
type FontAsset = number;

// For Display Texts
const ArchivoBlack: Record<string, FontAsset> = {
    'ArchivoBlack-Regular': require('../../assets/fonts/ArchivoBlack-Regular.ttf'),
};


// For Regular Texts
const Barlow: Record<string, FontAsset> = {
    'Barlow-100': require('../../assets/fonts/Barlow_Main/Barlow-Thin.ttf'),
    'Barlow-200': require('../../assets/fonts/Barlow_Main/Barlow-ExtraLight.ttf'),
    'Barlow-300': require('../../assets/fonts/Barlow_Main/Barlow-Light.ttf'),
    'Barlow-400': require('../../assets/fonts/Barlow_Main/Barlow-Regular.ttf'),
    'Barlow-500': require('../../assets/fonts/Barlow_Main/Barlow-Medium.ttf'),
    'Barlow-600': require('../../assets/fonts/Barlow_Main/Barlow-SemiBold.ttf'),
    'Barlow-700': require('../../assets/fonts/Barlow_Main/Barlow-Bold.ttf'),
    'Barlow-800': require('../../assets/fonts/Barlow_Main/Barlow-ExtraBold.ttf'),
    'Barlow-900': require('../../assets/fonts/Barlow_Main/Barlow-Black.ttf'),
};


// For Mini Texts
const Google_Sans_Code: Record<string, FontAsset> = {
    'Google-Sans-300': require('../../assets/fonts/Google_Sans_Code_Main/GoogleSansCode-Light.ttf'),
    'Google-Sans-400': require('../../assets/fonts/Google_Sans_Code_Main/GoogleSansCode-Regular.ttf'),
    'Google-Sans-500': require('../../assets/fonts/Google_Sans_Code_Main/GoogleSansCode-Medium.ttf'),
    'Google-Sans-600': require('../../assets/fonts/Google_Sans_Code_Main/GoogleSansCode-SemiBold.ttf'),
    'Google-Sans-700': require('../../assets/fonts/Google_Sans_Code_Main/GoogleSansCode-Bold.ttf'),
    'Google-Sans-800': require('../../assets/fonts/Google_Sans_Code_Main/GoogleSansCode-ExtraBold.ttf'),
};


// Singular Export — `as const` locks literal string values
export const Fonts = {
    archivo: {
        regular: 'ArchivoBlack-Regular',
    },
    barlow: {
        w100: 'Barlow-100',
        w200: 'Barlow-200',
        w300: 'Barlow-300',
        w400: 'Barlow-400',
        w500: 'Barlow-500',
        w600: 'Barlow-600',
        w700: 'Barlow-700',
        w800: 'Barlow-800',
        w900: 'Barlow-900',
    },
    googleSans: {
        w300: 'Google-Sans-300',
        w400: 'Google-Sans-400',
        w500: 'Google-Sans-500',
        w600: 'Google-Sans-600',
        w700: 'Google-Sans-700',
        w800: 'Google-Sans-800',
    },
} as const;


// Derive union type of all valid font-family strings — autocomplete + typo catch
type FontFamily =
    | (typeof Fonts)['archivo'][keyof (typeof Fonts)['archivo']]
    | (typeof Fonts)['barlow'][keyof (typeof Fonts)['barlow']]
    | (typeof Fonts)['googleSans'][keyof (typeof Fonts)['googleSans']];


// Merges all font objects into one flat map
export const FontFiles: Record<string, FontAsset> = {
    ...ArchivoBlack,
    ...Barlow,
    ...Google_Sans_Code,
};


export type { FontFamily };
