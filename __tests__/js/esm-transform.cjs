// ESM → CJS 변환 (export 키워드 제거)
module.exports = {
  process(src) {
    const code = src
      .replace(/export\s+function\s+/g, 'function ')
      .replace(/export\s+const\s+/g, 'const ')
      .replace(/export\s+{[^}]*};?/g, '')
      .replace(/import\s+{[^}]*}\s+from\s+['"][^'"]+['"];?/g, '');
    return { code };
  },
};
