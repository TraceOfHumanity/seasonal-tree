export function injectShader(source, chunks) {
  let result = source;

  for (const [name, code] of Object.entries(chunks)) {
    const token = `#include <${name}>`;
    result = result.replace(token, () => `${token}\n${code}`);
  }

  return result;
}
