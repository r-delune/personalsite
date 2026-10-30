// Registers /lab while running `astro dev` only. Production builds never see
// the route, its scripts or its styles.
export function stageLab() {
  return {
    name: "personal-site-stage-lab",
    hooks: {
      "astro:config:setup": ({ command, injectRoute }) => {
        if (command !== "dev") return;
        injectRoute({ pattern: "/lab", entrypoint: "./src/lab/lab.astro" });
      },
    },
  };
}
