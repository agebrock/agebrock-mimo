import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';

export default {
  input: 'src/index.js', // Replace with the path to your module's entry file
  output: {
    file: 'dist/commonjs/index.cjs', // Replace with the desired output file name
    format: 'cjs', // Generate CommonJS module
  },
  plugins: [
    resolve(), // Helps Rollup resolve Node.js module dependencies
    commonjs(), // Converts CommonJS modules to ES6, which is suitable for the browser
    babel({ babelHelpers: 'bundled' })
  ]
};
