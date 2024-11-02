import { resolve } from "path";
import { defineConfig } from "vite";

const root = resolve(__dirname, "src");
const outDir = resolve(__dirname, "dist");

export default defineConfig({
	root,
	build: {
		outDir,
		rollupOptions: {
			input: {
				multistream: resolve(root, "multistream", "index.html"),
				legacystream: resolve(root, "legacystream", "index.html"),
			},
		},
	},
});
