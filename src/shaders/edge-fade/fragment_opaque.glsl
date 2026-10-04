float fadeAmount = smoothstep(uFadeStart, uFadeEnd, distance(vFadeWorld.xz, uFadeCenter));
fadeAmount *= step(vFadeWorld.y, uFadeMaxY);
gl_FragColor.a *= 1.0 - fadeAmount;
