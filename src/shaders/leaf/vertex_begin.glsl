float leafHash = fract(sin(float(gl_InstanceID) * 12.9898) * 43758.5453);
float leafGrow = smoothstep(0.0, 0.12, uLeafDensity * 1.12 - leafHash);
float shedT = clamp((uLeafShed - leafHash * 0.4) / 0.6, 0.0, 1.0);
transformed *= uLeafScale * leafGrow * (1.0 - smoothstep(0.8, 1.0, shedT));
