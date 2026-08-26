import { Text } from "react-native";
import { useFontStyles } from "./font_styles";

const makeFontComponent = (styleKey) => {

    return ({ children, style, ...props }) => {
        const styles = useFontStyles();

        return <Text style={[styles[styleKey], style]} {...props}>{children}</Text>;
    };
};


// Components
export const H1   = makeFontComponent('h1');
export const H6   = makeFontComponent('h6');
export const Emph = makeFontComponent('emph');
