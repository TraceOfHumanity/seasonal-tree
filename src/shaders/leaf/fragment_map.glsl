vec3 leafHsv = rgb2hsv(diffuseColor.rgb);
float hueDiff = fract(uLeafHue - leafHsv.x + 0.5) - 0.5;
leafHsv.x = fract(leafHsv.x + hueDiff * uLeafBlend);
leafHsv.y = clamp(leafHsv.y * uLeafSaturation, 0.0, 1.0);
leafHsv.z *= uLeafValue;
diffuseColor.rgb = hsv2rgb(leafHsv);
