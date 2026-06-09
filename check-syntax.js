const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const scriptMatch = html.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
if (scriptMatch) {
  const code = scriptMatch[1];
  try {
    const babel = require('@babel/standalone');
    babel.transform(code, { presets: ['react'] });
    console.log("No syntax errors!");
  } catch (e) {
    console.error("Syntax Error:", e.message);
  }
} else {
  console.log("No script found");
}
