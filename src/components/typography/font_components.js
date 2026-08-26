import { Text } from 'react-native-paper';
import { Fonts } from './font_map';


const BaseText = ({ variant, family = Fonts.barlow.w400, children }) => (
    <Text variant={variant} style={{ fontFamily: family }}>
        {children}
    </Text>
);



export function DspLG({ children, family }) {
    return <BaseText variant="displayLarge" family={family}>{children}</BaseText>;
}
