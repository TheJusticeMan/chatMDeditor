import { nodeResolve } from '@rollup/plugin-node-resolve';
import dynamicImportVars from '@rollup/plugin-dynamic-import-vars';
import terser from '@rollup/plugin-terser';

export default {
    input: './editor.mjs',
    output: [
        {
            dir: 'editor_files',  // Specify an output directory instead of a single file
            format: 'esm', // or 'cjs'
            entryFileNames: '[name].bundle.js', // Template for entry file names
        }
    ],
    plugins: [
        nodeResolve(),
        dynamicImportVars(),
        // Uncomment for minification
        // terser()
    ]
};
