# Anakin lightsaber — editable model and animated viewer

A detailed, downloadable fan replica of Anakin's lightsaber, adapted for local editing and blade ignition/retraction. Absolute accuracy to the original film prop has not been independently verified.

## Open the viewer

Open `index.html` with VS Code Live Server. All Three.js runtime files, model geometry, materials, and textures are bundled locally; the viewer does not depend on a Sketchfab embed or an internet connection.

- Click the red switch on the hilt, the **Ignite blade / Retract blade** button, or press **Space**.
- The blade extends from the emitter in 0.35 seconds and retracts in 0.30 seconds. Clicking again during movement reverses it.
- Drag to orbit and scroll/pinch to zoom.
- **Inspect hilt** shows the details; **Full saber** frames the complete blade.
- The **Blade length** slider sets any intermediate extension.
- **Download model** saves the editable GLB with both animation clips.

## Files

- `public/anakin-episode3-animated.glb`: editable model, blue blade, separate pivot, and `Ignite` / `Retract` animation clips.
- `public/anakin-lightsaber-source.glb`: the original downloaded GLB, kept unchanged.
- `script.js`: local Three.js scene, lighting, bloom, raycast interaction, and reversible blade animation.
- `public/ANAKIN-ATTRIBUTION.txt`: source, author, license, and modifications.
- `public/vendor/three/`: Three.js 0.165.0 runtime files and MIT license.

The adapted model preserves 238,872 triangles, 23 meshes, and five embedded textures. Hilt geometry and texture data are preserved from the downloaded source.

## Edit in Blender

1. Use **File → Import → glTF 2.0** and select `anakin-episode3-animated.glb`.
2. Select `BladePivot`. In the Nonlinear Animation editor, solo the `Ignite` or `Retract` track and play or scrub the timeline. Edit its action in the Dope Sheet / Action Editor.
3. For manual extension, disable animation/NLA influence and change `BladePivot` **Scale Z** between 0 and 1. Blender converts the GLB's Y-up coordinates to Z-up on import.
4. Keep the animation actions/NLA tracks when exporting with animations enabled.

The whole model uses convenient viewer units: the hilt is 2.8 units high. Uniformly scale the root by 0.1 for an approximately 0.28 m hilt. Emission creates the bright blade surface; enable bloom/glare in your rendering setup for the surrounding glow.

## Edit the web animation

In `script.js`, change `IGNITION_MS` and `RETRACTION_MS` to adjust timing. `BladePivot.scale.y` controls extension in Three.js, with the pivot anchored at the emitter. The viewer interpolates it directly for reversible movement and slider input; it does not run the GLB clips at the same time.

## Attribution

[Anakin Lightsaber](https://sketchfab.com/3d-models/anakin-lightsaber-8d248183c9ae4a5e904862db0db83dc7) by Khafesus, licensed under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).

Adaptations: normalized orientation/scale, separate blade pivot, blue blade material, ignition and retraction clips, and the interactive web viewer. Retain the attribution when sharing the model or project. Three.js is MIT licensed; its license is included.
