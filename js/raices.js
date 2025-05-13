const keyboardKeys = ['x', '+', '-', '*', '/', '^', '(', ')', '.', '√', 'sin(', 'cos(', 'tan(', 'log('];
const keyboardDiv = document.getElementById('keyboard');
const funcionInput = document.getElementById('funcion');

keyboardKeys.forEach(key => {
  const button = document.createElement('button');
  button.innerText = key;
  button.onclick = () => funcionInput.value += key;
  keyboardDiv.appendChild(button);
});

const elt = document.getElementById('calculator');
const calculator = Desmos.GraphingCalculator(elt);

function graficarYBuscar() {
  const expr = funcionInput.value;
  const xMin = parseFloat(document.getElementById('xMin').value);
  const xMax = parseFloat(document.getElementById('xMax').value);

  calculator.setExpression({ id: 'graph1', latex: `f(x)=${expr}` });

  buscarRaices(expr, xMin, xMax);
}

function buscarRaices(expr, xMin, xMax) {
  const resultados = document.getElementById('resultados');
  resultados.innerHTML = "";

  let f;
  try {
    f = math.evaluate(`f(x) = ${expr}`);
  } catch (e) {
    resultados.innerHTML = "<li>Error en la función</li>";
    return;
  }

  const paso = 0.1;
  let x = xMin;
  const raices = [];

  while (x < xMax) {
    const x1 = x;
    const x2 = x + paso;

    let y1 = f(x1);
    let y2 = f(x2);

    if (isNaN(y1) || isNaN(y2)) {
      x += paso;
      continue;
    }

    if (y1 * y2 < 0) {
      const raiz = biseccion(f, x1, x2, 1e-6, 100);
      if (!raices.some(r => Math.abs(r - raiz) < 1e-4)) {
        raices.push(raiz);
      }
    }

    x += paso;
  }

  if (raices.length === 0) {
    resultados.innerHTML = "<li>No se encontraron raíces en el intervalo.</li>";
  } else {
    raices.forEach(r => {
      const li = document.createElement('li');
      li.textContent = `x ≈ ${r.toFixed(6)}`;
      resultados.appendChild(li);
    });
  }
}

function biseccion(f, a, b, tol, maxIter) {
  let fa = f(a);
  let fb = f(b);

  if (fa * fb > 0) return NaN;

  let mid;
  for (let i = 0; i < maxIter; i++) {
    mid = (a + b) / 2;
    let fm = f(mid);

    if (Math.abs(fm) < tol) return mid;
    if (fa * fm < 0) {
      b = mid;
      fb = fm;
    } else {
      a = mid;
      fa = fm;
    }
  }

  return mid;
}
