const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const engine = html.match(/<script>\s*(\/\* ===== Moteur[\s\S]*?)<\/script>/)[1];
const examples = html.match(/\/\* ---------- exemples ---------- \*\/([\s\S]*?)\/\* ---------- géométrie ---------- \*\//)[1];
const context = vm.createContext({});
vm.runInContext(engine + '\nconst defaultSim = () => ({tf:"10", solver:"ode45", h:"0.01", rtol:"1e-4", atol:"1e-6", hmax:"auto"});\n' +
  examples + '\nglobalThis.api = { mk, EXAMPLES, createSim, compileExpr };', context);
const { mk, EXAMPLES, createSim, compileExpr } = context.api;

function run(model) {
  const sim = createSim(model);
  while (!sim.step(1000)) {}
  return sim.results();
}
function close(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
}

test('existing scalar examples still simulate', () => {
  for (const [name, example] of Object.entries(EXAMPLES)) {
    if (name !== 'Transformation de Park') assert.doesNotThrow(() => run(example()), name);
  }
});

test('Mux, dynamic Park, Demux and vector oscilloscope preserve component order', () => {
  const m = EXAMPLES['Transformation de Park']();
  m.blocks.push({ id: 'vec', type: 'scope', x: 0, y: 0, name: 'Vecteur', params: { n: '1' } });
  m.wires.push({ from: 'park', to: 'vec', port: 0 });
  const results = run(m), R = results.sc, V = results.vec;
  assert.equal(R.Y.length, 3);
  assert.equal(V.Y.length, 3);
  assert.deepEqual(Array.from(V.widths), [3]);
  for (const k of [0, Math.floor(R.T.length / 2), R.T.length - 1]) {
    close(R.Y[0][k], 0);
    close(R.Y[1][k], -1);
    close(R.Y[2][k], 0);
    for (let j = 0; j < 3; j++) close(V.Y[j][k], R.Y[j][k]);
  }
});

test('vector constants, workspace matrices, indexing and dynamic coefficients', () => {
  const m = mk([
    ['v', 'const', 0, 0, { v: 'v' }],
    ['clock', 'clock', 0, 0, {}],
    ['f', 'fcn', 0, 0, { n: '2', mode: 'vectoriel', expr: 'A*u1+[u2,u1[1]]' }],
    ['sc', 'scope', 0, 0, {}]
  ], ['v>f', 'clock>f:1', 'f>sc'], { tf: '1' }, 'v = [1 2]\nA = [1 2; 3 4]');
  const R = run(m).sc;
  close(R.Y[0][0], 5);
  close(R.Y[1][0], 12);
  close(R.Y[0].at(-1), 6);
  close(R.Y[1].at(-1), 12);
});

test('invalid dimensions, non-finite output and scalar-only consumers fail explicitly', () => {
  function model(expr, sink = 'scope') {
    return mk([['v', 'const', 0, 0, { v: '[1 2]' }], ['f', 'fcn', 0, 0, { mode: 'vectoriel', expr }], ['s', sink, 0, 0, {}]], ['v>f', 'f>s'], { tf: '1' });
  }
  assert.throws(() => run(model('[1,2,3;4,5,6]*u1')), /dimensions incompatibles/);
  assert.throws(() => run(model('u1[3]')), /indice de vecteur invalide/);
  assert.throws(() => run(model('1/0')), /signal invalide ou non fini/);
  assert.throws(() => run(model('sin(u1)')), /scalaire est attendu/);
  assert.throws(() => run(model('0 && u1')), /scalaire est attendu/);
  assert.throws(() => run(model('u1', 'display')), /attend un scalaire/);
  const d = mk([['v', 'const', 0, 0, { v: '[1 2]' }], ['d', 'demux', 0, 0, { n: '3' }]], ['v>d'], { tf: '1' });
  assert.throws(() => run(d), /longueur 3/);
});

test('vector expressions are evaluated at intermediate continuous solver stages', () => {
  const m = mk([
    ['clock', 'clock', 0, 0, {}],
    ['f', 'fcn', 0, 0, { mode: 'vectoriel', expr: '[u1,2*u1]' }],
    ['d', 'demux', 0, 0, { n: '2' }],
    ['i', 'int', 0, 0, {}],
    ['sc', 'scope', 0, 0, {}]
  ], ['clock>f', 'f>d', 'i>sc'], { tf: '1', solver: 'ode4', h: '0.1' });
  m.wires.push({ from: 'd', fromPort: 1, to: 'i', port: 0 });
  close(run(m).sc.Y[0].at(-1), 1);
});

test('scalar parser and vector arithmetic remain distinct', () => {
  close(compileExpr('sin(pi/2)+u^2')({ u: 3 }), 10);
  assert.throws(() => compileExpr('[1,2]'), /symbole inattendu/);
  assert.deepEqual(Array.from(compileExpr('[1,2]+[3,4]', true)({})), [4, 6]);
});
