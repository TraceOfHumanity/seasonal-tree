vec3 groundHsv = rgb2hsv(diffuseColor.rgb);
float groundHueDiff = fract(uGroundHue - groundHsv.x + 0.5) - 0.5;
groundHsv.x = fract(groundHsv.x + groundHueDiff * uGroundBlend);
groundHsv.y = clamp(groundHsv.y * uGroundSaturation, 0.0, 1.0);
groundHsv.z *= uGroundValue;
diffuseColor.rgb = hsv2rgb(groundHsv);
