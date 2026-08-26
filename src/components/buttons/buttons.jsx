import { Button, IconButton } from 'react-native-paper';
import { Fonts } from '../typography/font_map';


// Button Size
function getBttnSize( this_size = "s" ){

    const bttn_sizes = {
        xs: { sq_rad: 4,  mg_vert: 5, label_size: 12, icon_size: 14 },
        s:  { sq_rad: 6, mg_vert: 8, label_size: 14, icon_size: 20 },
        m:  { sq_rad: 10, mg_vert: 12, label_size: 16, icon_size: 28 },
        l:  { sq_rad: 14, mg_vert: 12, label_size: 18, icon_size: 32 },
        xl: { sq_rad: 16, mg_vert: 12, label_size: 22, icon_size: 36 },
    };


    return bttn_sizes[this_size] ?? bttn_sizes["s"];
}



// Mode Verifier
function modeMap( this_mode ){

    const modes = {
        text: "text",
        outlined: "outlined",
        contained: "contained",
        containedtonal: "contained-tonal",
        elevated: "elevated",
    }

    const key = this_mode.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();


    return modes[key] ?? "elevated";
}



// Font Family
function getFontFamily(fontWeight, fontFamily){
    const familyMap = {
        'Archivo':    () => Fonts.archivo.regular,
        'Barlow':     () => Fonts.barlow[`w${fontWeight}`]     ?? Fonts.barlow.w400,
        'GoogleSans': () => Fonts.googleSans[`w${fontWeight}`] ?? Fonts.googleSans.w400,
    };

    return familyMap[fontFamily]?.() ?? Fonts.barlow.w400;
}



// Icon Spacing Match
function labelMargins(this_icon, switch_pos) {

  if (this_icon === undefined) { return { mg_left: undefined, mg_right: undefined }; }

  const margin_table = {
    true:  { mg_left: undefined, mg_right: 24 },
    false: { mg_left: 24, mg_right: undefined },
  };

  return margin_table[switch_pos];
}



// Button Component
export function Bttn ({ mode, icon, onPress, square, size, children, switch_pos }) {

    const bttn_sizes = getBttnSize( size );
    const modes = modeMap( mode );
    const FF_and_FW = getFontFamily( 600, "GoogleSans" );
    const label_MGs = labelMargins( icon, switch_pos )

    return (

    <Button
        mode={ modes }
        icon={ icon ?? undefined }
        onPress={ onPress || (() => {}) }

        labelStyle={{
            fontSize: bttn_sizes["label_size"],
            fontFamily: FF_and_FW,
            lineHeight: (size === "l" || size === "xl")
                        ? bttn_sizes["label_size"] + 5
                        : undefined,
            letterSpacing: 0,
            marginVertical: 0,
            marginHorizontal: icon ? 16 : 0,
            marginLeft: label_MGs["mg_left"],
            marginRight: label_MGs["mg_right"],
        }}

        contentStyle={{
            marginHorizontal: icon ? bttn_sizes["mg_horiz"] : 16,
            marginVertical: bttn_sizes["mg_vert"],
            flexDirection: switch_pos === true ? "row-reverse" : "row",
            flexShrink: 0,
        }}

        style={{
            borderRadius: square ? bttn_sizes["sq_rad"] : 99,
        }}
    >

    { children }

    </Button>

    );
}



export function IconBttn ({ mode, icon, onPress, iconSize, selected=true }) {
    const bttn_sizes = getBttnSize( iconSize );
    const modes = modeMap( mode );

    return (
        <IconButton
            mode={ modes }
            icon={ icon ?? undefined }
            size={ bttn_sizes["icon_size"] }
            onPress={ onPress || (() => {}) }
            selected={ selected }
        />
    );
}
