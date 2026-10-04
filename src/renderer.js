import { Color, Scene, WebGLRenderer } from 'three';

export const canvas = document.getElementById('scene');

export const renderer = new WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

export const scene = new Scene();
scene.background = new Color(0x0b0d12);
