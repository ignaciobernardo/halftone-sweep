import { defineToolcraft } from "@/toolcraft/runtime";

export const appSchema = defineToolcraft({
  canvas: {
    enabled: true,
    renderScale: true,
    sizing: { mode: "editable-output" },
    upload: false,
  },
  panels: {
    controls: {
      sections: [
        {
          controls: {
            mode: {
              defaultValue: "wave",
              description:
                "Chooses the sweep math that toggles squares between filled (on) and hollow (off).",
              label: "Pattern",
              options: [
                { label: "Wave", value: "wave" },
                { label: "Curtain", value: "curtain" },
                { label: "Fan", value: "fan" },
                { label: "Fan 3", value: "fan3" },
                { label: "Radial Pulse", value: "radial" },
                { label: "Random", value: "random" },
              ],
              performanceReason:
                "Switching pattern math swaps which per-cell formula runs but does not change the number of squares drawn.",
              performanceRole: "responsiveness",
              target: "pattern.mode",
              type: "select",
            },
            direction: {
              defaultValue: "horizontal",
              label: "Direction",
              options: [
                { label: "Horiz.", value: "horizontal" },
                { label: "Vert.", value: "vertical" },
              ],
              performanceReason:
                "Direction only changes which axis the curtain wipe reads; it does not add draw work.",
              performanceRole: "responsiveness",
              target: "pattern.direction",
              type: "segmented",
              visibleWhen: { equals: "curtain", target: "pattern.mode" },
            },
            reverse: {
              defaultValue: false,
              label: "Reverse",
              performanceReason:
                "Reverse flips the curtain travel direction without adding draw work.",
              performanceRole: "responsiveness",
              target: "pattern.reverse",
              type: "switch",
              visibleWhen: { equals: "curtain", target: "pattern.mode" },
            },
            speed: {
              defaultValue: 2,
              label: "Speed",
              max: 6,
              min: 1,
              performanceReason:
                "Speed changes how many sweep cycles play per loop but keeps the same per-frame square count, so it stays a live responsiveness check rather than a workload check.",
              performanceRole: "responsiveness",
              step: 1,
              target: "pattern.speed",
              type: "slider",
            },
          },
          title: "Pattern",
        },
        {
          controls: {
            columns: {
              defaultValue: 22,
              label: "Columns",
              max: 40,
              min: 8,
              performanceReason:
                "Columns sets how many squares are generated across the silhouette; higher values multiply per-frame draw calls and are the primary render-cost control.",
              performanceRole: "workload",
              step: 1,
              target: "grid.columns",
              type: "slider",
            },
            gap: {
              defaultValue: 60,
              description:
                "Spacing between squares as a percentage of each grid cell, so higher values shrink the squares and open up the pattern.",
              label: "Gap",
              markerCount: 9,
              max: 80,
              min: 0,
              performanceReason:
                "Gap is read together with Columns while laying out the grid, so it shares the same layout render-cost pass and is tracked as workload.",
              performanceRole: "workload",
              step: 10,
              target: "grid.gap",
              type: "slider",
              unit: "%",
              variant: "discrete",
            },
            jitter: {
              defaultValue: 70,
              description:
                "Pushes each square off its grid position by a stable random offset, breaking the strict alignment for an organic scatter.",
              label: "Jitter",
              max: 100,
              min: 0,
              performanceReason:
                "Jitter recomputes every square's offset during the same grid layout pass as Columns and Gap, so it is tracked as workload.",
              performanceRole: "workload",
              step: 5,
              target: "grid.jitter",
              type: "slider",
              unit: "%",
            },
          },
          title: "Grid",
        },
        {
          controls: {
            onColor: {
              defaultValue: "#FFFFFF",
              label: "On Color",
              performanceReason:
                "Changing the fill color updates the same per-cell draw call without adding cells or passes.",
              performanceRole: "responsiveness",
              target: "style.onColor",
              type: "color",
            },
            offColor: {
              defaultValue: { hex: "#7C8591", opacity: 22 },
              label: "Off Color",
              performanceReason:
                "Changing the outline color/opacity updates the same per-cell draw call without adding cells or passes.",
              performanceRole: "responsiveness",
              target: "style.offColor",
              type: "colorOpacity",
            },
          },
          title: "Squares",
        },
        {
          controls: {
            includeBackground: {
              defaultValue: true,
              label: "Include",
              performanceReason:
                "Toggling background inclusion swaps a single fill call and does not add render passes.",
              performanceRole: "responsiveness",
              target: "export.includeBackground",
              type: "switch",
            },
            background: {
              defaultValue: "#000000",
              label: false,
              performanceReason:
                "Changing the background color updates the same single fill call.",
              performanceRole: "responsiveness",
              target: "scene.background",
              type: "color",
            },
          },
          layoutGroups: [
            {
              columns: 2,
              controls: ["includeBackground", "background"],
              layout: "inline",
            },
          ],
          title: "Background",
        },
        {
          controls: {
            imageFormat: {
              defaultValue: "png",
              label: "Format",
              options: [
                { label: "PNG", value: "png" },
                { label: "JPG", value: "jpg" },
              ],
              performanceReason:
                "Image format only changes the encoder used at export time and does not affect preview render cost.",
              performanceRole: "responsiveness",
              target: "export.image.format",
              type: "select",
            },
            imageResolution: {
              defaultValue: "4k",
              label: "Resolution",
              options: [
                { label: "2K", value: "2k" },
                { label: "4K", value: "4k" },
                { label: "8K", value: "8k" },
              ],
              performanceReason:
                "Resolution changes the pixel dimensions rasterized during PNG export, so higher tiers cost more export time.",
              performanceRole: "workload",
              target: "export.image.resolution",
              type: "select",
            },
          },
          layoutGroups: [
            {
              columns: 2,
              controls: ["imageFormat", "imageResolution"],
              layout: "inline",
            },
          ],
          title: "Image Export",
        },
        {
          controls: {
            videoFormat: {
              defaultValue: "mp4",
              label: "Format",
              options: [
                { label: "MP4", value: "mp4" },
                { label: "WebM", value: "webm" },
              ],
              performanceReason:
                "Video format only changes the encoder container used at export time and does not affect preview render cost.",
              performanceRole: "responsiveness",
              target: "export.video.format",
              type: "select",
            },
            videoResolution: {
              defaultValue: "current",
              label: "Resolution",
              options: [
                { label: "Current", value: "current" },
                { label: "4K", value: "4k" },
              ],
              performanceReason:
                "Resolution changes the pixel dimensions rendered per frame during video capture, so higher tiers cost more export time.",
              performanceRole: "workload",
              target: "export.video.resolution",
              type: "select",
            },
          },
          layoutGroups: [
            {
              columns: 2,
              controls: ["videoFormat", "videoResolution"],
              layout: "inline",
            },
          ],
          title: "Video Export",
        },
        {
          controls: {
            outputActions: {
              actions: [
                {
                  icon: "upload-simple",
                  label: "Export Video",
                  value: "export.video",
                },
                {
                  icon: "upload-simple",
                  label: "Export PNG",
                  value: "export.png",
                  variant: "outline",
                },
              ],
              target: "panel.actions",
              type: "panelActions",
            },
          },
          title: "Export",
        },
      ],
      title: "Controls",
    },
    timeline: {
      defaultDurationSeconds: 6,
      enabled: true,
      mode: "playback",
    },
  },
  toolbar: {
    history: true,
    radar: true,
    theme: true,
    zoom: true,
  },
});
