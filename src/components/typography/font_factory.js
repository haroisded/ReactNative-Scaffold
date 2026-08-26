// Imports
import { useWindowDimensions } from 'react-native';


export function useFontFactory() {

  const { width } = useWindowDimensions();



  // Font Size ( Relative to screen width )
  function responsiveFonts( width ){
    if (width <= 600) return mb_fs; // mobile
    if (width <= 840) return tab_fs; // tablet
    if (width <= 1200) return desk_fs; // desktop

    return lg_desk_fs; // large desktop
  }


} //End of Function
