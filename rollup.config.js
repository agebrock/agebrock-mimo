import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default {
  input: 'src/index.js', // Replace with the path to your module's entry file
  output: {
    file: 'dist/browser/agebrock-mino.js', // Replace with the desired output file name
    format: 'iife', // Output format for the browser
    name: 'mimo' // Replace with your module's global variable name
  },
  plugins: [
    resolve(), // Helps Rollup resolve Node.js module dependencies
    commonjs() // Converts CommonJS modules to ES6, which is suitable for the browser
  ]
};
